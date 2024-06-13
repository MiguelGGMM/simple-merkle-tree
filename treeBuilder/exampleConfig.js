import dotenv from "dotenv";
import { env } from "node:process";
dotenv.config();

export const dappConfig = {
    tokenAddress: env["TOKEN_ADDRESS"],
    covalentKey: env["COVALENT_KEY"],
    explorerKey: env["EXPLORER_KEY"],
    MONGODB_URI: env["MONGODB_URI"],
    //Edit
    blockExplorerAPI: 'https://api.basescan.org/api',
    chainId: 8453,
    fromBlock: 0,
    toBlock: 0,
    totalTokenDistribute: 0,
    liqPairs: []
}