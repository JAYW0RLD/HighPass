// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ProviderPerformanceRegistry
/// @notice On-chain registry for API provider performance metrics
/// @dev Immutable performance oracle for AI agents to make informed decisions
contract ProviderPerformanceRegistry {
    // ========================================
    // STATE VARIABLES
    // ========================================
    
    address public owner;
    
    /// @notice Maximum length for service name (configurable)
    uint256 public maxServiceNameLength = 64;
    
    /// @notice Performance metrics for a service
    struct PerformanceMetrics {
        uint64 avgLatencyMs;        // Average response time in milliseconds
        uint32 successRate;         // Success rate: 0-10000 (0.00% - 100.00%, 2 decimal precision)
        uint64 totalRequests;       // Total number of requests processed
        uint64 totalSuccesses;      // Total number of successful requests
        uint32 uniqueAgentCount;    // 🔒 Sybil Attack prevention: Number of unique agent wallets
        uint64 lastUpdated;         // Unix timestamp of last update
    }
    
    /// @notice Mapping from service identifier hash to performance metrics
    /// @dev Using hash instead of string to save gas
    mapping(bytes32 => PerformanceMetrics) public serviceMetrics;
    
    /// @notice Mapping to track service name to hash (for easy lookup)
    mapping(string => bytes32) public serviceHash;
    
    // ========================================
    // EVENTS
    // ========================================
    
    event PerformanceUpdated(
        string indexed serviceName,
        bytes32 indexed serviceHash,
        uint64 avgLatencyMs,
        uint32 successRate,
        uint64 totalRequests,
        uint64 totalSuccesses,
        address indexed updater
    );
    
    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );
    
    // ========================================
    // MODIFIERS
    // ========================================
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }
    
    // ========================================
    // CONSTRUCTOR
    // ========================================
    
    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }
    
    // ========================================
    // OWNER FUNCTIONS
    // ========================================
    
    /// @notice Update performance metrics for a service
    /// @dev Only callable by owner (HighStation backend)
    /// @param serviceName Service identifier (e.g., "demo-echo-api")
    /// @param avgLatencyMs Average response time in milliseconds
    /// @param successRate Success rate (0-10000, representing 0.00% - 100.00%)
    /// @param totalRequests Total number of requests processed
    /// @param totalSuccesses Total number of successful requests
    /// @param uniqueAgentCount Number of unique agent wallets (Sybil Attack prevention)
    function updatePerformanceMetrics(
        string memory serviceName,
        uint64 avgLatencyMs,
        uint32 successRate,
        uint64 totalRequests,
        uint64 totalSuccesses,
        uint32 uniqueAgentCount
    ) external onlyOwner {
        // Input validation
        require(bytes(serviceName).length > 0, "Service name cannot be empty");
        require(bytes(serviceName).length <= maxServiceNameLength, "Service name too long");
        require(successRate <= 10000, "Success rate must be <= 10000 (100.00%)");
        require(totalSuccesses <= totalRequests, "Successes cannot exceed total requests");
        // Note: uniqueAgentCount can be 0 (allows self-testing by providers)
        
        // Calculate service hash
        bytes32 hash = keccak256(abi.encodePacked(serviceName));
        
        // Update metrics
        serviceMetrics[hash] = PerformanceMetrics({
            avgLatencyMs: avgLatencyMs,
            successRate: successRate,
            totalRequests: totalRequests,
            totalSuccesses: totalSuccesses,
            uniqueAgentCount: uniqueAgentCount,
            lastUpdated: uint64(block.timestamp)
        });
        
        // Store service name mapping
        serviceHash[serviceName] = hash;
        
        // Emit event for transparency
        emit PerformanceUpdated(
            serviceName,
            hash,
            avgLatencyMs,
            successRate,
            totalRequests,
            totalSuccesses,
            msg.sender
        );
    }
    
    /// @notice Transfer ownership to a new address
    /// @param newOwner Address of the new owner
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        address oldOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
    
    /// @notice Update maximum service name length
    /// @param newMaxLength New maximum length for service names
    function setMaxServiceNameLength(uint256 newMaxLength) external onlyOwner {
        require(newMaxLength > 0, "Max length must be > 0");
        require(newMaxLength <= 256, "Max length too large");
        maxServiceNameLength = newMaxLength;
    }
    
    // ========================================
    // PUBLIC VIEW FUNCTIONS
    // ========================================
    
    /// @notice Get performance metrics for a service by name
    /// @param serviceName Service identifier
    /// @return Performance metrics struct
    function getPerformanceMetrics(string memory serviceName) 
        external 
        view 
        returns (PerformanceMetrics memory) 
    {
        bytes32 hash = keccak256(abi.encodePacked(serviceName));
        return serviceMetrics[hash];
    }
    
    /// @notice Get performance metrics by pre-computed hash
    /// @param hash Service identifier hash
    /// @return Performance metrics struct
    function getPerformanceMetricsByHash(bytes32 hash) 
        external 
        view 
        returns (PerformanceMetrics memory) 
    {
        return serviceMetrics[hash];
    }
    
    /// @notice Check if a service has performance data recorded
    /// @param serviceName Service identifier
    /// @return bool True if service has data, false otherwise
    function hasPerformanceData(string memory serviceName) 
        external 
        view 
        returns (bool) 
    {
        bytes32 hash = keccak256(abi.encodePacked(serviceName));
        return serviceMetrics[hash].lastUpdated > 0;
    }
    
    /// @notice Get human-readable success rate percentage
    /// @param serviceName Service identifier
    /// @return successPercentage Success rate as a percentage string (e.g., 9850 -> 98.50%)
    function getSuccessRatePercentage(string memory serviceName) 
        external 
        view 
        returns (uint32) 
    {
        bytes32 hash = keccak256(abi.encodePacked(serviceName));
        return serviceMetrics[hash].successRate;
    }
}
