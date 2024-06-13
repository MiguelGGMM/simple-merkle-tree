import _ from 'lodash';
import { MerkleTree, verifyLeaf, hashLeaf } from './merkleTreeBuilderWeb3.js';
import { dappConfig } from './exampleConfig.js';
import { utils } from 'ethers';
import { saveMerkleTree } from './mongoose/saveData.js';

const run = async () => {
    const currTimestampS = (new Date().getTime() / 1000).toFixed(0);
    const distributionPack = []; //if you want a custom distribution

    const transactionsQuery = `${dappConfig.blockExplorerAPI}`
        +`?module=logs`
        +`&action=getLogs`
        +`&fromBlock=${dappConfig.fromBlock}`
        +`&toBlock=${dappConfig.toBlock}`
        +`&address=${dappConfig.tokenAddress.toLowerCase()}`
        +`&topic0=0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef` //transfer topic
        +`&page=1`
        +`&offset=10000`
        +`&apikey=${dappConfig.explorerKey}`;

    const answerExplorer = await fetch(transactionsQuery);
    const answerExplorerJson = await answerExplorer.json();    

    //We want holders that didnt sell in the block interval
    let transactionListExempted = [];
    if(answerExplorerJson && answerExplorerJson.result && answerExplorerJson.result.length > 0) {            
        transactionListExempted = answerExplorerJson.result.filter(el => _.some(dappConfig.liqPairs, lp => el.topics[2].includes(lp.slice(2))));
        transactionListExempted = transactionListExempted.map(tle => tle.topics[1]);
    }

    const queryHoldersCovalent = `https://api.covalenthq.com/v1/${dappConfig.chainId}/tokens/`
        +`${dappConfig.tokenAddress}/token_holders/?key=${dappConfig.covalentKey}&page-size=300`
    const answer = await fetch(queryHoldersCovalent);
    const answerJson = await answer.json();

    let filteredItems = answerJson.data.items;
    console.log(`Total holders qualify ${filteredItems.length}`);
    filteredItems = filteredItems.filter(el => !_.some(transactionListExempted, tle => tle.toLowerCase() == el.address.toLowerCase()));
    console.log(`Total holders qualify after no sell last 7 days ${filteredItems.length}`);        

    let totalAmountQualify = _.sumBy(filteredItems, el => parseInt(el.balance));
    for(const item of filteredItems) {
        distributionPack.push({
            address: item.address.toLowerCase(),
            amountOwned: (parseInt(item.balance) / (10**9)).toFixed(0),
            amount: ((parseInt(item.balance) / totalAmountQualify) * dappConfig.totalTokenDistribute).toFixed(0)
        })
    }     

    //We need even distribution
    if(distributionPack.length % 2 != 0) {
        distributionPack.push(distributionPack[distributionPack.length - 1]);
    }
    
    const encodedDistribution = distributionPack.map(el => { 
        console.log('Encoded args:' , [utils.getAddress(el.address), (parseInt(el.amount) * (10 ** 9)).toString()])
        let encodedRaw = utils.solidityPack(["address", "uint256"], [utils.getAddress(el.address), (parseInt(el.amount) * (10 ** 9)).toString()]);
        return { 
            timestamp: currTimestampS,
            ...el,
            encodedRaw: encodedRaw,
            encoded: utils.keccak256(encodedRaw),
            ifMatchedRoot: hashLeaf(encodedRaw)
        }        
    });

    const merkleTree = new MerkleTree(encodedDistribution.map(el => el.encodedRaw));  
    const encodedDistributionSave = encodedDistribution.map(el => {
        let proofs = merkleTree.getProof(el.encodedRaw);
        return {
            ...el,
            proofOriginal: proofs,
            proof: proofs.map(el => Buffer.from(el.slice(2), 'hex')),  
            verifiedLeaf: verifyLeaf(proofs, merkleTree.getRoot(), el.encodedRaw)          
        }
    })
    
    console.log(encodedDistributionSave);
    console.log(`Number of valid addresses: ${encodedDistributionSave.length}`);
    console.log(`Max rewarded: ${JSON.stringify(_.maxBy(encodedDistributionSave, el => parseInt(el.amountOwned)))}`);
    console.log(`Min rewarded: ${JSON.stringify(_.minBy(encodedDistributionSave, el => parseInt(el.amountOwned)))}`);
    console.log('Merkle Root:', merkleTree.getRoot());  
    console.log('Timestamp:', currTimestampS);
    console.log('Wrong leafs:', encodedDistributionSave.filter(el => el.verifiedLeaf == false).length);

    //Store on mongodb
    await saveMerkleTree(encodedDistributionSave);
}

(() => {
    run();
})()