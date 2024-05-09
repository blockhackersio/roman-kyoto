// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@chainlink/contracts-ccip/src/v0.8/ccip/interfaces/IRouterClient.sol";
import "@chainlink/contracts-ccip/src/v0.8/ccip/applications/CCIPReceiver.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./MultiAssetShieldedPool.sol";

contract RK is MultiAssetShieldedPool {
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

    function deposit(
        SpendProof[] memory _spendProof,
        OutputProof[] memory _outputProofs,
        uint256[2] memory _bpk,
        uint256 _assetId,
        uint256 _depositAmount,
        uint256 _root,
        uint256[2] memory _R,
        uint256 _s,
        bytes memory _hash
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
            _root,
            _R,
            _s,
            _hash
        );
    }

    function withdraw(
        SpendProof[] memory _spendProof,
        OutputProof[] memory _outputProofs,
        uint[2] memory _bpk,
        uint256 _assetId,
        uint256 _withdrawAmount,
        uint256 _root,
        uint256[2] memory _R,
        uint256 _s,
        bytes memory _hash
    ) external {
        SupportedAsset memory _asset = assetToAddress[_assetId];
        require(_asset.assetAddress != address(0), "Asset not supported");

        _withdraw(
            _spendProof,
            _outputProofs,
            _bpk,
            _assetId,
            _withdrawAmount,
            _root,
            _R,
            _s,
            _hash
        );

        // transfer the asset to this contract
        IERC20(_asset.assetAddress).transfer(msg.sender, _withdrawAmount);
    }

    function transact(
        SpendProof[] memory _spendProof,
        OutputProof[] memory _outputProofs,
        uint[2] memory _bpk,
        uint256 _root,
        uint256[2] memory _R,
        uint256 _s,
        bytes memory _hash
    ) external {
        _transact(_spendProof, _outputProofs, _bpk, _root, _R, _s, _hash);
    }
}
