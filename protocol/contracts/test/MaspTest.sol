// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import {MultiAssetShieldedPool} from "../MultiAssetShieldedPool.sol";
import {IMasp, SpendProof, Bridge, OutputProof} from "../interfaces/IMasp.sol";

contract MaspTest is IMasp, MultiAssetShieldedPool {
    constructor(
        address _spendVerifier,
        address _outputVerifier,
        address _merkleHasher
    ) MultiAssetShieldedPool(_spendVerifier, _outputVerifier, _merkleHasher) {}

    function deposit(
        SpendProof[] calldata _spendProof,
        OutputProof[] calldata _outputProofs,
        uint256[2] calldata _bpk,
        uint256 _assetId,
        uint256 _depositAmount,
        uint256 _root,
        uint256[2] calldata _R,
        uint256 _s,
        bytes calldata _hash
    ) external {
        _deposit(
            _spendProof,
            _outputProofs,
            _bpk,
            _assetId,
            _depositAmount,
            _root,
            _R,
            _s,
            _hash
        );
    }

    function transact(
        SpendProof[] calldata _spendProof,
        OutputProof[] calldata _outputProofs,
        uint[2] calldata _bpk,
        uint256 _root,
        uint256[2] calldata _R,
        uint256 _s,
        bytes calldata _hash
    ) external {
        _transact(_spendProof, _outputProofs, _bpk, _root, _R, _s, _hash);
    }

    function bridge(
        SpendProof[] calldata _spendProof,
        OutputProof[] calldata _outputProofs,
        Bridge[] calldata _bridges,
        uint256[2] calldata _bpk,
        uint256 _root,
        uint256[2] calldata _R,
        uint256 _s,
        bytes calldata _hash
    ) external {
        _bridge(
            _spendProof,
            _outputProofs,
            _bridges,
            _bpk,
            _root,
            _R,
            _s,
            _hash
        );
    }

    function withdraw(
        SpendProof[] calldata _spendProof,
        OutputProof[] calldata _outputProofs,
        uint[2] calldata _bpk,
        uint256 _assetId,
        uint256 _withdrawAmount,
        uint256 _root,
        uint256[2] calldata _R,
        uint256 _s,
        bytes calldata _hash
    ) external {
        _withdraw(
            _spendProof,
            _outputProofs,
            _bpk,
            _assetId,
            _withdrawAmount,
            _root,
            _R,
            _s,
            _hash
        );
    }
}
