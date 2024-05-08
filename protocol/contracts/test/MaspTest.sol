// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import {MultiAssetShieldedPool} from "../MultiAssetShieldedPool.sol";
import {IMasp, SpendProof, OutputProof} from "../interfaces/IMasp.sol";

contract MaspTest is IMasp, MultiAssetShieldedPool {
    constructor(
        address _spendVerifier,
        address _outputVerifier,
        address _merkleHasher
    ) MultiAssetShieldedPool(_spendVerifier, _outputVerifier, _merkleHasher) {}

    function deposit(
        SpendProof[] memory _spendProof,
        OutputProof[] memory _outputProofs,
        uint[2] memory _bpk,
        uint256 _assetId,
        uint256 _depositAmount,
        uint256 _root
    ) external {
        _deposit(
            _spendProof,
            _outputProofs,
            _bpk,
            _assetId,
            _depositAmount,
            _root
        );
    }

    function transact(
        SpendProof[] memory _spendProof,
        OutputProof[] memory _outputProofs,
        uint[2] memory _bpk,
        uint256 _root
    ) external {
        _transact(_spendProof, _outputProofs, _bpk, _root);
    }

    function withdraw(
        SpendProof[] memory _spendProof,
        OutputProof[] memory _outputProofs,
        uint[2] memory _bpk,
        uint256 _assetId,
        uint256 _withdrawAmount,
        uint256 _root
    ) external {
        _withdraw(
            _spendProof,
            _outputProofs,
            _bpk,
            _assetId,
            _withdrawAmount,
            _root
        );
    }
}
