import jsSha3 from 'js-sha3';
import { utils } from 'ethers';

export function hashLeaf(data) {
    // Hashing a leaf node with '0x' prefix
    return utils.keccak256(data);//'0x' + jsSha3.keccak256(data);
}

export function hashPair(a, b) {
    // Lexicographically sort the pair (a, b) and hash the result with '0x' prefix
    const aHex = a.startsWith('0x') ? a.slice(2) : a;
    const bHex = b.startsWith('0x') ? b.slice(2) : b;

    const sortedPair = a < b ? aHex + bHex : bHex + aHex; // Remove '0x' from the second element
    //return utils.keccak256(Buffer.from(sortedPair, 'hex'));//'0x' + jsSha3.keccak256(Buffer.from(sortedPair, 'hex'));
    return '0x' + jsSha3.keccak256(Buffer.from(sortedPair, 'hex'));//'0x' + jsSha3.keccak256(Buffer.from(sortedPair, 'hex'));
}

export class MerkleTree {
    constructor(leaves) {
        this.leaves = leaves.map(hashLeaf);
        this.levels = [this.leaves];
        this.createTree();
    }

    createTree() {
        let currentLevel = this.leaves;
        while (currentLevel.length > 1) {
            const nextLevel = [];
            for (let i = 0; i < currentLevel.length; i += 2) {
                const left = currentLevel[i];
                const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left; // Duplicate the last element if odd number of nodes
                nextLevel.push(hashPair(left, right));
            }
            this.levels.unshift(nextLevel); // Build the tree bottom-up
            currentLevel = nextLevel;
        }
    }

    getRoot() {
        return this.levels[0][0];
    }

    // getProof(leaf) {
    //     const leafHash = hashLeaf(leaf);
    //     let index = this.leaves.findIndex(h => h === leafHash);
    //     if (index === -1) return [];

    //     const proof = [];
    //     for (let i = this.levels.length - 1; i > 0; i--) {
    //         const level = this.levels[i];
    //         const pairIndex = index % 2 === 0 ? index + 1 : index - 1;
    //         if (pairIndex < level.length) {
    //             proof.push(level[pairIndex]);
    //         }
    //         index = Math.floor(index / 2); // Move up
    //     }
    //     return proof;
    // }
    getProof(leaf) {
        const leafHash = hashLeaf(leaf);
        let index = this.leaves.findIndex(h => h === leafHash);
        if (index === -1) return [];
    
        const proof = [];
        for (let i = this.levels.length - 1; i > 0; i--) {
            const level = this.levels[i];
            // Correctly determining the sibling index for each level.
            const pairIndex = index % 2 === 0 ? (index + 1 < level.length ? index + 1 : index) : index - 1;
            
            proof.push(level[pairIndex]);
            // Prepare index for the next level up.
            index = Math.floor(index / 2);
        }
        return proof;
    }
}

export function verifyLeaf(proof, root, leaf) {
    let computedHash = hashLeaf(leaf); // Start with the leaf hash
    proof.forEach(proofElement => {
        computedHash = hashPair(computedHash, proofElement); // Hash with each proof element
    });
    return computedHash === root; // Check if the computed hash matches the given root
}