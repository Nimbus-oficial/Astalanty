const assert = require("node:assert/strict");
const { ethers } = require("hardhat");

describe("Astalanty MVP complete flow", function () {
  const USDC_TO_AUSD_RATE = ethers.parseEther("1");
  const GAS_MARKUP_BPS = 500n;
  const MIN_AUSD_FEE = ethers.parseEther("0.01");
  const MAX_AUSD_FEE = ethers.parseEther("10");
  const MAX_COST_PER_OPERATION = 0n;

  async function deployMvp() {
    const [deployer, owner, guardian, treasury, otherPayer] = await ethers.getSigners();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const mockUsdc = await MockUSDC.deploy(deployer.address);
    await mockUsdc.waitForDeployment();

    const AUSDToken = await ethers.getContractFactory("AUSDToken");
    const ausd = await AUSDToken.deploy(deployer.address);
    await ausd.waitForDeployment();

    const FeeManager = await ethers.getContractFactory("AstalantyFeeManager");
    const feeManager = await FeeManager.deploy(
      deployer.address,
      await ausd.getAddress(),
      await mockUsdc.getAddress(),
      treasury.address,
      USDC_TO_AUSD_RATE,
      GAS_MARKUP_BPS,
      MIN_AUSD_FEE,
      MAX_AUSD_FEE
    );
    await feeManager.waitForDeployment();

    const Paymaster = await ethers.getContractFactory("AstalantyPaymaster");
    const paymaster = await Paymaster.deploy(
      deployer.address,
      deployer.address,
      await feeManager.getAddress(),
      await mockUsdc.getAddress(),
      treasury.address,
      MAX_COST_PER_OPERATION
    );
    await paymaster.waitForDeployment();

    const Factory = await ethers.getContractFactory("AstalantySmartAccountFactory");
    const factory = await Factory.deploy(deployer.address, deployer.address);
    await factory.waitForDeployment();

    await ausd.setMinter(await feeManager.getAddress(), true);
    await feeManager.setAuthorizedPaymaster(await paymaster.getAddress());

    return {
      deployer,
      owner,
      guardian,
      treasury,
      otherPayer,
      mockUsdc,
      ausd,
      feeManager,
      paymaster,
      factory
    };
  }

  async function createSmartAccount(factory, owner, guardian) {
    const tx = await factory.createAccount(owner.address, guardian.address);
    const receipt = await tx.wait();
    const event = receipt.logs
      .map((log) => {
        try {
          return factory.interface.parseLog(log);
        } catch {
          return undefined;
        }
      })
      .find((parsed) => parsed && parsed.name === "SmartAccountCreated");

    assert.ok(event, "SmartAccountCreated event should be emitted");
    const accountAddress = event.args.account;
    const smartAccount = await ethers.getContractAt("AstalantySmartAccount", accountAddress);

    return { smartAccount, accountAddress, receipt };
  }

  function computeOperationId(paymasterAddress, chainId, userOpHash, account, payer) {
    const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint256", "bytes32", "address", "address"],
      [paymasterAddress, chainId, userOpHash, account, payer]
    );
    return ethers.keccak256(encoded);
  }

  it("deploys all MVP contracts with the expected initial wiring", async function () {
    const { deployer, treasury, mockUsdc, ausd, feeManager, paymaster, factory } = await deployMvp();

    assert.equal(await mockUsdc.owner(), deployer.address);
    assert.equal(await mockUsdc.decimals(), 6n);
    assert.equal(await ausd.owner(), deployer.address);
    assert.equal(await ausd.decimals(), 18n);
    assert.equal(await feeManager.treasury(), treasury.address);
    assert.equal(await feeManager.authorizedPaymaster(), await paymaster.getAddress());
    assert.equal(await paymaster.feeManager(), await feeManager.getAddress());
    assert.equal(await paymaster.mockUsdc(), await mockUsdc.getAddress());
    assert.equal(await factory.entryPoint(), deployer.address);
  });

  it("creates one Smart Account per owner and blocks duplicates", async function () {
    const { owner, guardian, factory } = await deployMvp();

    const { smartAccount, accountAddress } = await createSmartAccount(factory, owner, guardian);

    assert.equal(await factory.accountOfOwner(owner.address), accountAddress);
    assert.equal(await factory.getAccount(owner.address), accountAddress);
    assert.equal(await factory.isAstalantyAccount(accountAddress), true);
    assert.equal(await factory.totalAccounts(), 1n);
    assert.equal(await smartAccount.owner(), owner.address);
    assert.equal(await smartAccount.recoveryGuardian(), guardian.address);

    await assert.rejects(
      factory.createAccount(owner.address, guardian.address),
      /AccountAlreadyExists/
    );
  });

  it("executes the complete Mock USDC -> Paymaster -> Fee Manager -> AUSD settlement flow", async function () {
    const {
      owner,
      guardian,
      treasury,
      mockUsdc,
      ausd,
      feeManager,
      paymaster,
      factory
    } = await deployMvp();

    const { smartAccount, accountAddress } = await createSmartAccount(factory, owner, guardian);
    const paymasterAddress = await paymaster.getAddress();
    const feeManagerAddress = await feeManager.getAddress();

    const mintAmount = 1_000_000_000n;
    await mockUsdc.mint(accountAddress, mintAmount);
    assert.equal(await mockUsdc.balanceOf(accountAddress), mintAmount);

    const approveAmount = 1_000_000_000n;
    const approveCalldata = mockUsdc.interface.encodeFunctionData("approve", [paymasterAddress, approveAmount]);
    const approvalTx = await smartAccount.connect(owner).execute(await mockUsdc.getAddress(), 0, approveCalldata);
    await assertEvent(approvalTx, smartAccount, "SmartAccountExecuted");
    assert.equal(await mockUsdc.allowance(accountAddress, paymasterAddress), approveAmount);

    const verificationGasLimit = 80_000n;
    const callGasLimit = 120_000n;
    const preVerificationGas = 25_000n;
    const maxFeePerGas = ethers.parseUnits("1", "gwei");
    const userOpHash = ethers.keccak256(ethers.toUtf8Bytes("astalanty-mvp-demo-operation"));

    const quote = await feeManager.quoteFeeView({
      account: accountAddress,
      payer: accountAddress,
      verificationGasLimit,
      callGasLimit,
      preVerificationGas,
      maxFeePerGas
    });

    const network = await ethers.provider.getNetwork();
    const operationId = computeOperationId(paymasterAddress, network.chainId, userOpHash, accountAddress, accountAddress);

    const treasuryMockBefore = await mockUsdc.balanceOf(treasury.address);
    const treasuryAusdBefore = await ausd.balanceOf(treasury.address);

    const sponsorTx = await paymaster.sponsorDemoOperation(
      userOpHash,
      accountAddress,
      accountAddress,
      verificationGasLimit,
      callGasLimit,
      preVerificationGas,
      maxFeePerGas
    );
    await assertEvent(sponsorTx, paymaster, "PaymasterValidationStarted");
    await assertEvent(sponsorTx, paymaster, "PaymasterPaymentReceived");
    await assertEvent(sponsorTx, paymaster, "PaymasterFeeSettled");
    await assertEvent(sponsorTx, feeManager, "FeeSettled");
    await assertEvent(sponsorTx, ausd, "AUSDMinted");

    assert.equal(await mockUsdc.balanceOf(treasury.address), treasuryMockBefore + quote.mockUsdcRequired);
    assert.equal(await ausd.balanceOf(treasury.address), treasuryAusdBefore + quote.ausdFee);
    assert.equal(await feeManager.settledOperations(operationId), true);

    const operation = await paymaster.operations(operationId);
    assert.equal(operation.account, accountAddress);
    assert.equal(operation.payer, accountAddress);
    assert.equal(operation.mockUsdcPaid, quote.mockUsdcRequired);
    assert.equal(operation.ausdSettled, quote.ausdFee);
    assert.equal(operation.state, 2n);
  });

  it("blocks sponsorship when payer is different from account", async function () {
    const { owner, guardian, otherPayer, mockUsdc, paymaster, factory } = await deployMvp();
    const { accountAddress } = await createSmartAccount(factory, owner, guardian);

    await mockUsdc.mint(otherPayer.address, 1_000_000_000n);
    await mockUsdc.connect(otherPayer).approve(await paymaster.getAddress(), 1_000_000_000n);

    await assert.rejects(
      paymaster.sponsorDemoOperation(
        ethers.keccak256(ethers.toUtf8Bytes("invalid-payer")),
        accountAddress,
        otherPayer.address,
        80_000n,
        120_000n,
        25_000n,
        ethers.parseUnits("1", "gwei")
      ),
      /InvalidPayer/
    );
  });

  async function assertEvent(tx, contract, eventName) {
    const receipt = await tx.wait();
    const found = receipt.logs.some((log) => {
      try {
        return contract.interface.parseLog(log).name === eventName;
      } catch {
        return false;
      }
    });
    assert.equal(found, true, `${eventName} should be emitted`);
  }
});
