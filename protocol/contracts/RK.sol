// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@chainlink/contracts-ccip/src/v0.8/ccip/interfaces/IRouterClient.sol";
import "@chainlink/contracts-ccip/src/v0.8/ccip/applications/CCIPReceiver.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./MultiAssetShieldedPool.sol";
import {IMasp} from "./interfaces/IMasp.sol";

contract RK is IMasp, MultiAssetShieldedPool {
    address owner;

    constructor(
        address _txVerifier,
        address _merkleHasher
    ) MultiAssetShieldedPool(_txVerifier, _merkleHasher) {
        owner = msg.sender;
    }

    function _enforceOwner() internal view {
        require(msg.sender == owner, "Only owner can call this function");
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

    function transact(TxData calldata _txData) external {
        int256 _extAmount = _txData.extAmount;
        uint256 _extAssetHash = _txData.extAssetHash;
        SupportedAsset memory _asset = assetToAddress[_extAssetHash];

        if (_extAmount > 0) {
            require(
                _asset.assetAddress != address(0),
                "Asset not supported"
            );

            // transfer the asset to this contract
            IERC20(_asset.assetAddress).transferFrom(
                msg.sender,
                address(this),
                uint256(_extAmount)
            );
        }

        _transact(_txData);

        if (_extAmount < 0) {
            require(_asset.assetAddress != address(0), "Asset not supported");

            // transfer the asset to this contract
            IERC20(_asset.assetAddress).transfer(
                msg.sender,
                uint256(-_extAmount)
            );
        }
    }

    function receiveCommitments(bytes32 _commitment) external {
        _receiveCommitments(_commitment);
    }
}
