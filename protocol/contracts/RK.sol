// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@chainlink/contracts-ccip/src/v0.8/ccip/interfaces/IRouterClient.sol";
import "@chainlink/contracts-ccip/src/v0.8/ccip/applications/CCIPReceiver.sol";

import "./CircomExample.sol";

contract RK is CircomExample, CCIPReceiver {
    /// Chainlink CCIP Router Address - used to send messages across chains
    IRouterClient public immutable router;

    // hash of address + chain id to t/f to determine if this address is allowed to send
    mapping(bytes32 => bool) allowedRemotes;

    // list of allowed remote chain ids (used for receiving messages)
    mapping(uint64 => bool) allowedChainIds;

    // list of allowed destination chain ids (handy for UX)
    mapping(uint64 chainId => bool enabled) private allowlistedChains;

    // gas limit for CCIP message (TODO investigate more about this value)
    uint256 gasLimit = 800_000;

    // error and modifier used when sending to remote chain
    error DestinationChainNotAllowlisted(uint64 destinationChainSelector);
    modifier onlyAllowlistedDestinationChain(uint64 destinationChainSelector) {
        if (!allowlistedChains[destinationChainSelector])
            revert DestinationChainNotAllowlisted(destinationChainSelector);
        _;
    }

    // checks to see if the contract sending a message from another network is allowed to send to this contract
    modifier onlyAllowlistedSourceChain(
        uint64 _sourceChainSelector,
        address _sender
    ) {
        require(
            allowedRemotes[
                keccak256(abi.encode(_sender, _sourceChainSelector))
            ],
            "Source Chain not allowed"
        );
        _;
    }

    constructor(
        address _spendVerifier,
        address _outputVerifier,
        address _router,
        address[] memory _allowlistedRemotes,
        uint64[] memory _allowlistedChains
    ) CircomExample(_spendVerifier, _outputVerifier) CCIPReceiver(_router) {
        router = IRouterClient(_router);

        // set all of our allowed remotes on chains
        for (uint256 i = 0; i < _allowlistedChains.length; i++) {
            allowedRemotes[
                keccak256(
                    abi.encode(_allowlistedRemotes[i], _allowlistedChains[i])
                )
            ] = true;
        }
    }

    // TODO Guard
    function allowlistChain(uint64 _chainId, bool _allowed) external {
        allowlistedChains[_chainId] = _allowed;
    }

    // TODO Guard
    function updateAllowlistDestinationChain(
        address _remoteAddress,
        uint64 _chainId,
        bool _allowed
    ) external {
        allowedRemotes[
            keccak256(abi.encode(_remoteAddress, _chainId))
        ] = _allowed;
    }

    // TODO Guard
    function updateGasLimit(uint256 _gasLimit) external {
        gasLimit = _gasLimit;
    }

    // logic called when this contract receives a message from another chain through the CCIP router
    function _ccipReceive(
        Client.Any2EVMMessage memory any2EvmMessage
    )
        internal
        override
        onlyAllowlistedSourceChain(
            any2EvmMessage.sourceChainSelector,
            abi.decode(any2EvmMessage.sender, (address))
        )
    {
        // message received
        console.logBytes(any2EvmMessage.data);
    }
}
