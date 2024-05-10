// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import {SpendVerifier} from "./verifiers/SpendVerifier.sol";
import {OutputVerifier} from "./verifiers/OutputVerifier.sol";
import {IMasp, SpendProof, OutputProof, Bridge} from "./interfaces/IMasp.sol";
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

    function _sigVerify(
        uint256 _s,
        uint256[2] calldata _R,
        uint256[2] calldata _A,
        bytes calldata _message
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
        SpendProof[] calldata _spendProof,
        OutputProof[] calldata _outputProofs,
        bytes calldata _hash
    ) internal pure {
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
    }

    function _balanceCheck(
        SpendProof[] memory _spendProof,
        OutputProof[] memory _outputProofs,
        EdOnBN254.Affine memory _valueBal,
        uint[2] memory _bpk
    ) internal view {
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

        total = total.add(_valueBal.neg());

        require(
            total.x == _bpk[0] && total.y == _bpk[1],
            "Balance Check Failed"
        );
    }

    function _proofCheck(
        SpendProof[] memory _spendProof,
        OutputProof[] memory _outputProofs,
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
        SpendProof[] calldata _spendProof,
        OutputProof[] calldata _outputProofs,
        uint[2] calldata _bpk,
        uint256 _assetId,
        uint256 _depositAmount,
        uint256 _root,
        uint256[2] calldata _R,
        uint256 _s,
        bytes calldata _hash
    ) internal {
        _checkHash(_spendProof, _outputProofs, _hash);

        // Calculate the deposit value
        EdOnBN254.Affine memory _valueBal = EdOnBN254
            .primeSubgroupGenerator()
            .mul(_assetId)
            .mul(_depositAmount)
            .neg();

        _balanceCheck(_spendProof, _outputProofs, _valueBal, _bpk);

        _sigVerify(_s, _R, _bpk, _hash);

        _proofCheck(_spendProof, _outputProofs, _root);
    }

    function _withdraw(
        SpendProof[] calldata _spendProof,
        OutputProof[] calldata _outputProofs,
        uint256[2] calldata _bpk,
        uint256 _assetId,
        uint256 _withdrawAmount,
        uint256 _root,
        uint256[2] calldata _R,
        uint256 _s,
        bytes calldata _hash
    ) internal {
        _checkHash(_spendProof, _outputProofs, _hash);

        // Calculate the deposit value
        EdOnBN254.Affine memory _valueBal = EdOnBN254
            .primeSubgroupGenerator()
            .mul(_assetId)
            .mul(_withdrawAmount);

        _balanceCheck(_spendProof, _outputProofs, _valueBal, _bpk);

        _sigVerify(_s, _R, _bpk, _hash);

        _proofCheck(_spendProof, _outputProofs, _root);
    }

    function _bridge(
        SpendProof[] calldata _spendProof,
        OutputProof[] calldata _outputProofs,
        Bridge[] calldata _bridges,
        uint256[2] calldata _bpk,
        uint256 _root,
        uint256[2] calldata _R,
        uint256 _s,
        bytes calldata _hash
    ) internal {
        _checkHash(_spendProof, _outputProofs, _hash);

        // external balance is 0
        EdOnBN254.Affine memory _valueBal = EdOnBN254.zero();

        _balanceCheck(_spendProof, _outputProofs, _valueBal, _bpk);

        _sigVerify(_s, _R, _bpk, _hash);

        _proofCheck(_spendProof, _outputProofs, _root);
    }

    function _transact(
        SpendProof[] calldata _spendProof,
        OutputProof[] calldata _outputProofs,
        uint[2] calldata _bpk,
        uint256 _root,
        uint256[2] calldata _R,
        uint256 _s,
        bytes calldata _hash
    ) internal {
        _checkHash(_spendProof, _outputProofs, _hash);

        // external balance is 0
        EdOnBN254.Affine memory _valueBal = EdOnBN254.zero();

        _balanceCheck(_spendProof, _outputProofs, _valueBal, _bpk);

        _sigVerify(_s, _R, _bpk, _hash);

        _proofCheck(_spendProof, _outputProofs, _root);
    }

    function isSpent(uint256 _nullifierHash) public view returns (bool) {
        return nullifierHashes[_nullifierHash];
    }
}
