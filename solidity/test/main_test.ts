import { ethers/* , network */ } from "hardhat";
import {
  ClaimManager
} from "../typechain-types";
import { Addressable/* , BigNumberish */ } from "ethers";
import { expect } from "chai";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
//import { BN } from "bn.js";

import { MerkleTree/* , verifyLeaf, hashLeaf */ } from "../../treeBuilder/merkleTreeBuilderWeb3.js";

//const gasLimit = "5000000";
const gasPrice = "5000000000";

/* const ZERO_ADDRESS = `0x0000000000000000000000000000000000000000`;
const DEAD_ADDRESS = `0x000000000000000000000000000000000000dEaD`; */

let _claimManager: ClaimManager;
//let tokenAdr: string;
let accounts: HardhatEthersSigner[];
let _owner: HardhatEthersSigner;
let _merkleTreeObj: MerkleTree;
let _merkleTimestamp: number;
let _leafs: string[]

const debug = process.env.DEBUG_TEST == "1";

// const getAccountBalance = async (account: string) => {
//   const balance = await ethers.provider.getBalance(account);
//   return ethers.formatUnits(balance, "ether");
// };

// const BN2 = (x: BigNumberish) => new BN(x.toString());
// const toWei = (value: BigNumberish) => ethers.parseEther(value.toString());
/* const fromWei = (value: BigNumberish, fixed: number = 2) =>
  parseFloat(ethers.formatUnits(value, "ether")).toFixed(fixed); */

const getBlockTimestamp = async () => {
  return (await ethers.provider.getBlock("latest"))?.timestamp;
};

/* const getBlockNumber = async () => {
  return (await ethers.provider.getBlock("latest"))?.number;
}; */

// const increaseDays = async (days: number) => {
//   await increase(86400 * days);
// };

// const increase = async (duration: number) => {
//   return new Promise((resolve /* reject */) => {
//     network.provider
//       .request({
//         method: "evm_increaseTime",
//         params: [duration],
//       })
//       .finally(() => {
//         network.provider
//           .request({
//             method: "evm_mine",
//             params: [],
//           })
//           .finally(() => {
//             resolve(undefined);
//           });
//       });
//   });
// };

const log = (message: string) => {
  if (debug) {
    console.log(`\t[DEBUG] ${message}`);
  }
};

describe("ClaimManager", function () {
  async function deployment() {
    const claimManager = await ethers.deployContract(
      "ClaimManager",
      [
        process.env.TOKEN_CLAIMABLE
      ],
      {
        gasPrice: gasPrice,
        gasLimit: "20000000",
      },
    );
    await claimManager.waitForDeployment();
    log(
      `ClaimManager successfully deployed: ${
        claimManager.target
      } (by: ${await claimManager.admin()})`,
    );
    // Contracts are deployed using the first signer/account by default
    const _accounts = await ethers.getSigners();
    return { claimManager, _accounts };
  }

  describe("Deployment", function () {
    it("We check environment variables config", async function () {
      log(
        `Environment TOKEN_CLAIMABLE: ${process.env.TOKEN_CLAIMABLE}`,
      );
      expect([
        process.env.TOKEN_CLAIMABLE
      ]).to.satisfy(
        (s: (string | undefined)[]) =>
          s.every((_s) => _s != undefined && _s != ""),
        "Environment variables TOKEN_CLAIMABLE can not be empty or undefined",
      );
    });

    it("We attach contracts that have been deployed", async function () {
      const { ...args } = await deployment();
      _claimManager = args.claimManager;
      accounts = args._accounts;
      _owner = accounts[0]; //depends... check

      log(`Contracts deployed: ClaimManager`);
      log(`Addresses: ${_claimManager.target}`);
      log(`Deployer address: ${_owner.address}`);
      log(
        `Full list of addresses: \n${accounts
          .map((_a) => `\t\t${_a.address}`)
          .join(",\n")}`,
      );
      expect(_claimManager.target).to.satisfy(
        (s: string | Addressable) => s != undefined && s != "",
      );
    });
  });

  describe("Gen and set merkle", function() {
    it("Gen merkle tree and set root", async function () {
      _leafs = [
        ethers.solidityPacked(["address", "uint256"], [accounts[0].address, (1000 * (10 ** 6)).toString()]),
        ethers.solidityPacked(["address", "uint256"], [accounts[1].address, (2000 * (10 ** 6)).toString()]),
      ];
      _merkleTreeObj = new MerkleTree(_leafs);
      _merkleTimestamp = (await getBlockTimestamp())??0;
      await _claimManager.updateMerkleRoot(_merkleTreeObj.getRoot(), _merkleTimestamp);
    })
  });

  describe("Check merkle tree", function() {
    it("Try verify leaf with wrong data, has to fail", async function () {
      expect(await _claimManager.verifyClaim(accounts[0], (1000 * (10 ** 6)).toString(), _merkleTimestamp, [])).to.be.equal(false, "Unexpected pass");
    })

    it("Try verify leaf with rigth data, has to work", async function () {
      expect(await _claimManager.verifyClaim(accounts[0], (1000 * (10 ** 6)).toString(), _merkleTimestamp, _merkleTreeObj.getProof(_leafs[0]))).to.be.equal(true, "Unexpected failure");
    })
  })
});
