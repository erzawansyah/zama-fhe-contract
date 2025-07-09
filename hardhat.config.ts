import { HardhatUserConfig, task } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-ignition-ethers";
import "@nomicfoundation/hardhat-verify";
import "@nomicfoundation/hardhat-chai-matchers";
import "dotenv/config";
import fs from "fs";
import path from "path";

// Define generate-artifacts task
task("generate-artifacts", "Generate contract artifacts (ABI, JSON, Interface)")
  .addParam("contract", "The contract name to generate artifacts for")
  .setAction(async (taskArgs, hre) => {
    const contractName = taskArgs.contract;
    const contractPath = `contracts/${contractName}.sol`;
    const artifactPath = `artifacts/contracts/${contractName}.sol/${contractName}.json`;

    // Check if contract file exists
    if (!fs.existsSync(contractPath)) {
      console.error(`❌ Error: Contract file not found: ${contractPath}`);
      return;
    }

    // Check if artifact exists
    if (!fs.existsSync(artifactPath)) {
      console.error(`❌ Error: Artifact not found: ${artifactPath}`);
      console.log("💡 Run: npx hardhat compile");
      return;
    }

    // Create output directories
    const outputDirs = ["output", "output/abi", "output/json"];
    outputDirs.forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Created directory: ${dir}`);
      }
    });

    try {
      console.log(`🚀 Generating artifacts for: ${contractName}`);

      // Read files
      const contractSource = fs.readFileSync(contractPath, "utf8");
      const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
      const abi = artifact.abi;

      // Generate ABI
      const abiPath = path.join("output/abi", `${contractName}-abi.json`);
      fs.writeFileSync(abiPath, JSON.stringify(abi, null, 2));

      // Generate human-readable ABI
      const humanReadableAbi = abi.map((item: any) => {
        if (item.type === "function") {
          const inputs = item.inputs
            .map((input: any) => `${input.type} ${input.name}`)
            .join(", ");
          const outputs =
            item.outputs?.map((output: any) => output.type).join(", ") ||
            "void";
          const stateMutability =
            item.stateMutability !== "nonpayable"
              ? ` ${item.stateMutability}`
              : "";
          return `function ${item.name}(${inputs})${stateMutability} returns (${outputs})`;
        } else if (item.type === "event") {
          const inputs = item.inputs
            .map((input: any) => {
              const indexed = input.indexed ? " indexed" : "";
              return `${input.type}${indexed} ${input.name}`;
            })
            .join(", ");
          return `event ${item.name}(${inputs})`;
        } else if (item.type === "constructor") {
          const inputs = item.inputs
            .map((input: any) => `${input.type} ${input.name}`)
            .join(", ");
          return `constructor(${inputs})`;
        }
        return JSON.stringify(item);
      });

      const readableAbiPath = path.join(
        "output/abi",
        `${contractName}-abi-readable.txt`
      );
      fs.writeFileSync(readableAbiPath, humanReadableAbi.join("\n"));

      // Generate standard JSON input
      const standardJsonInput = {
        language: "Solidity",
        sources: {
          [contractPath]: {
            content: contractSource,
          },
        },
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          outputSelection: {
            "*": {
              "*": ["abi", "evm.bytecode", "evm.deployedBytecode", "metadata"],
            },
          },
        },
      };

      const jsonInputPath = path.join(
        "output/json",
        `${contractName}-standard-input.json`
      );
      fs.writeFileSync(
        jsonInputPath,
        JSON.stringify(standardJsonInput, null, 2)
      );

      // Generate full contract info
      const fullContractInfo = {
        contractName: artifact.contractName,
        sourceName: artifact.sourceName,
        abi: artifact.abi,
        bytecode: artifact.bytecode,
        deployedBytecode: artifact.deployedBytecode,
        linkReferences: artifact.linkReferences,
        deployedLinkReferences: artifact.deployedLinkReferences,
        metadata: artifact.metadata ? JSON.parse(artifact.metadata) : null,
      };

      const fullInfoPath = path.join(
        "output/json",
        `${contractName}-full-info.json`
      );
      fs.writeFileSync(fullInfoPath, JSON.stringify(fullContractInfo, null, 2));

      // Generate minimal JSON
      const minimalJsonInput = {
        language: "Solidity",
        sources: {
          [contractPath]: {
            content: contractSource.replace(/\s+/g, " ").trim(),
          },
        },
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          outputSelection: {
            "*": {
              "*": ["*"],
            },
          },
        },
      };

      const minimalJsonPath = path.join(
        "output/json",
        `${contractName}-minimal-input.json`
      );
      fs.writeFileSync(minimalJsonPath, JSON.stringify(minimalJsonInput));

      // Summary
      console.log("\n🎉 === CONTRACT ARTIFACTS GENERATED ===");
      console.log(`📋 Contract: ${contractName}`);
      console.log("\n📁 Files created:");
      console.log(`  ✅ ${abiPath}`);
      console.log(`  ✅ ${readableAbiPath}`);
      console.log(`  ✅ ${jsonInputPath}`);
      console.log(`  ✅ ${minimalJsonPath}`);
      console.log(`  ✅ ${fullInfoPath}`);
    } catch (error) {
      console.error("❌ Error generating artifacts:", error);
    }
  });

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.30",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    sepolia: {
      url: `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
    },
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY || "",
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
