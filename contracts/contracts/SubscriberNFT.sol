// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

contract SubscriberNFT is ERC721, Ownable, ReentrancyGuard {
    using Strings for uint256;

    struct Badge {
        address creator;
        address subscriber;
        uint256 tierId;
        string tierName;    
        uint256 mintedAt;
        bool isActive;
    }

    uint256 private _tokenIdCounter = 0;

    address public factory;

    mapping(uint256 => Badge) public badges;
    mapping(address => mapping(address => mapping(uint256 => uint256))) public userBadges;

    mapping(address => uint256[]) private _userTokens;
    mapping(address => mapping(uint256 => uint256)) private _userTokenIndex;

    uint256 public activeSupply;

    string[] private tierColors = [
        "#FFD700", // Gold
        "#C0C0C0", // Silver
        "#CD7F32", // Bronze
        "#4169E1", // Royal Blue
        "#32CD32", // Lime Green
        "#FF69B4", // Hot Pink
        "#FF4500", // Orange Red
        "#9400D3"  // Violet
    ];

    event BadgeMinted(
        uint256 indexed tokenId,
        address indexed creator,
        address indexed subscriber,
        uint256 tierId,
        string tierName
    );

    event BadgeBurned(
        uint256 indexed tokenId,
        address indexed creator,
        address indexed subscriber,
        uint256 tierId
    );

    modifier onlyFactory() {
        require(msg.sender == factory, "Only factory");
        _;
    }

    modifier onlyVault() {
        require(isValidVault(msg.sender), "Only vaults");
        _;
    }

    constructor(
        address _factory,
        string memory name_,
        string memory symbol_
    ) ERC721(name_, symbol_) Ownable(msg.sender) {
        require(_factory != address(0), "Factory required");
        factory = _factory;
    }

    function setFactory(address _factory) external onlyOwner {
        require(_factory != address(0), "Invalid factory");
        factory = _factory;
    }

    function mintBadge(
        address subscriber,
        uint256 tierId,
        string calldata tierName
    ) external onlyVault nonReentrant returns (uint256) {
        require(subscriber != address(0), "Invalid subscriber");

        address creator = getCreatorFromVault(msg.sender);
        require(creator != address(0), "Creator not found");

        require(userBadges[subscriber][creator][tierId] == 0, "Badge exists");

        ++_tokenIdCounter;
        uint256 tokenId = _tokenIdCounter;

        string memory cleanTier = _sanitizeText(tierName, 40);

        badges[tokenId] = Badge({
            creator: creator,
            subscriber: subscriber,
            tierId: tierId,
            tierName: cleanTier,
            mintedAt: block.timestamp,
            isActive: true
        });

        userBadges[subscriber][creator][tierId] = tokenId;

        _userTokenIndex[subscriber][tokenId] = _userTokens[subscriber].length;
        _userTokens[subscriber].push(tokenId);

        _safeMint(subscriber, tokenId);

        activeSupply += 1;

        emit BadgeMinted(tokenId, creator, subscriber, tierId, cleanTier);
        return tokenId;
    }

    function burnBadge(address subscriber, uint256 tierId)
        external
        onlyVault
        nonReentrant
    {
        address creator = getCreatorFromVault(msg.sender);
        require(creator != address(0), "Creator not found");

        uint256 tokenId = userBadges[subscriber][creator][tierId];
        require(tokenId != 0, "Badge missing");
        require(badges[tokenId].isActive, "Badge inactive");

        badges[tokenId].isActive = false;
        userBadges[subscriber][creator][tierId] = 0;

        _removeUserToken(subscriber, tokenId);

        _burn(tokenId);
        activeSupply -= 1;

        emit BadgeBurned(tokenId, creator, subscriber, tierId);
    }

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal virtual override returns (address) {
        address from = _ownerOf(tokenId);
        require(from == address(0) || to == address(0), "Soulbound");

        return super._update(to, tokenId, auth);
    }

    function approve(address, uint256) public pure override {
        revert("Soulbound");
    }

    function setApprovalForAll(address, bool) public pure override {
        revert("Soulbound");
    }

    function getBadge(uint256 tokenId) external view returns (Badge memory) {
        return badges[tokenId];
    }

    function getUserBadges(address user) external view returns (uint256[] memory) {
        return _userTokens[user];
    }

    function hasBadge(
        address subscriber,
        address creator,
        uint256 tierId
    ) external view returns (bool) {
        uint256 tokenId = userBadges[subscriber][creator][tierId];
        return tokenId != 0 && badges[tokenId].isActive;
    }

    function getBadgeTokenId(
        address subscriber,
        address creator,
        uint256 tierId
    ) external view returns (uint256) {
        return userBadges[subscriber][creator][tierId];
    }

    function totalMinted() external view returns (uint256) {
        return _tokenIdCounter;
    }

    function totalActive() external view returns (uint256) {
        return activeSupply;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "ERC721: URI query for nonexistent token");
        return _generateTokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _generateTokenURI(uint256 tokenId) internal view returns (string memory) {
        Badge memory badge = badges[tokenId];
        string memory color = tierColors[badge.tierId % tierColors.length];

        string memory creatorStr = _toHexString(badge.creator);
        string memory tierIdStr = badge.tierId.toString();

        string memory svg = string(
            abi.encodePacked(
                '<svg width="300" height="300" xmlns="http://www.w3.org/2000/svg">',
                    '<defs>',
                        '<linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">',
                            '<stop offset="0%" style="stop-color:', color, ';stop-opacity:1" />',
                            '<stop offset="100%" style="stop-color:#000000;stop-opacity:0.8" />',
                        '</linearGradient>',
                    '</defs>',
                    '<rect width="100%" height="100%" fill="url(#grad)" rx="20"/>',
                    '<circle cx="150" cy="80" r="30" fill="white" opacity="0.9"/>',
                    '<text x="150" y="85" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" fill="black">S</text>',
                    '<text x="150" y="140" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="white" font-weight="bold">',
                        badge.tierName,
                    '</text>',
                    '<text x="150" y="160" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="white" opacity="0.8">',
                        'Tier #', tierIdStr,
                    '</text>',
                    '<text x="150" y="200" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="white" opacity="0.6">Subscriber Badge</text>',
                    '<text x="150" y="220" text-anchor="middle" font-family="Arial, sans-serif" font-size="8" fill="white" opacity="0.6">',
                        'Creator: ', creatorStr,
                    '</text>',
                '</svg>'
            )
        );

        string memory json = Base64.encode(
            bytes(
                string(
                    abi.encodePacked(
                        '{"name":"Subscriber Badge #', tokenId.toString(), '",',
                        '"description":"Subscriber badge for ', badge.tierName, ' tier",',
                        '"image":"data:image/svg+xml;base64,', Base64.encode(bytes(svg)), '",',
                        '"attributes":[',
                            '{"trait_type":"Creator","value":"', creatorStr, '"},',
                            '{"trait_type":"Tier ID","value":"', tierIdStr, '"},',
                            '{"trait_type":"Tier Name","value":"', badge.tierName, '"},',
                            '{"trait_type":"Minted At","value":"', badge.mintedAt.toString(), '"},',
                            '{"trait_type":"Status","value":"', (badge.isActive ? "Active" : "Inactive"), '"}',
                        ']}'
                    )
                )
            )
        );

        return string(abi.encodePacked("data:application/json;base64,", json));
    }

    function _removeUserToken(address owner, uint256 tokenId) internal {
        uint256 lastIdx = _userTokens[owner].length - 1;
        uint256 idx = _userTokenIndex[owner][tokenId];

        if (idx != lastIdx) {
            uint256 lastTokenId = _userTokens[owner][lastIdx];
            _userTokens[owner][idx] = lastTokenId;
            _userTokenIndex[owner][lastTokenId] = idx;
        }
        _userTokens[owner].pop();
        delete _userTokenIndex[owner][tokenId];
    }

    function _toHexString(address a) internal pure returns (string memory) {
        return Strings.toHexString(uint160(a), 20);
    }

    function _sanitizeText(string memory input, uint256 maxLen) internal pure returns (string memory) {
        bytes memory src = bytes(input);
        uint256 n = src.length;
        if (n > maxLen) n = maxLen;

        bytes memory out = new bytes(n);
        for (uint256 i = 0; i < n; i++) {
            bytes1 c = src[i];
            if (c == 0x3C || c == 0x3E || c == 0x22 || c == 0x26) {
                out[i] = 0x20;
            } else {
                out[i] = c;
            }
        }
        return string(out);
    }

    function isValidVault(address vault) internal view returns (bool) {
        try ISubscriptionFactory(factory).getCreatorFromVault(vault) returns (address creator) {
            return creator != address(0);
        } catch {
            return false;
        }
    }

    function getCreatorFromVault(address vault) internal view returns (address) {
        return ISubscriptionFactory(factory).getCreatorFromVault(vault);
    }
}

interface ISubscriptionFactory {
    function getCreatorFromVault(address vault) external view returns (address);
    function createVault(address creator) external returns (address);
    function recordSubscription(address subscriber, uint256 tierId, uint256 amount) external;
    function recordWithdrawal(address creator, uint256 amount, address token) external;
    function platformFeeRate() external view returns (uint256);
}
