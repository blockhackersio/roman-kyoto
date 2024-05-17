// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import {SpendVerifier} from "./verifiers/SpendVerifier.sol";
import {OutputVerifier} from "./verifiers/OutputVerifier.sol";
import {BridgeoutVerifier} from "./verifiers/BridgeoutVerifier.sol";
import {TxVerifier} from "./verifiers/TxVerifier.sol";
import {IMasp, TxData} from "./interfaces/IMasp.sol";
import {MerkleTreeWithHistory} from "./MerkleTreeWithHistory.sol";

import "./EdOnBN254.sol";
import "hardhat/console.sol";

contract MultiAssetShieldedPool is MerkleTreeWithHistory {
    using EdOnBN254 for *;

    enum ValueCommitmentState {
        INIT,
        RECEIVED,
        CLAIMED
    }

    TxVerifier public txVerifier;

    mapping(uint256 => bool) public nullifierHashes;
    mapping(bytes32 => ValueCommitmentState) public receivedCommitments;

    constructor(
        address _txVerifier,
        address _hasher
    ) MerkleTreeWithHistory(5, _hasher) {
        txVerifier = TxVerifier(_txVerifier);
        _initialize();
    }

    function parseProof(
        bytes memory data
    )
        internal
        pure
        returns (uint[2] memory a, uint[2][2] memory b, uint[2] memory c)
    {
        (a[0], a[1], b[0][0], b[0][1], b[1][0], b[1][1], c[0], c[1]) = abi
            .decode(data, (uint, uint, uint, uint, uint, uint, uint, uint));
    }

    // function spendVerify(
    //     bytes memory _proof,
    //     uint[1] memory _pubSignals
    // ) public view {
    //     (uint[2] memory a, uint[2][2] memory b, uint[2] memory c) = parseProof(
    //         _proof
    //     );
    //     require(
    //         spendVerifier.verifyProof(a, b, c, _pubSignals),
    //         "invalid proof"
    //     );
    // }

    // function outputVerify(
    //     bytes memory _proof,
    //     uint[1] memory _pubSignals
    // ) public view {
    //     (uint[2] memory a, uint[2][2] memory b, uint[2] memory c) = parseProof(
    //         _proof
    //     );
    //     require(
    //         outputVerifier.verifyProof(a, b, c, _pubSignals),
    //         "invalid proof"
    //     );
    // }

    function txVerify(
        bytes memory _proof,
        uint[4] memory _pubSignals
    ) public view {
        (uint[2] memory a, uint[2][2] memory b, uint[2] memory c) = parseProof(
            _proof
        );
        require(txVerifier.verifyProof(a, b, c, _pubSignals), "invalid proof");
    }

    function _getBytecodeHash(address _address) public view returns (bytes32) {
        bytes32 codeHash;
        assembly {
            codeHash := extcodehash(_address)
        }
        return codeHash;
    }

    function _receiveCommitments(bytes32 _commitment) internal {
        require(
            receivedCommitments[_commitment] == ValueCommitmentState.INIT,
            "received commitments must be in the IDLE state"
        );
        require(
            _getBytecodeHash(address(this)) == _getBytecodeHash(msg.sender),
            "bad sender"
        );

        receivedCommitments[_commitment] = ValueCommitmentState.RECEIVED;
        emit IMasp.NewCommitmentReceived(_commitment);
    }

    // function bridgeoutVerify(
    //     bytes memory _proof,
    //     uint[2] memory _pubSignals
    // ) public view {
    //     (uint[2] memory a, uint[2][2] memory b, uint[2] memory c) = parseProof(
    //         _proof
    //     );
    //     require(
    //         bridgeoutVerifier.verifyProof(a, b, c, _pubSignals),
    //         "invalid bridgeout proof"
    //     );
    // }

    struct RedDSASignature {
        bytes32 s;
        bytes32 R;
    }

    function _sigVerify(
        uint256 _s,
        uint256[2] memory _R,
        uint256[2] memory _A,
        bytes memory _message
    ) internal view {
        EdOnBN254.Affine memory _BASE = EdOnBN254.Affine(
            6822643173076850086669063981200675861034234425876310494228829770726075732893,
            9156654395656950371299901424185770236726741503478930161752204964343448620279
        );
        EdOnBN254.Affine memory _Rp = EdOnBN254.Affine(_R[0], _R[1]);
        EdOnBN254.Affine memory _Ap = EdOnBN254.Affine(_A[0], _A[1]);
        bytes memory data = abi.encode(_Rp.x, _Rp.y, _Ap.x, _Ap.y, _message);
        uint256 _c = uint256(keccak256(data)) % EdOnBN254.N;
        EdOnBN254.Affine memory _Z = _BASE.neg().mul(_s).add(_Rp).add(
            _Ap.mul(_c)
        );

        require(_Z.x == 0, "signature is not valid");
    }

    function _checkHash(
        uint256[] memory _spendNullifier,
        uint256[] memory _outputCommitment,
        uint256[][2] memory _outputValueCommitment,
        uint256[][2] memory _spendValueCommitment,
        bytes memory _hash
    ) internal pure {
        uint256[] memory _valueCommitments = new uint256[](
            _spendValueCommitment.length * 2 + _outputValueCommitment.length * 2
        );

        uint256 vcIndex = 0;
        for (uint256 i = 0; i < _spendValueCommitment.length; i++) {
            _valueCommitments[vcIndex++] = _spendValueCommitment[i][0];
            _valueCommitments[vcIndex++] = _spendValueCommitment[i][1];
        }

        for (uint256 i = 0; i < _outputValueCommitment.length; i++) {
            _valueCommitments[vcIndex++] = _outputValueCommitment[i][0];
            _valueCommitments[vcIndex++] = _outputValueCommitment[i][1];
        }

        require(
            keccak256(
                abi.encodePacked(
                    _spendNullifier,
                    _outputCommitment,
                    _valueCommitments
                )
            ) == bytes32(_hash),
            "Hashes must match"
        );
    }

    function _balanceCheck(
        uint256[2][] calldata _spendValueCommitment,
        uint256[2][] calldata _outputValueCommitment,
        uint256[2][] calldata _bridgeInValueCommitment,
        uint256[2][] calldata _bridgeOutValueCommitment,
        EdOnBN254.Affine memory _extValueBase,
        EdOnBN254.Affine memory _bindingPubkey,
        int256 _extAmount
    ) internal view {
        // Sum up ins and outs
        EdOnBN254.Affine memory _insTotal = EdOnBN254.zero();
        EdOnBN254.Affine memory _outsTotal = EdOnBN254.zero();
        EdOnBN254.Affine memory _bridgeInsTotal = EdOnBN254.zero();
        EdOnBN254.Affine memory _bridgeOutsTotal = EdOnBN254.zero();

        for (uint i = 0; i < _spendValueCommitment.length; i++) {
            uint256[2] memory vc = _spendValueCommitment[i];
            _insTotal = _insTotal.add(EdOnBN254.Affine(vc[0], vc[1]));
        }

        for (uint i = 0; i < _outputValueCommitment.length; i++) {
            uint256[2] memory vc = _outputValueCommitment[i];
            _outsTotal = _outsTotal.add(EdOnBN254.Affine(vc[0], vc[1]));
        }

        for (uint i = 0; i < _bridgeOutValueCommitment.length; i++) {
            uint256[2] memory vc = _bridgeOutValueCommitment[i];
            _bridgeOutsTotal = _bridgeOutsTotal.add(
                EdOnBN254.Affine(vc[0], vc[1]).neg()
            );
        }

        for (uint i = 0; i < _bridgeInValueCommitment.length; i++) {
            bytes32 _received = keccak256(
                abi.encode(_bridgeInValueCommitment[i])
            );
            require(
                receivedCommitments[_received] == ValueCommitmentState.RECEIVED,
                "value commitment has not been received!"
            );
            _bridgeInsTotal = _bridgeInsTotal.add(
                EdOnBN254
                    .Affine(
                        _bridgeInValueCommitment[i][0],
                        _bridgeInValueCommitment[i][1]
                    )
                    .neg()
            );
        }

        EdOnBN254.Affine memory _ext;
        if (_extAmount < 0) {
            require(
                uint256(-_extAmount) <= EdOnBN254.N,
                "Value must not be greater than n"
            );
        } else {
            require(
                uint256(_extAmount) <= EdOnBN254.N,
                "Value must not be greater than n"
            );
        }

        if (_extAmount == 0) {
            _ext = EdOnBN254.zero();
        } else {
            _ext = _extValueBase.mul(
                _extAmount < 0
                    ? (EdOnBN254.N - uint256(-_extAmount)) % EdOnBN254.N
                    : (uint256(_extAmount) % EdOnBN254.N)
            );
        }

        EdOnBN254.Affine memory total = _insTotal
            .add(_outsTotal.neg())
            .add(_bridgeOutsTotal)
            .add(_bridgeInsTotal.neg())
            .add(_ext);

        require(
            total.x == _bindingPubkey.x && total.y == _bindingPubkey.y,
            "Balance Check Failed"
        );
    }

    function _proofCheck(
        uint256[] memory _spendNullifier,
        uint256[] memory _outputCommitment,
        bytes[] memory _outputEncryptedOutput,
        uint256[2][] calldata _bridgeInValueCommitment,
        uint256[2][] calldata _bridgeOutValueCommitment,
        address[] memory _bridgeOutDestination,
        bytes[] memory _bridgeOutEncryptedOutput,
        uint256[] memory _bridgeOutChainId,
        bytes memory _proof,
        uint256 _root
    ) internal {
        uint256 _len = _spendNullifier.length;
        for (uint i = 0; i < _len; i++) {
            require(!isSpent(_spendNullifier[i]), "Input is already spent");
        }

        txVerify(
            _proof,
            [
                _spendNullifier[0],
                _spendNullifier[1],
                _outputCommitment[0],
                _outputCommitment[1]
            ]
        );

        for (uint i = 0; i < _outputCommitment.length; i += 2) {
            _insert(
                bytes32(_outputCommitment[i]),
                bytes32(_outputCommitment[i + 1])
            );
        }

        for (uint i = 0; i < _bridgeInValueCommitment.length; i++) {
            receivedCommitments[
                keccak256(abi.encode(_bridgeInValueCommitment[i]))
            ] = ValueCommitmentState.CLAIMED;
        }

        for (uint i = 0; i < _bridgeOutValueCommitment.length; i++) {
            // TODO: verify value commitment proof for bridge tx
            //       currently this was not working need to investigate why...
            // bridgeoutVerify(
            //     _bridgeOuts[j].proof,
            //     _bridgeOuts[j].valueCommitment
            // );
            require(
                _getBytecodeHash(_bridgeOutDestination[i]) ==
                    _getBytecodeHash(address(this)),
                "destination contract is invalid"
            );
            IMasp(_bridgeOutDestination[i]).receiveCommitments(
                keccak256(abi.encode(_bridgeOutValueCommitment[i]))
            );
        }

        emit IMasp.NewCommitment(
            _outputCommitment[0],
            nextIndex - 2,
            _outputEncryptedOutput[0]
        );

        emit IMasp.NewCommitment(
            _outputCommitment[1],
            nextIndex - 1,
            _outputEncryptedOutput[1]
        );

        for (uint256 i = 0; i < _bridgeOutValueCommitment.length; i++) {
            emit IMasp.NewBridgeout(
                _bridgeOutValueCommitment[i],
                _bridgeOutEncryptedOutput[i],
                _bridgeOutChainId[i],
                _bridgeOutDestination[i]
            );
        }

        for (uint256 i = 0; i < _spendNullifier.length; i++) {
            emit IMasp.NewNullifier(_spendNullifier[i]);
        }
    }

    function _transact(TxData calldata _txData) internal {
        require(isKnownRoot(bytes32(_txData.root)), "Invalid merkle root");
        require(_txData.outputCommitment.length == 2, "outputs must be 2");

        require(_txData.spendNullifier.length == 2, "spend must be 2");

        _checkHash(
            _txData.spendNullifier,
            _txData.outputCommitment,
            _txData.outputValueCommitment,
            _txData.spendValueCommitment,
            _txData.hash
        );

        EdOnBN254.Affine memory _bindingPubkey = EdOnBN254.Affine(
            _txData.bpk[0],
            _txData.bpk[1]
        );

        EdOnBN254.Affine memory _extValueBase = EdOnBN254
            .primeSubgroupGenerator()
            .mul(_txData.extAssetHash);

        _balanceCheck(
            _txData.spendValueCommitment,
            _txData.outputValueCommitment,
            _txData.bridgeInValueCommitment,
            _txData.bridgeOutValueCommitment,
            _extValueBase,
            _bindingPubkey,
            _txData.extAmount
        );

        _sigVerify(_txData.s, _txData.R, _txData.bpk, _txData.hash);

        _proofCheck(
            _txData.spendNullifier,
            _txData.outputCommitment,
            _txData.outputEncryptedOutput,
            _txData.bridgeInValueCommitment,
            _txData.bridgeOutValueCommitment,
            _txData.bridgeOutDestination,
            _txData.bridgeOutEncryptedOutput,
            _txData.bridgeOutChainId,
            _txData.proof,
            _txData.root
        );
    }

    function isSpent(uint256 _nullifierHash) public view returns (bool) {
        return nullifierHashes[_nullifierHash];
    }
}
