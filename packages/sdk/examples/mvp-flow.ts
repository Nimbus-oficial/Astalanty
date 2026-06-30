import { AstalantySDK, configFromDeployment } from "@astalanty/sdk";
import deployment from "../../contracts/deployments/hardhat-31337-latest.json" assert { type: "json" };

const sdk = new AstalantySDK(
  configFromDeployment(deployment, "http://127.0.0.1:8545")
);

// In a browser app, pass window.ethereum.
await sdk.connect(window.ethereum);

const account = await sdk.createSmartAccount();
console.log("Smart Account:", account.smartAccount);

const mockUsdc = await sdk.getMockUSDCBalance();
console.log("Mock USDC:", mockUsdc.formatted);

await sdk.approvePaymaster();

const result = await sdk.executeSponsoredTransaction();
console.log("Operation:", result.operationId);
