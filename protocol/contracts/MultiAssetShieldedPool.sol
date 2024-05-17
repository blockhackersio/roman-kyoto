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

    SpendVerifier public spendVerifier;
    OutputVerifier public outputVerifier;
    BridgeoutVerifier public bridgeoutVerifier;
    TxVerifier public txVerifier;

    mapping(uint256 => bool) public nullifierHashes;
    mapping(bytes32 => ValueCommitmentState) public receivedCommitments;

    constructor(
        address _spendVerifier,
        address _outputVerifier,
        address _hasher
    ) MerkleTreeWithHistory(5, _hasher) {
        spendVerifier = SpendVerifier(_spendVerifier);
        outputVerifier = OutputVerifier(_outputVerifier);
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

    function spendVerify(
        bytes memory _proof,
        uint[1] memory _pubSignals
    ) public view {
        (uint[2] memory a, uint[2][2] memory b, uint[2] memory c) = parseProof(
            _proof
        );
        require(
            spendVerifier.verifyProof(a, b, c, _pubSignals),
            "invalid proof"
        );
    }

    function outputVerify(
        bytes memory _proof,
        uint[1] memory _pubSignals
    ) public view {
        (uint[2] memory a, uint[2][2] memory b, uint[2] memory c) = parseProof(
            _proof
        );
        require(
            outputVerifier.verifyProof(a, b, c, _pubSignals),
            "invalid proof"
        );
    }

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

    function bridgeoutVerify(
        bytes memory _proof,
        uint[2] memory _pubSignals
    ) public view {
        (uint[2] memory a, uint[2][2] memory b, uint[2] memory c) = parseProof(
            _proof
        );
        require(
            bridgeoutVerifier.verifyProof(a, b, c, _pubSignals),
            "invalid bridgeout proof"
        );
    }

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
            _valueCommitments[vcIndex++] = _outputValueCommitment[0];
            _valueCommitments[vcIndex++] = _outputValueCommitment[1];
        }

        require(
            keccak256(
                abi.encodePacked(
                    _spendNullifiers,
                    _outputCommitments,
                    _valueCommitments
                )
            ) == bytes32(_hash),
            "Hashes must match"
        );
    }

    function _balanceCheck(
        Spend[] memory _ins,
        Output[] memory _outs,
        BridgeIn[] memory _bridgeIns,
        BridgeOut[] memory _bridgeOuts,
        EdOnBN254.Affine memory _extValueBase,
        EdOnBN254.Affine memory _bindingPubkey,
        int256 _extAmount
    ) internal view {
        // Sum up ins and outs
        EdOnBN254.Affine memory _insTotal = EdOnBN254.zero();
        EdOnBN254.Affine memory _outsTotal = EdOnBN254.zero();
        EdOnBN254.Affine memory _bridgeInsTotal = EdOnBN254.zero();
        EdOnBN254.Affine memory _bridgeOutsTotal = EdOnBN254.zero();

        for (uint i = 0; i < _ins.length; i++) {
            uint256[2] memory vc = _ins[i].valueCommitment;
            _insTotal = _insTotal.add(EdOnBN254.Affine(vc[0], vc[1]));
        }

        for (uint i = 0; i < _outs.length; i++) {
            uint256[2] memory vc = _outs[i].valueCommitment;
            _outsTotal = _outsTotal.add(EdOnBN254.Affine(vc[0], vc[1]));
        }

        for (uint i = 0; i < _bridgeOuts.length; i++) {
            uint256[2] memory vc = _bridgeOuts[i].valueCommitment;
            _bridgeOutsTotal = _bridgeOutsTotal.add(
                EdOnBN254.Affine(vc[0], vc[1]).neg()
            );
        }

        for (uint i = 0; i < _bridgeIns.length; i++) {
            bytes32 _received = keccak256(
                abi.encode(_bridgeIns[i].valueCommitment)
            );
            require(
                receivedCommitments[_received] == ValueCommitmentState.RECEIVED,
                "value commitment has not been received!"
            );
            _bridgeInsTotal = _bridgeInsTotal.add(
                EdOnBN254
                    .Affine(
                        _bridgeIns[i].valueCommitment[0],
                        _bridgeIns[i].valueCommitment[1]
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
        Spend[] memory _spends,
        Output[] memory _outputs,
        BridgeIn[] memory _bridgeIns,
        BridgeOut[] memory _bridgeOuts,
        uint256 _root
    ) internal {
        require(isKnownRoot(bytes32(_root)), "Invalid merkle root");
        require(_outputs.length % 2 == 0, "outputs must be in multiples of 2");

        for (uint i = 0; i < _spends.length; i++) {
            require(!isSpent(_spends[i].nullifier), "Input is already spent");
        }

        for (uint i = 0; i < _spends.length; i++) {
            spendVerify(_spends[i].proof, [uint256(_spends[i].nullifier)]);
        }

        for (uint j = 0; j < _outputs.length; j++) {
            outputVerify(_outputs[j].proof, [uint256(_outputs[j].commitment)]);
        }

        for (uint i = 0; i < _spends.length; i++) {
            nullifierHashes[_spends[i].nullifier] = true;
        }

        for (uint i = 0; i < _outputs.length; i += 2) {
            _insert(
                bytes32(_outputs[i].commitment),
                bytes32(_outputs[i + 1].commitment)
            );
        }

        for (uint i = 0; i < _bridgeIns.length; i++) {
            receivedCommitments[
                keccak256(abi.encode(_bridgeIns[i].valueCommitment))
            ] = ValueCommitmentState.CLAIMED;
        }

        for (uint i = 0; i < _bridgeOuts.length; i++) {
            // TODO: verify value commitment proof for bridge tx
            //       currently this was not working need to investigate why...
            // bridgeoutVerify(
            //     _bridgeOuts[j].proof,
            //     _bridgeOuts[j].valueCommitment
            // );
            require(
                _getBytecodeHash(_bridgeOuts[i].destination) ==
                    _getBytecodeHash(address(this)),
                "destination contract is invalid"
            );
            IMasp(_bridgeOuts[i].destination).receiveCommitments(
                keccak256(abi.encode(_bridgeOuts[i].valueCommitment))
            );
        }

        emit IMasp.NewCommitment(
            _outputs[0].commitment,
            nextIndex - 2,
            _outputs[0].encryptedOutput
        );

        emit IMasp.NewCommitment(
            _outputs[1].commitment,
            nextIndex - 1,
            _outputs[1].encryptedOutput
        );

        for (uint256 i = 0; i < _bridgeOuts.length; i++) {
            emit IMasp.NewBridgeout(
                _bridgeOuts[i].valueCommitment,
                _bridgeOuts[i].encryptedOutput,
                _bridgeOuts[i].chainId,
                _bridgeOuts[i].destination
            );
        }

        for (uint256 i = 0; i < _spends.length; i++) {
            emit IMasp.NewNullifier(_spends[i].nullifier);
        }
    }

    function _transact(TxData calldata _txData) internal {
        _checkHash(
            _txData.spendNullifier,
            _txData.outputCommitment,
            _txData.outputValueCommitment,
            _txData.spendValueCommitment,
            _hash
        );

        EdOnBN254.Affine memory _bindingPubkey = EdOnBN254.Affine(
            _txData.bpk[0],
            _txData.bpk[1]
        );

        EdOnBN254.Affine memory _extValueBase = EdOnBN254
            .primeSubgroupGenerator()
            .mul(_txData.extAssetHash);

        _balanceCheck(
            _spends,
            _outputs,
            _bridgeIns,
            _bridgeOuts,
            _extValueBase,
            _bindingPubkey,
            _extAmount
        );

        _sigVerify(_s, _R, _bpk, _hash);

        _proofCheck(_spends, _outputs, _bridgeIns, _bridgeOuts, _root);
    }

    function isSpent(uint256 _nullifierHash) public view returns (bool) {
        return nullifierHashes[_nullifierHash];
    }
}
