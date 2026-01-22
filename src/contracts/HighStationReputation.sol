// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// [HACKATHON] ERC-8004 Reputation System Disabled
// This contract stores reliability scores for service identities
// Disabled for hackathon simplification - uncomment to re-enable

/*
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title HighStationReputation
 * @notice Stores reliability scores for Services (Identities).
 * @dev Scores are 0-10000 (representing 0.00% to 100.00%).
 *
contract HighStationReputation is Ownable {
    
    // Identity Token ID -> Score
    mapping(uint256 => uint32) public scores;
    
    // Last update timestamp
    mapping(uint256 => uint256) public lastUpdated;

    // Updaters (Oracles/Gateway)
    mapping(address => bool) public updaters;

    event ReputationUpdated(uint256 indexed subjectId, uint32 score, address indexed updater);
    event UpdaterStatusChanged(address indexed updater, bool isActive);

    modifier onlyUpdater() {
        require(updaters[msg.sender], "Not authorized updater");
        _;
    }

    constructor() Ownable(msg.sender) {
        updaters[msg.sender] = true;
    }

    function setUpdaterStatus(address updater, bool isActive) external onlyOwner {
        updaters[updater] = isActive;
        emit UpdaterStatusChanged(updater, isActive);
    }

    /**
     * @notice Update the score for a service.
     * @param subjectId The Identity Token ID of the service.
     * @param score New score (0-10000).
     *
    function updateScore(uint256 subjectId, uint32 score) external onlyUpdater {
        require(score <= 10000, "Score exceeds max (10000)");
        scores[subjectId] = score;
        lastUpdated[subjectId] = block.timestamp;
        emit ReputationUpdated(subjectId, score, msg.sender);
    }

    function getScore(uint256 subjectId) external view returns (uint32) {
        return scores[subjectId];
    }
}
*/
