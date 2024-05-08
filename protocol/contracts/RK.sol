// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@chainlink/contracts-ccip/src/v0.8/ccip/interfaces/IRouterClient.sol";
import "@chainlink/contracts-ccip/src/v0.8/ccip/applications/CCIPReceiver.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./MultiAssetShieldedPool.sol";

contract RK is MultiAssetShieldedPool, CCIPReceiver {
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

    address owner;

    constructor(
        address _spendVerifier,
        address _outputVerifier,
        address _merkleHasher,
        address _router,
        address[] memory _allowlistedRemotes,
        uint64[] memory _allowlistedChains
    )
        MultiAssetShieldedPool(_spendVerifier, _outputVerifier, _merkleHasher)
        CCIPReceiver(_router)
    {
        router = IRouterClient(_router);

        // set all of our allowed remotes on chains
        for (uint256 i = 0; i < _allowlistedChains.length; i++) {
            allowedRemotes[
                keccak256(
                    abi.encode(_allowlistedRemotes[i], _allowlistedChains[i])
                )
            ] = true;
        }

        owner = msg.sender;
    }

    function _enforceOwner() internal view {
        require(msg.sender == owner, "Only owner can call this function");
    }

    function allowlistChain(uint64 _chainId, bool _allowed) external {
        _enforceOwner();
        allowlistedChains[_chainId] = _allowed;
    }

    function updateAllowlistDestinationChain(
        address _remoteAddress,
        uint64 _chainId,
        bool _allowed
    ) external {
        _enforceOwner();
        allowedRemotes[
            keccak256(abi.encode(_remoteAddress, _chainId))
        ] = _allowed;
    }

    function updateGasLimit(uint256 _gasLimit) external {
        _enforceOwner();
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
    }

    struct SupportedAsset {
        uint256 assetId;
        address assetAddress;
        uint8 decimals;
    }

    mapping(uint256 => SupportedAsset) public assetToAddress;

    function addSupportedAsset(
        uint256 _assetId,
        address _assetAddress,
        uint8 _decimals
    ) external {
        _enforceOwner();
        assetToAddress[_assetId] = SupportedAsset(
            _assetId,
            _assetAddress,
            _decimals
        );
    }

    function deposit(
        SpendProof[] memory _spendProof,
        OutputProof[] memory _outputProofs,
        uint[2] memory _bpk,
        uint256 _assetId,
        uint256 _depositAmount,
        uint256 _root
    ) external {
        // transfer the users asset to this address
        SupportedAsset memory _asset = assetToAddress[_assetId];
        require(_asset.assetAddress != address(0), "Asset not supported");

        // transfer the asset to this contract
        IERC20(_asset.assetAddress).transferFrom(
            msg.sender,
            address(this),
            _depositAmount
        );

        // call our deposit function (the proofs are verified in this function)
        _deposit(
            _spendProof,
            _outputProofs,
            _bpk,
            _assetId,
            _depositAmount,
            _root
        );
    }

    function withdraw(
        SpendProof[] memory _spendProof,
        OutputProof[] memory _outputProofs,
        uint[2] memory _bpk,
        uint256 _assetId,
        uint256 _withdrawAmount,
        uint256 _root
    ) external {
        SupportedAsset memory _asset = assetToAddress[_assetId];
        require(_asset.assetAddress != address(0), "Asset not supported");

        _withdraw(
            _spendProof,
            _outputProofs,
            _bpk,
            _assetId,
            _withdrawAmount,
            _root
        );

        // transfer the asset to this contract
        IERC20(_asset.assetAddress).transfer(msg.sender, _withdrawAmount);
    }
}
