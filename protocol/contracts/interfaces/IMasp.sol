// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {MultiAssetShieldedPool} from "../MultiAssetShieldedPool.sol";

struct SpendProof {
    bytes proof;
    uint256 nullifier;
    uint256[2] valueCommitment;
}

struct OutputProof {
    bytes proof;
    uint256 commitment;
    uint256[2] valueCommitment;
    bytes encryptedOutput;
}

interface IMasp {
    event NewCommitment(
        uint256 indexed commitment,
        uint256 indexed index,
        bytes encryptedOutput
    );

    event NewNullifier(uint256 indexed nullifier);

    function deposit(
        SpendProof[] memory _spendProof,
        OutputProof[] memory _outputProofs,
        uint[2] memory _bpk,
        uint256 _assetId,
        uint256 _depositAmount,
        uint256 _root,
        uint256[2] memory _R,
        uint256 _s,
        bytes memory _hash
    ) external;

    function transact(
        SpendProof[] memory _spendProof,
        OutputProof[] memory _outputProofs,
        uint256[2] memory _bpk,
        uint256 _root,
        uint256[2] memory _R,
        uint256 _s,
        bytes memory _hash
    ) external;

    function withdraw(
        SpendProof[] memory _spendProof,
        OutputProof[] memory _outputProofs,
        uint256[2] memory _bpk,
        uint256 _assetId,
        uint256 _withdrawAmount,
        uint256 _root,
        uint256[2] memory _R,
        uint256 _s,
        bytes memory _hash
    ) external;
}
