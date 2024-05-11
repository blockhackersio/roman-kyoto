// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import {MultiAssetShieldedPool} from "../MultiAssetShieldedPool.sol";
import {IMasp, Spend, Output, BridgeIn, BridgeOut} from "../interfaces/IMasp.sol";

contract MaspTest is IMasp, MultiAssetShieldedPool {
    constructor(
        address _spendVerifier,
        address _outputVerifier,
        address _merkleHasher
    ) MultiAssetShieldedPool(_spendVerifier, _outputVerifier, _merkleHasher) {}

    function transact(
        Spend[] calldata _spends,
        Output[] calldata _outputs,
        BridgeIn[] calldata _bridgeIns,
        BridgeOut[] calldata _bridgeOuts,
        uint256 _extAssetHash,
        int256 _extAmount,
        uint256[2] calldata _bpk,
        uint256 _root,
        uint256[2] calldata _R,
        uint256 _s,
        bytes calldata _hash
    ) external {
        _transact(
            _spends,
            _outputs,
            _bridgeIns,
            _bridgeOuts,
            _extAssetHash,
            _extAmount,
            _bpk,
            _root,
            _R,
            _s,
            _hash
        );
    }

    function receiveCommitments(bytes32 _commitment) external {
        _receiveCommitments(_commitment);
    }
}
