// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import {MultiAssetShieldedPool} from "../MultiAssetShieldedPool.sol";
import {IMasp, TxData} from "../interfaces/IMasp.sol";

contract MaspTest is IMasp, MultiAssetShieldedPool {
    constructor(
        address _txVerifier,
        address _merkleHasher
    ) MultiAssetShieldedPool(_txVerifier, _merkleHasher) {}

    function transact(TxData calldata _txData) external {
        _transact(_txData);
    }

    function receiveCommitments(bytes32 _commitment) external {
        _receiveCommitments(_commitment);
    }
}
