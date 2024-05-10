// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {MultiAssetShieldedPool} from "../MultiAssetShieldedPool.sol";

struct Spend {
    bytes proof;
    uint256 nullifier;
    uint256[2] valueCommitment;
}

struct Output {
    bytes proof;
    uint256 commitment;
    uint256[2] valueCommitment;
    bytes encryptedOutput;
}

struct BridgeOut {
    bytes proof;
    uint256 chainId;
    address destination;
    bytes encryptedOutput;
    uint256[2] valueCommitment;
}

struct BridgeIn {
    uint256[2] valueCommitment;
}

interface IMasp {
    event NewCommitment(
        uint256 indexed commitment,
        uint256 indexed index,
        bytes encryptedOutput
    );

    event NewBridgeout(
        uint256[2] valueCommitment,
        bytes encryptedOutput,
        uint256 chainId,
        address destination
    );

    event NewNullifier(uint256 indexed nullifier);

    function transact(
        Spend[] calldata _spends,
        Output[] calldata _outputs,
        BridgeOut[] calldata _bridgeOuts,
        BridgeIn[] calldata _bridgeIns,
        uint256 _extAssetHash,
        int256 _extAmount,
        uint256[2] calldata _bpk,
        uint256 _root,
        uint256[2] calldata _R,
        uint256 _s,
        bytes calldata _hash
    ) external;
}
