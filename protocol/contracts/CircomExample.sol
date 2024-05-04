// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import {MultiplierVerifier} from "./generated/multiplier.sol";
import {SpendVerifier} from "./generated/spend.sol";
import {OutputVerifier} from "./generated/output.sol";

import {MerkleTreeWithHistory} from "./MerkleTreeWithHistory.sol";

import "./EdOnBN254.sol";

import "hardhat/console.sol";

contract CircomExample is MerkleTreeWithHistory {
    using EdOnBN254 for *;

    SpendVerifier public spendVerifier;
    OutputVerifier public outputVerifier;

    struct SpendProof {
        bytes proof;
        uint nullifier;
        uint[2] valueCommitment;
    }

    struct OutputProof {
        bytes proof;
        uint commitment;
        uint[2] valueCommitment;
    }

    constructor(
        address _spendVerifier,
        address _outputVerifier,
        bytes memory _hasherBytecode
    ) MerkleTreeWithHistory(5, _hasherBytecode) {
        spendVerifier = SpendVerifier(_spendVerifier);
        outputVerifier = OutputVerifier(_outputVerifier);
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

    struct RedDSASignature {
        bytes32 s;
        bytes32 R;
    }

    function sigVerify(
        uint256 _s,
        uint256[2] memory _R,
        uint256[2] memory _A,
        bytes memory _message
    ) public view {
        EdOnBN254.Affine memory _Rp = EdOnBN254.Affine(_R[0], _R[1]);
        EdOnBN254.Affine memory _Ap = EdOnBN254.Affine(_A[0], _A[1]);
        bytes memory data = abi.encode(_Rp.x, _Rp.y, _Ap.x, _Ap.y, _message);

        uint256 _c = uint256(keccak256(data)) % EdOnBN254.N;
        EdOnBN254.Affine memory _Z = EdOnBN254
            .primeSubgroupGenerator()
            .neg()
            .mul(_s)
            .add(_Rp)
            .add(_Ap.mul(_c));

        require(_Z.x == 0, "signature is not valid");
    }

    function _transactCheck(
        SpendProof[] memory _spendProof,
        OutputProof[] memory _outputProofs,
        uint[2] memory _bpk,
        EdOnBN254.Affine memory _valueBal
    ) public view {
        EdOnBN254.Affine memory total = EdOnBN254.zero();

        for (uint i = 0; i < _spendProof.length; i++) {
            SpendProof memory spendProof = _spendProof[i];
            total = total.add(
                EdOnBN254.Affine(
                    spendProof.valueCommitment[0],
                    spendProof.valueCommitment[1]
                )
            );
        }

        for (uint j = 0; j < _outputProofs.length; j++) {
            OutputProof memory outputProof = _outputProofs[j];
            total = total.add(
                EdOnBN254
                    .Affine(
                        outputProof.valueCommitment[0],
                        outputProof.valueCommitment[1]
                    )
                    .neg()
            );
        }

        require(
            total.add(_valueBal.neg()).x == _bpk[0] &&
                total.add(_valueBal.neg()).y == _bpk[1],
            "Sum of values is incorrect"
        );

        for (uint i = 0; i < _spendProof.length; i++) {
            SpendProof memory spendProof = _spendProof[i];
            spendVerify(spendProof.proof, [spendProof.nullifier]);
        }

        for (uint j = 0; j < _outputProofs.length; j++) {
            OutputProof memory outputProof = _outputProofs[j];
            outputVerify(outputProof.proof, [outputProof.commitment]);
        }
    }

    function deposit(
        SpendProof[] memory _spendProof,
        OutputProof[] memory _outputProofs,
        uint[2] memory _bpk,
        uint256 _assetId,
        uint256 _depositAmount
    ) public view {
        // this is the same as G * poseidon(asset) * value of asset being deposited
        EdOnBN254.Affine memory _valueBal = EdOnBN254
            .primeSubgroupGenerator()
            .mul(_assetId)
            .mul(_depositAmount)
            .neg();

        _transactCheck(_spendProof, _outputProofs, _bpk, _valueBal);

        // Insert all leaves except the last one using pairs as usual
        for (uint i = 0; i < _outputProofs.length - 1; i += 2) {
            _insert(
                bytes32(_outputProofs[i].commitment),
                bytes32(_outputProofs[i + 1].commitment)
            );
        }

        if (_outputProofs.length % 2 != 0) {
            _insert(
                bytes32(_outputProofs[_outputProofs.length - 1].commitment),
                bytes32(ZERO_VALUE)
            );
        }
    }

    function transact(
        SpendProof[] memory _spendProof,
        OutputProof[] memory _outputProofs,
        uint[2] memory _bpk
    ) public view {
        EdOnBN254.Affine memory _valueBal = EdOnBN254.zero();

        _transactCheck(_spendProof, _outputProofs, _bpk, _valueBal);
    }
}
