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
        uint256[2] memory _bpk,
        uint256 _assetId,
        uint256 _depositAmount,
        uint256 _root,
        uint256[2] memory _R,
        uint256 _s,
        bytes memory _hash
    ) external {
        uint256[] memory nullifiers = new uint256[](_spendProof.length);
        uint256[] memory commitments = new uint256[](_outputProofs.length);
        uint256[] memory valueCommitments = new uint256[](
            _spendProof.length * 2 + _outputProofs.length * 2
        );

        uint256 vcIndex = 0;
        for (uint256 i = 0; i < _spendProof.length; i++) {
            nullifiers[i] = _spendProof[i].nullifier;
            valueCommitments[vcIndex++] = _spendProof[i].valueCommitment[0];
            valueCommitments[vcIndex++] = _spendProof[i].valueCommitment[1];
        }

        for (uint256 i = 0; i < _outputProofs.length; i++) {
            commitments[i] = _outputProofs[i].commitment;
            valueCommitments[vcIndex++] = _outputProofs[i].valueCommitment[0];
            valueCommitments[vcIndex++] = _outputProofs[i].valueCommitment[1];
        }

        require(
            keccak256(
                abi.encodePacked(nullifiers, commitments, valueCommitments)
            ) == bytes32(_hash),
            "Hashes must match"
        );

        return
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
        SpendProof[] memory _spendProof,
        OutputProof[] memory _outputProofs,
        uint[2] memory _bpk,
        uint256 _root,
        uint256[2] memory _R,
        uint256 _s,
        bytes memory _hash
    ) external {
        _transact(_spendProof, _outputProofs, _bpk, _root, _R, _s, _hash);
    }

    function withdraw(
        SpendProof[] memory _spendProof,
        OutputProof[] memory _outputProofs,
        uint[2] memory _bpk,
        uint256 _assetId,
        uint256 _withdrawAmount,
        uint256 _root,
        uint256[2] memory _R,
        uint256 _s,
        bytes memory _hash
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
