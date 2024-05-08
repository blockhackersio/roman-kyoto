// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import {SpendVerifier} from "./verifiers/SpendVerifier.sol";
import {OutputVerifier} from "./verifiers/OutputVerifier.sol";
import {IMasp, SpendProof, OutputProof} from "./interfaces/IMasp.sol";
import {MerkleTreeWithHistory} from "./MerkleTreeWithHistory.sol";

import "./EdOnBN254.sol";

contract MultiAssetShieldedPool is MerkleTreeWithHistory {
    using EdOnBN254 for *;

    SpendVerifier public spendVerifier;
    OutputVerifier public outputVerifier;

    mapping(uint256 => bool) public nullifierHashes;

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
        EdOnBN254.Affine memory _valueBal,
        uint256 _root
    ) internal {
        require(isKnownRoot(bytes32(_root)), "Invalid merkle root");
        require(
            _outputProofs.length % 2 == 0,
            "outputs must be in multiples of 2"
        );

        for (uint i = 0; i < _spendProof.length; i++) {
            require(
                !isSpent(_spendProof[i].nullifier),
                "Input is already spent"
            );
        }

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
            spendVerify(spendProof.proof, [uint256(spendProof.nullifier)]);
        }

        for (uint j = 0; j < _outputProofs.length; j++) {
            OutputProof memory outputProof = _outputProofs[j];
            outputVerify(outputProof.proof, [uint256(outputProof.commitment)]);
        }

        for (uint i = 0; i < _spendProof.length; i++) {
            nullifierHashes[_spendProof[i].nullifier] = true;
        }

        for (uint i = 0; i < _outputProofs.length; i += 2) {
            _insert(
                bytes32(_outputProofs[i].commitment),
                bytes32(_outputProofs[i + 1].commitment)
            );
        }

        emit IMasp.NewCommitment(
            _outputProofs[0].commitment,
            nextIndex - 2,
            _outputProofs[0].encryptedOutput
        );

        emit IMasp.NewCommitment(
            _outputProofs[1].commitment,
            nextIndex - 1,
            _outputProofs[1].encryptedOutput
        );

        for (uint256 i = 0; i < _spendProof.length; i++) {
            emit IMasp.NewNullifier(_spendProof[i].nullifier);
        }
    }

    function _deposit(
        SpendProof[] memory _spendProof,
        OutputProof[] memory _outputProofs,
        uint[2] memory _bpk,
        uint256 _assetId,
        uint256 _depositAmount,
        uint256 _root
    ) internal {
        // this is the same as G * poseidon(asset) * value of asset being deposited
        EdOnBN254.Affine memory _valueBal = EdOnBN254
            .primeSubgroupGenerator()
            .mul(_assetId)
            .mul(_depositAmount)
            .neg();

        _transactCheck(_spendProof, _outputProofs, _bpk, _valueBal, _root);
    }

    function _withdraw(
        SpendProof[] memory _spendProof,
        OutputProof[] memory _outputProofs,
        uint[2] memory _bpk,
        uint256 _assetId,
        uint256 _withdrawAmount,
        uint256 _root
    ) internal {
        // this is the same as G * poseidon(asset) * value of asset being deposited
        EdOnBN254.Affine memory _valueBal = EdOnBN254
            .primeSubgroupGenerator()
            .mul(_assetId)
            .mul(_withdrawAmount);

        _transactCheck(_spendProof, _outputProofs, _bpk, _valueBal, _root);
    }

    function _transact(
        SpendProof[] memory _spendProof,
        OutputProof[] memory _outputProofs,
        uint[2] memory _bpk,
        uint256 _root
    ) internal {
        EdOnBN254.Affine memory _valueBal = EdOnBN254.zero();

        _transactCheck(_spendProof, _outputProofs, _bpk, _valueBal, _root);
    }

    function isSpent(uint256 _nullifierHash) public view returns (bool) {
        return nullifierHashes[_nullifierHash];
    }
}
