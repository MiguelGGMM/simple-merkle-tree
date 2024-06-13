//import "@nomicfoundation/hardhat-ethers";
import { ethers } from "hardhat";
import _ from "lodash";

async function main() {
  console.log(
    `Deploying using parameters: \n\t${_.filter(
      Object.keys(process.env),
      (_o) => ["TOKEN_CLAIMABLE"].includes(_o),
    ).map((_o) => `${_o}:${process.env[_o]}\n\t`)}`,
  );

  const claimManager = await ethers.deployContract("ClaimManager", [
    process.env.TOKEN_CLAIMABLE
  ]);
  await claimManager.waitForDeployment();
  console.log(
    `ClaimManager successfully deployed: ${claimManager.target}`,
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
