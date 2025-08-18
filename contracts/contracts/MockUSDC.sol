// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUSDC
 * @dev Mock USDC token for testing purposes
 */
contract MockUSDC is ERC20, ERC20Permit, Ownable {
    uint8 private _decimals = 6; 
    
    mapping(address => uint256) public lastFaucetClaim;
    uint256 public constant FAUCET_AMOUNT = 1000 * 10**6; 
    uint256 public constant FAUCET_COOLDOWN = 1 days;

    event FaucetClaimed(address indexed user, uint256 amount);
    event TokensMinted(address indexed to, uint256 amount);

    constructor(
        address initialOwner
    ) ERC20("Mock USDC", "mUSDC") ERC20Permit("Mock USDC") Ownable(initialOwner) {
        _mint(initialOwner, 1000000 * 10**6); 
    }

    /**
     * @dev Override decimals to return 6 like real USDC
     */
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    /**
     * @dev Faucet function for testing - allows users to claim free tokens
     */
    function faucet() external {
        require(
            block.timestamp >= lastFaucetClaim[msg.sender] + FAUCET_COOLDOWN,
            "Faucet cooldown not met"
        );
        
        lastFaucetClaim[msg.sender] = block.timestamp;
        _mint(msg.sender, FAUCET_AMOUNT);
        
        emit FaucetClaimed(msg.sender, FAUCET_AMOUNT);
    }

    /**
     * @dev Mint tokens to specific address (only owner)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    /**
     * @dev Batch mint to multiple addresses
     */
    function batchMint(
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external onlyOwner {
        require(recipients.length == amounts.length, "Arrays length mismatch");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            _mint(recipients[i], amounts[i]);
            emit TokensMinted(recipients[i], amounts[i]);
        }
    }

    /**
     * @dev Check if user can claim from faucet
     */
    function canClaimFaucet(address user) external view returns (bool) {
        return block.timestamp >= lastFaucetClaim[user] + FAUCET_COOLDOWN;
    }

    /**
     * @dev Get time remaining until next faucet claim
     */
    function timeUntilNextFaucetClaim(address user) external view returns (uint256) {
        uint256 nextClaim = lastFaucetClaim[user] + FAUCET_COOLDOWN;
        if (block.timestamp >= nextClaim) {
            return 0;
        }
        return nextClaim - block.timestamp;
    }

    /**
     * @dev Approve with infinite allowance for testing convenience
     */
    function approveMax(address spender) external returns (bool) {
        return approve(spender, type(uint256).max);
    }

    /**
     * @dev Get formatted balance (with proper decimals)
     */
    function balanceOfFormatted(address account) external view returns (string memory) {
        uint256 balance = balanceOf(account);
        uint256 whole = balance / 10**_decimals;
        uint256 fractional = balance % 10**_decimals;
        
        return string(
        abi.encodePacked(
            _toString(whole),
            ".",
            _padZeros(fractional, _decimals)
        )
    );

    }

    /**
     * @dev Convert uint to string
     */
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    /**
    * @dev Pad zeros for decimal display
    */
    function _padZeros(uint256 value, uint8 decimalsCount) internal pure returns (string memory) {
        string memory str = _toString(value);
        bytes memory strBytes = bytes(str);
        
        if (strBytes.length >= decimalsCount) {
            return str;
        }
        
        bytes memory padded = new bytes(decimalsCount);
        uint256 padding = decimalsCount - strBytes.length;
        
        for (uint256 i = 0; i < padding; i++) {
            padded[i] = "0";
        }
        
        for (uint256 i = 0; i < strBytes.length; i++) {
            padded[padding + i] = strBytes[i];
        }
        
        return string(padded);
    }

}
