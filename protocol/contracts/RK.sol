// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@chainlink/contracts-ccip/src/v0.8/ccip/interfaces/IRouterClient.sol";
import "@chainlink/contracts-ccip/src/v0.8/ccip/applications/CCIPReceiver.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./MultiAssetShieldedPool.sol";

contract RK is IMasp, MultiAssetShieldedPool {
    address owner;

    constructor(
        address _spendVerifier,
        address _outputVerifier,
        address _merkleHasher
    ) MultiAssetShieldedPool(_spendVerifier, _outputVerifier, _merkleHasher) {
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

    function transact(
        Spend[] calldata _spends,
        Output[] calldata _outputs,
        BridgeIn[] calldata _bridgeIns,
        BridgeOut[] calldata _bridgeOuts,
        uint256 _extAssetHash,
        int256 _extAmount,
        uint256[2] calldata _bpk,
        uint256 _root,
        uint256[2] calldata _R,
        uint256 _s,
        bytes calldata _hash
    ) external {
        if (_extAmount > 0) {
            SupportedAsset memory _asset = assetToAddress[_extAssetHash];
            require(_asset.assetAddress != address(0), "Asset not supported");

            // transfer the asset to this contract
            IERC20(_asset.assetAddress).transferFrom(
                msg.sender,
                address(this),
                uint256(_extAmount)
            );
        }

        _transact(
            _spends,
            _outputs,
            _bridgeIns,
            _bridgeOuts,
            _extAssetHash,
            _extAmount,
            _bpk,
            _root,
            _R,
            _s,
            _hash
        );

        if (_extAmount < 0) {
            SupportedAsset memory _asset = assetToAddress[_extAssetHash];
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
