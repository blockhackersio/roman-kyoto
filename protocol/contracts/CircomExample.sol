// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import {MultiplierVerifier} from "./generated/multiplier.sol";
import {SpendVerifier} from "./generated/spend.sol";
import {OutputVerifier} from "./generated/output.sol";

contract CircomExample {
    SpendVerifier public spendVerifier;
    OutputVerifier public outputVerifier;

    constructor(address _spendVerifier, address _outputVerifier) payable {
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

    function spendVerify(bytes memory _proof, uint[1] memory _pubSignals) public view {
        (uint[2] memory a, uint[2][2] memory b, uint[2] memory c) = parseProof(
            _proof
        );
        require(spendVerifier.verifyProof(a, b, c, _pubSignals), "invalid proof");
    }

    function outputVerify(bytes memory _proof, uint[1] memory _pubSignals) public view {
        (uint[2] memory a, uint[2][2] memory b, uint[2] memory c) = parseProof(
            _proof
        );
        require(outputVerifier.verifyProof(a, b, c, _pubSignals), "invalid proof");
    }

    
}
