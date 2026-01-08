// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title MockERC8004
/// @notice A simplified mock of the ERC-8004 Reputation Registry for testing purposes.
///         It does NOT implement the full ERC-721 or complex registry logic, 
///         but provides the essential interface for "getReputation".
contract MockERC8004 {
    // Owner/Admin address
    address public owner;
    
    // Mapping from AgentID (uint256) to Score (0-100)
    mapping(uint256 => uint256) public _reputations;

    // Event for logging
    event ReputationUpdated(uint256 indexed agentId, uint256 score, address indexed updater);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /// @notice Transfer ownership (for admin management)
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        address oldOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }

    /// @notice Set the reputation for a specific agent.
    /// @dev In the real standard, this would come from feedback aggregation.
    /// @dev SECURITY FIX: Added onlyOwner modifier to prevent unauthorized reputation manipulation
    function setReputation(uint256 agentId, uint256 score) external onlyOwner {
        require(score <= 100, "Score must be 0-100");
        _reputations[agentId] = score;
        emit ReputationUpdated(agentId, score, msg.sender);
    }

    /// @notice Get the reputation score of an agent.
    /// @param agentId The unique identifier of the agent.
    /// @return score The reputation score (0-100).
    function getReputation(uint256 agentId) external view returns (uint256) {
        return _reputations[agentId];
    }

    /// @notice Standard check function mimicking the registry's check.
    /// @param agentId The agent to check.
    /// @return valid True if score > 0 (simplification), but our service will check >= 70
    function hasReputation(uint256 agentId) external view returns (bool) {
        return _reputations[agentId] > 0;
    }
}
