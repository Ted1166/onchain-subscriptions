// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./SubscriberNFT.sol";

// Minimal ownable interface to read owner from factory
interface IOwnable {
    function owner() external view returns (address);
}

// interface ISubscriptionFactory {
//     function platformFeeRate() external view returns (uint256); // bps (e.g., 250 = 2.5%)
//     function recordSubscription(address subscriber, uint256 tierId, uint256 amount) external;
//     function recordWithdrawal(address creator, uint256 amount, address token) external;
// }

/**
 * @title CreatorVault
 * @dev Individual creator's subscription vault (ERC20-denominated)
 */
contract CreatorVault is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    struct SubscriptionTier {
        uint256 price;            // price per period (in smallest units of token used in subscription)
        string name;
        string description;
        uint256 maxSubscribers;   // 0 = unlimited
        uint256 currentSubscribers;
        bool isActive;
    }

    struct Subscription {
        uint256 tierId;
        uint256 amount;       // price locked at subscription time (can be updated by tier changes when renewed if desired)
        uint256 lastPayment;
        uint256 nextPayment;
        address token;        // ERC20 token used for this subscription
        bool isActive;
    }

    struct CreatorBalance {
        uint256 available;
        uint256 withdrawn;
        uint256 totalEarned;
    }

    // Constants
    uint256 public constant BILLING_PERIOD = 30 days;
    uint256 public constant GRACE_PERIOD   = 7 days;

    // Contract references
    ISubscriptionFactory public immutable factory;
    SubscriberNFT public immutable subscriberNFT;

    // Creator info
    address public creator;

    // Accepted ERC20s
    mapping(address => bool) public acceptedTokens;
    address[] public acceptedTokensList;

    // Tiers
    mapping(uint256 => SubscriptionTier) public tiers;
    uint256 public nextTierId = 1;

    // Subscriptions
    mapping(address => mapping(uint256 => Subscription)) public subscriptions;
    mapping(address => uint256[]) private _userTiers;
    mapping(address => mapping(uint256 => uint256)) private _userTierIndex; // user => tierId => index in _userTiers[user]

    // Balances: for this creator, per token
    mapping(address => CreatorBalance) public balances; // token => balance

    // Platform fees accrued per token
    mapping(address => uint256) public platformFees; // token => amount

    // Tracking
    mapping(address => uint256) public totalSubscribersByToken; // token => count
    uint256 public totalActiveSubscriptions;

    // Events
    event TierCreated(uint256 indexed tierId, string name, uint256 price);
    event TierUpdated(uint256 indexed tierId, string name, uint256 price, bool isActive);
    event SubscriptionCreated(address indexed subscriber, uint256 indexed tierId, uint256 amount, address token);
    event SubscriptionCancelled(address indexed subscriber, uint256 indexed tierId);
    event PaymentProcessed(address indexed subscriber, uint256 indexed tierId, uint256 amount, address token);
    event PaymentWithdrawn(address indexed creator, uint256 amount, address token);
    event PlatformFeesWithdrawn(address indexed to, uint256 amount, address token);
    event TokenAdded(address indexed token);
    event TokenRemoved(address indexed token);

    modifier onlyCreator() {
        require(msg.sender == creator, "Only creator");
        _;
    }

    modifier validTier(uint256 tierId) {
        require(tiers[tierId].price > 0, "Invalid tier");
        require(tiers[tierId].isActive, "Tier inactive");
        _;
    }

    modifier onlyFactoryOwner() {
        require(msg.sender == IOwnable(address(factory)).owner(), "Only factory owner");
        _;
    }

    constructor(
        address _creator,
        address _factory,
        address _subscriberNFT,
        address[] memory _acceptedTokens
    ) Ownable(_creator) {
        require(_creator != address(0) && _factory != address(0) && _subscriberNFT != address(0), "Zero addr");
        creator = _creator;
        factory = ISubscriptionFactory(_factory);
        subscriberNFT = SubscriberNFT(_subscriberNFT);

        for (uint256 i = 0; i < _acceptedTokens.length; i++) {
            address t = _acceptedTokens[i];
            require(t != address(0), "ETH not supported");
            if (!acceptedTokens[t]) {
                acceptedTokens[t] = true;
                acceptedTokensList.push(t);
                emit TokenAdded(t);
            }
        }
    }

    // ---------------- Tiers ----------------

    function createTier(
        string calldata name,
        string calldata description,
        uint256 price,
        uint256 maxSubscribers
    ) external onlyCreator whenNotPaused returns (uint256 tierId) {
        require(bytes(name).length > 0, "Empty name");
        require(price > 0, "Price=0");

        tierId = nextTierId++;
        tiers[tierId] = SubscriptionTier({
            price: price,
            name: name,
            description: description,
            maxSubscribers: maxSubscribers,
            currentSubscribers: 0,
            isActive: true
        });

        emit TierCreated(tierId, name, price);
    }

    function updateTier(
        uint256 tierId,
        string calldata name,
        string calldata description,
        uint256 price,
        uint256 maxSubscribers,
        bool isActive
    ) external onlyCreator whenNotPaused {
        require(tiers[tierId].price > 0, "Tier missing");
        require(price > 0, "Price=0");

        SubscriptionTier storage tier = tiers[tierId];
        tier.name = name;
        tier.description = description;
        tier.price = price;
        tier.maxSubscribers = maxSubscribers;
        tier.isActive = isActive;

        emit TierUpdated(tierId, name, price, isActive);
    }

    // ---------------- Subscriptions ----------------

    /**
     * @dev Subscribe to a tier. ERC20 only.
     */
    function subscribe(
        uint256 tierId,
        address token
    ) external whenNotPaused validTier(tierId) nonReentrant {
        require(token != address(0), "ETH not supported");
        require(acceptedTokens[token], "Token not accepted");
        require(!subscriptions[msg.sender][tierId].isActive, "Already subscribed");

        SubscriptionTier storage tier = tiers[tierId];
        require(tier.maxSubscribers == 0 || tier.currentSubscribers < tier.maxSubscribers, "Tier full");

        uint256 amount = tier.price;

        // Pull first period payment
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        // Record subscription
        subscriptions[msg.sender][tierId] = Subscription({
            tierId: tierId,
            amount: amount,
            lastPayment: block.timestamp,
            nextPayment: block.timestamp + BILLING_PERIOD,
            token: token,
            isActive: true
        });

        // Track user's tiers (O(1) remove supported)
        _userTierIndex[msg.sender][tierId] = _userTiers[msg.sender].length;
        _userTiers[msg.sender].push(tierId);

        tier.currentSubscribers++;
        totalSubscribersByToken[token]++;
        totalActiveSubscriptions++;

        // Split payment
        (uint256 creatorAmount, uint256 feeAmount) = _split(amount);
        balances[token].available += creatorAmount;
        balances[token].totalEarned += creatorAmount;
        platformFees[token] += feeAmount;

        // Mint subscriber NFT (this vault must be recognized by factory as a valid vault)
        subscriberNFT.mintBadge(msg.sender, tierId, tier.name);

        factory.recordSubscription(msg.sender, tierId, amount);

        emit SubscriptionCreated(msg.sender, tierId, amount, token);
        emit PaymentProcessed(msg.sender, tierId, amount, token);
    }

    function cancelSubscription(uint256 tierId) external nonReentrant {
        Subscription storage sub = subscriptions[msg.sender][tierId];
        require(sub.isActive, "Not subscribed");

        sub.isActive = false;
        tiers[tierId].currentSubscribers--;
        totalActiveSubscriptions--;

        // O(1) remove from user tiers
        _removeUserTier(msg.sender, tierId);

        // Burn subscriber NFT
        subscriberNFT.burnBadge(msg.sender, tierId);

        emit SubscriptionCancelled(msg.sender, tierId);
    }

    /**
     * @dev Process recurring payment by anyone (keeper/cron), within grace period.
     */
    function processRecurringPayment(
        address subscriber,
        uint256 tierId
    ) external whenNotPaused nonReentrant {
        Subscription storage sub = subscriptions[subscriber][tierId];
        require(sub.isActive, "Inactive sub");
        require(block.timestamp >= sub.nextPayment, "Not due");
        require(block.timestamp <= sub.nextPayment + GRACE_PERIOD, "Grace expired");

        address token = sub.token;
        uint256 amount = sub.amount;

        // Pull payment
        IERC20 tokenContract = IERC20(token);
        require(tokenContract.balanceOf(subscriber) >= amount, "Low balance");
        require(tokenContract.allowance(subscriber, address(this)) >= amount, "Low allowance");
        tokenContract.safeTransferFrom(subscriber, address(this), amount);

        // Update subscription
        sub.lastPayment = block.timestamp;
        sub.nextPayment = block.timestamp + BILLING_PERIOD;

        // Split payment
        (uint256 creatorAmount, uint256 feeAmount) = _split(amount);
        balances[token].available += creatorAmount;
        balances[token].totalEarned += creatorAmount;
        platformFees[token] += feeAmount;

        emit PaymentProcessed(subscriber, tierId, amount, token);
    }

    // ---------------- Payouts ----------------

    function withdrawEarnings(address token) external onlyCreator nonReentrant {
        uint256 available = balances[token].available;
        require(available > 0, "No funds");

        balances[token].available = 0;
        balances[token].withdrawn += available;

        IERC20(token).safeTransfer(creator, available);
        factory.recordWithdrawal(creator, available, token);

        emit PaymentWithdrawn(creator, available, token);
    }

    function withdrawPlatformFees(address token, address to) external onlyFactoryOwner nonReentrant {
        uint256 amt = platformFees[token];
        require(amt > 0, "No fees");
        platformFees[token] = 0;
        IERC20(token).safeTransfer(to, amt);
        emit PlatformFeesWithdrawn(to, amt, token);
    }

    // ---------------- Token management ----------------

    function addAcceptedToken(address token) external onlyCreator {
        require(token != address(0), "ETH not supported");
        require(!acceptedTokens[token], "Already accepted");
        acceptedTokens[token] = true;
        acceptedTokensList.push(token);
        emit TokenAdded(token);
    }

    function removeAcceptedToken(address token) external onlyCreator {
        require(acceptedTokens[token], "Not accepted");
        acceptedTokens[token] = false;

        // Remove from array
        uint256 len = acceptedTokensList.length;
        for (uint256 i = 0; i < len; i++) {
            if (acceptedTokensList[i] == token) {
                acceptedTokensList[i] = acceptedTokensList[len - 1];
                acceptedTokensList.pop();
                break;
            }
        }

        emit TokenRemoved(token);
    }

    // ---------------- Admin (factory owner) ----------------

    function pause() external onlyFactoryOwner { _pause(); }
    function unpause() external onlyFactoryOwner { _unpause(); }

    // ---------------- Views ----------------

    function getTier(uint256 tierId) external view returns (SubscriptionTier memory) {
        return tiers[tierId];
    }

    function getSubscription(address subscriber, uint256 tierId) external view returns (Subscription memory) {
        return subscriptions[subscriber][tierId];
    }

    function getUserTiers(address user) external view returns (uint256[] memory) {
        return _userTiers[user];
    }

    function getCreatorBalance(address token) external view returns (CreatorBalance memory) {
        return balances[token];
    }

    function getAcceptedTokens() external view returns (address[] memory) {
        return acceptedTokensList;
    }

    function isSubscriptionActive(address subscriber, uint256 tierId) external view returns (bool) {
        return subscriptions[subscriber][tierId].isActive;
    }

    function isPaymentDue(address subscriber, uint256 tierId) external view returns (bool) {
        Subscription memory sub = subscriptions[subscriber][tierId];
        return sub.isActive && block.timestamp >= sub.nextPayment;
    }

    function isInGracePeriod(address subscriber, uint256 tierId) external view returns (bool) {
        Subscription memory sub = subscriptions[subscriber][tierId];
        return sub.isActive && block.timestamp >= sub.nextPayment && block.timestamp <= sub.nextPayment + GRACE_PERIOD;
    }

    function getTotalTiers() external view returns (uint256) {
        return nextTierId - 1;
    }

    // ---------------- Internal helpers ----------------

    function _split(uint256 amount) internal view returns (uint256 creatorAmount, uint256 feeAmount) {
        uint256 feeBps = factory.platformFeeRate();
        feeAmount = (amount * feeBps) / 10000;
        creatorAmount = amount - feeAmount;
    }

    function _removeUserTier(address user, uint256 tierId) internal {
        uint256 idx = _userTierIndex[user][tierId];
        uint256 lastIdx = _userTiers[user].length - 1;

        if (idx != lastIdx) {
            uint256 lastTierId = _userTiers[user][lastIdx];
            _userTiers[user][idx] = lastTierId;
            _userTierIndex[user][lastTierId] = idx;
        }
        _userTiers[user].pop();
        delete _userTierIndex[user][tierId];
    }

    // Accept no ETH (explicitly)
    receive() external payable {
        revert("ETH not supported");
    }
}
