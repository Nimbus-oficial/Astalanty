const fs = require("node:fs");
const path = require("node:path");
const hre = require("hardhat");

const { ethers, network } = hre;

const DEFAULTS = {
  usdcToAusdRate: ethers.parseEther("1"),
  gasMarkupBps: 500n,
  minAusdFee: ethers.parseEther("0.01"),
  maxAusdFee: ethers.parseEther("10"),
  maxCostPerOperation: 0n,
  mockUsdcMintAmount: 1_000_000_000n,
  smartAccountApproveAmount: 1_000_000_000n,
  demoVerificationGasLimit: 80_000n,
  demoCallGasLimit: 120_000n,
  demoPreVerificationGas: 25_000n,
  demoMaxFeePerGas: ethers.parseUnits("1", "gwei")
};

async function main() {
  const [deployer] = await ethers.getSigners();
  if (!deployer) {
    throw new Error("No deployer signer available. Configure DEPLOYER_PRIVATE_KEY for public testnets.");
  }

  const chainId = (await ethers.provider.getNetwork()).chainId;
  const deployerAddress = await deployer.getAddress();
  const treasury = getAddressEnv("MVP_TREASURY_ADDRESS", deployerAddress);
  const entryPoint = getAddressEnv("MVP_ENTRY_POINT_ADDRESS", deployerAddress);
  const recoveryGuardian = getAddressEnv("MVP_RECOVERY_GUARDIAN_ADDRESS", deployerAddress);

  const params = {
    usdcToAusdRate: getBigIntEnv("MVP_USDC_TO_AUSD_RATE", DEFAULTS.usdcToAusdRate),
    gasMarkupBps: getBigIntEnv("MVP_GAS_MARKUP_BPS", DEFAULTS.gasMarkupBps),
    minAusdFee: getBigIntEnv("MVP_MIN_AUSD_FEE", DEFAULTS.minAusdFee),
    maxAusdFee: getBigIntEnv("MVP_MAX_AUSD_FEE", DEFAULTS.maxAusdFee),
    maxCostPerOperation: getBigIntEnv("MVP_MAX_COST_PER_OPERATION", DEFAULTS.maxCostPerOperation),
    mockUsdcMintAmount: getBigIntEnv("MVP_MOCK_USDC_MINT_AMOUNT", DEFAULTS.mockUsdcMintAmount),
    smartAccountApproveAmount: getBigIntEnv(
      "MVP_SMART_ACCOUNT_APPROVE_AMOUNT",
      DEFAULTS.smartAccountApproveAmount
    ),
    demoVerificationGasLimit: getBigIntEnv(
      "MVP_DEMO_VERIFICATION_GAS_LIMIT",
      DEFAULTS.demoVerificationGasLimit
    ),
    demoCallGasLimit: getBigIntEnv("MVP_DEMO_CALL_GAS_LIMIT", DEFAULTS.demoCallGasLimit),
    demoPreVerificationGas: getBigIntEnv("MVP_DEMO_PRE_VERIFICATION_GAS", DEFAULTS.demoPreVerificationGas),
    demoMaxFeePerGas: getBigIntEnv("MVP_DEMO_MAX_FEE_PER_GAS", DEFAULTS.demoMaxFeePerGas)
  };

  console.log(`Deploying Astalanty MVP on ${network.name} (${chainId})`);
  console.log(`Deployer: ${deployerAddress}`);
  console.log(`Treasury: ${treasury}`);
  console.log(`EntryPoint demo fallback: ${entryPoint}`);
  console.log(`Recovery guardian: ${recoveryGuardian}`);

  const mockUsdc = await deploy("MockUSDC", [deployerAddress]);
  const ausd = await deploy("AUSDToken", [deployerAddress]);

  const feeManager = await deploy("AstalantyFeeManager", [
    deployerAddress,
    await mockAddress(ausd),
    await mockAddress(mockUsdc),
    treasury,
    params.usdcToAusdRate,
    params.gasMarkupBps,
    params.minAusdFee,
    params.maxAusdFee
  ]);

  const paymaster = await deploy("AstalantyPaymaster", [
    deployerAddress,
    entryPoint,
    await mockAddress(feeManager),
    await mockAddress(mockUsdc),
    treasury,
    params.maxCostPerOperation
  ]);

  const factory = await deploy("AstalantySmartAccountFactory", [deployerAddress, entryPoint]);

  console.log("Configuring permissions...");
  await waitTx(ausd.setMinter(await mockAddress(feeManager), true), "AUSDToken.setMinter(FeeManager)");
  await waitTx(
    feeManager.setAuthorizedPaymaster(await mockAddress(paymaster)),
    "FeeManager.setAuthorizedPaymaster(Paymaster)"
  );

  console.log("Creating deployer Smart Account...");
  const createAccountReceipt = await waitTx(
    factory.createAccount(deployerAddress, recoveryGuardian),
    "Factory.createAccount(deployer)"
  );
  const smartAccountAddress = parseSmartAccountCreated(factory, createAccountReceipt);
  const smartAccount = await ethers.getContractAt("AstalantySmartAccount", smartAccountAddress);

  console.log("Seeding Smart Account with Mock USDC...");
  await waitTx(mockUsdc.mint(smartAccountAddress, params.mockUsdcMintAmount), "MockUSDC.mint(SmartAccount)");

  console.log("Approving Paymaster through Smart Account.execute...");
  const approveCalldata = mockUsdc.interface.encodeFunctionData("approve", [
    await mockAddress(paymaster),
    params.smartAccountApproveAmount
  ]);
  await waitTx(
    smartAccount.execute(await mockAddress(mockUsdc), 0, approveCalldata),
    "SmartAccount.execute(MockUSDC.approve)"
  );

  const userOpHash = ethers.keccak256(
    ethers.solidityPacked(
      ["string", "uint256", "address", "uint256"],
      ["ASTALANTY_MVP_DEMO", chainId, smartAccountAddress, Math.floor(Date.now() / 1000)]
    )
  );

  const quote = await feeManager.quoteFeeView({
    account: smartAccountAddress,
    payer: smartAccountAddress,
    verificationGasLimit: params.demoVerificationGasLimit,
    callGasLimit: params.demoCallGasLimit,
    preVerificationGas: params.demoPreVerificationGas,
    maxFeePerGas: params.demoMaxFeePerGas
  });

  console.log("Executing sponsorDemoOperation...");
  await waitTx(
    paymaster.sponsorDemoOperation(
      userOpHash,
      smartAccountAddress,
      smartAccountAddress,
      params.demoVerificationGasLimit,
      params.demoCallGasLimit,
      params.demoPreVerificationGas,
      params.demoMaxFeePerGas
    ),
    "Paymaster.sponsorDemoOperation"
  );

  const paymasterAddress = await mockAddress(paymaster);
  const operationId = computeOperationId(paymasterAddress, chainId, userOpHash, smartAccountAddress);
  const deployment = {
    project: "Astalanty",
    phase: "MVP technical economic core",
    network: network.name,
    chainId: chainId.toString(),
    deployedAt: new Date().toISOString(),
    deployer: deployerAddress,
    treasury,
    entryPoint,
    recoveryGuardian,
    contracts: {
      MockUSDC: await mockAddress(mockUsdc),
      AUSDToken: await mockAddress(ausd),
      AstalantyFeeManager: await mockAddress(feeManager),
      AstalantyPaymaster: paymasterAddress,
      AstalantySmartAccountFactory: await mockAddress(factory),
      AstalantySmartAccount: smartAccountAddress
    },
    configuration: stringifyBigInts(params),
    demoOperation: {
      userOpHash,
      operationId,
      quote: stringifyBigInts({
        gasLimit: quote.gasLimit,
        gasFeeWei: quote.gasFeeWei,
        ausdFee: quote.ausdFee,
        mockUsdcRequired: quote.mockUsdcRequired,
        rate: quote.rate
      }),
      smartAccountMockUsdcBalance: (await mockUsdc.balanceOf(smartAccountAddress)).toString(),
      smartAccountPaymasterAllowance: (
        await mockUsdc.allowance(smartAccountAddress, paymasterAddress)
      ).toString(),
      treasuryMockUsdcBalance: (await mockUsdc.balanceOf(treasury)).toString(),
      treasuryAusdBalance: (await ausd.balanceOf(treasury)).toString()
    }
  };

  const filePath = writeDeploymentFile(deployment);
  console.log(`Deployment written to ${filePath}`);
  console.log("Astalanty MVP deploy and seed completed.");
}

async function deploy(name, args) {
  const Factory = await ethers.getContractFactory(name);
  const contract = await Factory.deploy(...args);
  await contract.waitForDeployment();
  console.log(`${name}: ${await mockAddress(contract)}`);
  return contract;
}

async function waitTx(txPromise, label) {
  const tx = await txPromise;
  const receipt = await tx.wait();
  console.log(`${label}: ${receipt.hash}`);
  return receipt;
}

async function mockAddress(contract) {
  return contract.getAddress();
}

function parseSmartAccountCreated(factory, receipt) {
  for (const log of receipt.logs) {
    try {
      const parsed = factory.interface.parseLog(log);
      if (parsed.name === "SmartAccountCreated") {
        console.log(`AstalantySmartAccount: ${parsed.args.account}`);
        return parsed.args.account;
      }
    } catch {
      continue;
    }
  }

  throw new Error("SmartAccountCreated event not found.");
}

function computeOperationId(paymaster, chainId, userOpHash, account) {
  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "uint256", "bytes32", "address", "address"],
    [paymaster, chainId, userOpHash, account, account]
  );
  return ethers.keccak256(encoded);
}

function getBigIntEnv(name, fallback) {
  const value = process.env[name];
  if (value === undefined || value === "") {
    return fallback;
  }
  return BigInt(value);
}

function getAddressEnv(name, fallback) {
  const value = process.env[name];
  if (value === undefined || value === "") {
    return fallback;
  }
  if (!ethers.isAddress(value)) {
    throw new Error(`${name} is not a valid address.`);
  }
  return ethers.getAddress(value);
}

function stringifyBigInts(value) {
  return JSON.parse(
    JSON.stringify(value, (_key, item) => (typeof item === "bigint" ? item.toString() : item))
  );
}

function writeDeploymentFile(deployment) {
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(deploymentsDir, { recursive: true });

  const timestamp = deployment.deployedAt.replace(/[:.]/g, "-");
  const fileName = `${deployment.network}-${deployment.chainId}-${timestamp}.json`;
  const latestName = `${deployment.network}-${deployment.chainId}-latest.json`;
  const filePath = path.join(deploymentsDir, fileName);
  const latestPath = path.join(deploymentsDir, latestName);

  fs.writeFileSync(filePath, `${JSON.stringify(deployment, null, 2)}\n`);
  fs.writeFileSync(latestPath, `${JSON.stringify(deployment, null, 2)}\n`);

  return filePath;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
