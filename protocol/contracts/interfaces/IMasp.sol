// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

struct TxData {
    bytes proof;
    uint256[] spendNullifier;
    uint256[][2] spendValueCommitment; // EC point
    uint256[] outputCommitment;
    uint256[][2] outputValueCommitment; // EC Point
    bytes[] outputEncryptedOutput;
    uint256[][2] bridgeInValueCommitment; // EC Point
    uint256[] bridgeOutChainId;
    address[] bridgeOutDestination;
    bytes[] bridgeOutEncryptedOutput;
    uint256[][2] bridgeOutValueCommitment; // EC Point
    uint256 extAssetHash;
    int256 extAmount;
    uint256[2] bpk;
    uint256 root;
    uint256[2] R;
    uint256 s;
    bytes hash;
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

    event NewCommitmentReceived(bytes32 indexed commitment);

    function transact(TxData calldata _txData) external;

    function receiveCommitments(bytes32 _commitment) external;
}
