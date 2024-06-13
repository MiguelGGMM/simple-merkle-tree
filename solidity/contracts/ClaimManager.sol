// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
//import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
//import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

interface IERC20short {
    function transfer(address to, uint256 value) external returns (bool);
}

library MerkleProofShort {

    /**
     * @dev Returns true if a `leaf` can be proved to be a part of a Merkle tree
     * defined by `root`. For this, a `proof` must be provided, containing
     * sibling hashes on the branch from the leaf to the root of the tree. Each
     * pair of leaves and each pair of pre-images are assumed to be sorted.
     */
    function verify(bytes32[] memory proof, bytes32 root, bytes32 leaf) internal pure returns (bool) {
        return processProof(proof, leaf) == root;
    }

    /**
     * @dev Returns the rebuilt hash obtained by traversing a Merkle tree up
     * from `leaf` using `proof`. A `proof` is valid if and only if the rebuilt
     * hash matches the root of the tree. When processing the proof, the pairs
     * of leafs & pre-images are assumed to be sorted.
     */
    function processProof(bytes32[] memory proof, bytes32 leaf) internal pure returns (bytes32) {
        bytes32 computedHash = leaf;
        for (uint256 i = 0; i < proof.length; i++) {
            computedHash = _hashPair(computedHash, proof[i]);
        }
        return computedHash;
    }

    /**
     * @dev Sorts the pair (a, b) and hashes the result.
     */
    function _hashPair(bytes32 a, bytes32 b) private pure returns (bytes32) {
        return a < b ? _efficientHash(a, b) : _efficientHash(b, a);
    }

    /**
     * @dev Implementation of keccak256(abi.encode(a, b)) that doesn't allocate or expand memory.
     */
    function _efficientHash(bytes32 a, bytes32 b) private pure returns (bytes32 value) {
        /// @solidity memory-safe-assembly
        assembly {
            mstore(0x00, a)
            mstore(0x20, b)
            value := keccak256(0x00, 0x40)
        }
    }
}

/// @title Very simple example of merkle tree use case to distribute tokens
contract ClaimManager is ReentrancyGuard {
    address public admin;
    IERC20short public token;

    mapping(uint256 => bytes32) public merkleRoot;
    mapping(uint256 => mapping(address => bool)) public hasClaimed;
    mapping(address => uint256) public totalClaimed;

    event Claimed(address indexed claimant, uint256 amount);

    constructor(address tokenAddress) {
        admin = msg.sender;
        token = IERC20short(tokenAddress);
    }

    function areClaimedTimestamps(address sender, uint256[] memory timestamps) external view returns(bool[] memory) {
        return userClaimState(sender, timestamps, true);
    }

    function areClaimabledTimestamps(address sender, uint256[] memory timestamps) external view returns(bool[] memory) {
        return userClaimState(sender, timestamps, false);
    }

    function userClaimState(address sender, uint256[] memory timestamps, bool alreadyClaimed) internal view returns(bool[] memory) {
        bool[] memory areClaimabledTs = new bool[](timestamps.length);
        bytes32 emptyB32;

        for(uint256 _i; _i < timestamps.length; _i++) {
            areClaimabledTs[_i] = hasClaimed[_i][sender] == alreadyClaimed && merkleRoot[timestamps[_i]] != emptyB32;
        }

        return areClaimabledTs;
    }

    function areValidTimestamps(uint256[] memory timestampClaim) external view returns (bool[] memory) {
        bool[] memory validTimestamps = new bool[](timestampClaim.length);
        bytes32 emptyB32;

        for(uint256 _i; _i < timestampClaim.length; _i++) {
            validTimestamps[_i] = merkleRoot[timestampClaim[_i]] != emptyB32;
        }

        return validTimestamps;
    }

    function buildLeaf(address claimer, uint256 amount) public pure returns(bytes32) {
        return keccak256(abi.encodePacked(claimer, amount));
    }

    function verifyClaim(address claimer, uint256 amount, uint256 timestampClaim, bytes32[] calldata merkleProof) public view returns(bool) {
        // Construct the leaf from the claimant's address and the amount they're claiming
        bytes32 leaf = buildLeaf(claimer, amount);
        
        // Verify the claimant's proof against the Merkle root
        return MerkleProofShort.verify(merkleProof, merkleRoot[timestampClaim], leaf);
    }

    function claimTokens(uint256 amount, uint256 timestampClaim, bytes32[] calldata merkleProof) external nonReentrant {
        claimTokensInternal(amount, timestampClaim, merkleProof);
    }

    function claimTokensInternal(uint256 amount, uint256 timestampClaim, bytes32[] calldata merkleProof) internal {
        require(!hasClaimed[timestampClaim][msg.sender], "Tokens already claimed.");
        
        // Verify the claimant's proof against the Merkle root
        require(verifyClaim(msg.sender, amount, timestampClaim, merkleProof), "Invalid Merkle proof.");
        
        // Mark as claimed and send the tokens
        hasClaimed[timestampClaim][msg.sender] = true;
        totalClaimed[msg.sender] += amount;
        require(token.transfer(msg.sender, amount), "Token transfer failed.");        
        
        emit Claimed(msg.sender, amount);
    }

    function claimTokensBulk(uint256[] memory amounts, uint256[] memory timestamps, bytes32[][] calldata merkleProofs) external nonReentrant {
        require(amounts.length == timestamps.length && timestamps.length == merkleProofs.length, "Invalid parameters");
        for(uint256 _i = 0; _i < timestamps.length; _i++) {
            claimTokensInternal(amounts[_i], timestamps[_i], merkleProofs[_i]);
        }
    }

    /// @notice Admin function to update the Merkle root (for a new round of claims, for example)
    function updateMerkleRoot(bytes32 newRoot, uint256 timestampClaim) external {
        require(msg.sender == admin, "Only admin can update the Merkle root.");
        merkleRoot[timestampClaim] = newRoot;
    }

    // In case of emergency
    function extractTokens(uint256 amount) external {
        require(msg.sender == admin, "Only admin can extract tokens.");
        token.transfer(msg.sender, amount);
    }
}