// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./CreatorVault.sol";
import "./SubscriberNFT.sol";

/**
 * @title SubscriptionFactory
 * @dev Factory contract for creating and managing creator vaults
 */
contract SubscriptionFactory is Ownable, ReentrancyGuard, Pausable {
    struct CreatorInfo {
        address vaultAddress;
        string name;
        string description;
        uint256 createdAt;
        bool isActive;
    }

    struct PlatformStats {
        uint256 totalCreators;
        uint256 activeCreators;
        uint256 totalVaults;
        uint256 totalSubscriptions;
        uint256 totalVolume;
    }

    // Platform fee (basis points, e.g., 250 = 2.5%)
    uint256 public platformFeeRate = 500;
    uint256 public constant MAX_FEE_RATE = 1000; // 10% max fee

    // Supported tokens
    mapping(address => bool) public supportedTokens;
    address[] public supportedTokensList;

    // Creator management
    mapping(address => CreatorInfo) public creators;
    mapping(address => address) public vaultToCreator;
    address[] public creatorsList;

    // Platform statistics
    PlatformStats public stats;

    // NFT contract for subscriber badges
    SubscriberNFT public subscriberNFT;

    // Events
    event CreatorRegistered(
        address indexed creator,
        address indexed vault,
        string name,
        string description
    );
    event CreatorDeactivated(address indexed creator, address indexed vault);
    event CreatorReactivated(address indexed creator, address indexed vault);
    event TokenAdded(address indexed token, string symbol);
    event TokenRemoved(address indexed token, string symbol);
    event PlatformFeeUpdated(uint256 oldFee, uint256 newFee);
    event SubscriptionCreated(
        address indexed vault,
        address indexed subscriber,
        uint256 tierId,
        uint256 amount
    );
    event PaymentWithdrawn(
        address indexed vault,
        address indexed creator,
        uint256 amount,
        address token
    );

    constructor(address initialOwner) Ownable(initialOwner) {
        // Deploy subscriber NFT contract
        subscriberNFT = new SubscriberNFT(address(this), "Subscriber Badge", "SUB");
    }

    /**
     * @dev Register a new creator and deploy their vault
     */
    function registerCreator(
        string calldata name,
        string calldata description,
        address[] calldata acceptedTokens
    ) external whenNotPaused nonReentrant returns (address vaultAddress) {
        require(bytes(name).length > 0, "Name cannot be empty");
        require(creators[msg.sender].vaultAddress == address(0), "Creator already registered");
        
        // Validate accepted tokens
        for (uint256 i = 0; i < acceptedTokens.length; i++) {
            require(supportedTokens[acceptedTokens[i]], "Token not supported");
        }

        // Deploy new creator vault
        CreatorVault vault = new CreatorVault(
            msg.sender,
            address(this),
            address(subscriberNFT),
            acceptedTokens
        );
        vaultAddress = address(vault);

        // Store creator info
        creators[msg.sender] = CreatorInfo({
            vaultAddress: vaultAddress,
            name: name,
            description: description,
            createdAt: block.timestamp,
            isActive: true
        });

        vaultToCreator[vaultAddress] = msg.sender;
        creatorsList.push(msg.sender);

        // Update stats
        stats.totalCreators++;
        stats.activeCreators++;
        stats.totalVaults++;

        emit CreatorRegistered(msg.sender, vaultAddress, name, description);
    }

    /**
     * @dev Deactivate a creator (emergency use)
     */
    function deactivateCreator(address creator) external onlyOwner {
        require(creators[creator].vaultAddress != address(0), "Creator not found");
        require(creators[creator].isActive, "Creator already deactivated");

        creators[creator].isActive = false;
        stats.activeCreators--;

        CreatorVault(payable(creators[creator].vaultAddress)).unpause();

        emit CreatorDeactivated(creator, creators[creator].vaultAddress);
    }

    /**
     * @dev Reactivate a creator
     */
    function reactivateCreator(address creator) external onlyOwner {
        require(creators[creator].vaultAddress != address(0), "Creator not found");
        require(!creators[creator].isActive, "Creator already active");

        creators[creator].isActive = true;
        stats.activeCreators++;

        CreatorVault(payable(creators[creator].vaultAddress)).unpause();

        emit CreatorReactivated(creator, creators[creator].vaultAddress);
    }

    /**
     * @dev Add supported token
     */
    function addSupportedToken(address token, string calldata symbol) external onlyOwner {
        require(token != address(0), "Invalid token address");
        require(!supportedTokens[token], "Token already supported");

        supportedTokens[token] = true;
        supportedTokensList.push(token);

        emit TokenAdded(token, symbol);
    }

    /**
     * @dev Remove supported token
     */
    function removeSupportedToken(address token, string calldata symbol) external onlyOwner {
        require(supportedTokens[token], "Token not supported");

        supportedTokens[token] = false;

        // Remove from array
        for (uint256 i = 0; i < supportedTokensList.length; i++) {
            if (supportedTokensList[i] == token) {
                supportedTokensList[i] = supportedTokensList[supportedTokensList.length - 1];
                supportedTokensList.pop();
                break;
            }
        }

        emit TokenRemoved(token, symbol);
    }

    /**
     * @dev Update platform fee rate
     */
    function setPlatformFeeRate(uint256 newFeeRate) external onlyOwner {
        require(newFeeRate <= 1000, "Max 10%");
        uint256 oldFee = platformFeeRate;
        platformFeeRate = newFeeRate;
        emit PlatformFeeUpdated(oldFee, newFeeRate);
    }

    /**
     * @dev Called by vaults to record subscription events
     */
    function recordSubscription(
        address subscriber,
        uint256 tierId,
        uint256 amount
    ) external {
        require(vaultToCreator[msg.sender] != address(0), "Only vaults can call");
        
        stats.totalSubscriptions++;
        stats.totalVolume += amount;

        emit SubscriptionCreated(msg.sender, subscriber, tierId, amount);
    }

    /**
     * @dev Called by vaults to record payment withdrawals
     */
    function recordWithdrawal(
        address creator,
        uint256 amount,
        address token
    ) external {
        require(vaultToCreator[msg.sender] != address(0), "Only vaults can call");
        require(creators[creator].vaultAddress == msg.sender, "Invalid creator-vault pair");

        emit PaymentWithdrawn(msg.sender, creator, amount, token);
    }

    /**
     * @dev Pause the factory (emergency)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause the factory
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // View functions
    function getCreatorInfo(address creator) external view returns (CreatorInfo memory) {
        return creators[creator];
    }

    function getPlatformStats() external view returns (PlatformStats memory) {
        return stats;
    }

    function getSupportedTokens() external view returns (address[] memory) {
        return supportedTokensList;
    }

    function getCreatorsList() external view returns (address[] memory) {
        return creatorsList;
    }

    function getActiveCreatorsCount() external view returns (uint256) {
        return stats.activeCreators;
    }

    function isCreatorActive(address creator) external view returns (bool) {
        return creators[creator].isActive;
    }

    function getVaultAddress(address creator) external view returns (address) {
        return creators[creator].vaultAddress;
    }

    function getCreatorFromVault(address vault) external view returns (address) {
        return vaultToCreator[vault];
    }
}