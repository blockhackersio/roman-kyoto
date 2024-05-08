// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {MultiAssetShieldedPool} from "../MultiAssetShieldedPool.sol";

struct SpendProof {
    bytes proof;
    uint256 nullifier;
    uint[2] valueCommitment;
}

struct OutputProof {
    bytes proof;
    uint256 commitment;
    uint[2] valueCommitment;
    bytes encryptedOutput;
}

interface IMasp {
    function deposit(
        SpendProof[] memory _spendProof,
        OutputProof[] memory _outputProofs,
        uint[2] memory _bpk,
        uint256 _assetId,
        uint256 _depositAmount,
        uint256 _root
    ) external;

     function transact(
        SpendProof[] memory _spendProof,
        OutputProof[] memory _outputProofs,
        uint[2] memory _bpk,
        uint256 _root
    ) external;

    function withdraw(
        SpendProof[] memory _spendProof,
        OutputProof[] memory _outputProofs,
        uint[2] memory _bpk,
        uint256 _assetId,
        uint256 _withdrawAmount,
        uint256 _root
    ) external;
}
