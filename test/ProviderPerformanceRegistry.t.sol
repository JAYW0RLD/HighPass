// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/contracts/ProviderPerformanceRegistry.sol";

contract ProviderPerformanceRegistryTest is Test {
    ProviderPerformanceRegistry public registry;
    address public owner;
    address public nonOwner;
    
    // Test constants
    string constant SERVICE_NAME = "demo-echo-api";
    uint64 constant AVG_LATENCY = 150;
    uint32 constant SUCCESS_RATE = 9850; // 98.50%
    uint64 constant TOTAL_REQUESTS = 1000;
    uint64 constant TOTAL_SUCCESSES = 985;
    uint32 constant UNIQUE_AGENTS = 10;
    
    function setUp() public {
        owner = address(this);
        nonOwner = address(0x1234);
        registry = new ProviderPerformanceRegistry();
    }
    
    // ========================================
    // OWNERSHIP TESTS
    // ========================================
    
    function test_OwnerIsSetCorrectly() public {
        assertEq(registry.owner(), owner);
    }
    
    function test_TransferOwnership() public {
        address newOwner = address(0x5678);
        
        vm.expectEmit(true, true, false, true);
        emit ProviderPerformanceRegistry.OwnershipTransferred(owner, newOwner);
        
        registry.transferOwnership(newOwner);
        assertEq(registry.owner(), newOwner);
    }
    
    function test_RevertTransferOwnership_ZeroAddress() public {
        vm.expectRevert("New owner cannot be zero address");
        registry.transferOwnership(address(0));
    }
    
    function test_RevertTransferOwnership_NotOwner() public {
        vm.prank(nonOwner);
        vm.expectRevert("Only owner can call this");
        registry.transferOwnership(address(0x5678));
    }
    
    // ========================================
    // UPDATE PERFORMANCE METRICS TESTS
    // ========================================
    
    function test_UpdatePerformanceMetrics() public {
        vm.expectEmit(true, true, false, true);
        emit ProviderPerformanceRegistry.PerformanceUpdated(
            SERVICE_NAME,
            keccak256(abi.encodePacked(SERVICE_NAME)),
            AVG_LATENCY,
            SUCCESS_RATE,
            TOTAL_REQUESTS,
            TOTAL_SUCCESSES,
            owner
        );
        
        registry.updatePerformanceMetrics(
            SERVICE_NAME,
            AVG_LATENCY,
            SUCCESS_RATE,
            TOTAL_REQUESTS,
            TOTAL_SUCCESSES,
            UNIQUE_AGENTS
        );
        
        // Verify metrics were stored correctly
        ProviderPerformanceRegistry.PerformanceMetrics memory metrics = 
            registry.getPerformanceMetrics(SERVICE_NAME);
        
        assertEq(metrics.avgLatencyMs, AVG_LATENCY);
        assertEq(metrics.successRate, SUCCESS_RATE);
        assertEq(metrics.totalRequests, TOTAL_REQUESTS);
        assertEq(metrics.totalSuccesses, TOTAL_SUCCESSES);
        assertEq(metrics.uniqueAgentCount, UNIQUE_AGENTS);
        assertGt(metrics.lastUpdated, 0);
    }
    
    function test_RevertUpdatePerformanceMetrics_NotOwner() public {
        vm.prank(nonOwner);
        vm.expectRevert("Only owner can call this");
        
        registry.updatePerformanceMetrics(
            SERVICE_NAME,
            AVG_LATENCY,
            SUCCESS_RATE,
            TOTAL_REQUESTS,
            TOTAL_SUCCESSES,
            UNIQUE_AGENTS
        );
    }
    
    function test_RevertUpdatePerformanceMetrics_EmptyServiceName() public {
        vm.expectRevert("Service name cannot be empty");
        
        registry.updatePerformanceMetrics(
            "",
            AVG_LATENCY,
            SUCCESS_RATE,
            TOTAL_REQUESTS,
            TOTAL_SUCCESSES,
            UNIQUE_AGENTS
        );
    }
    
    function test_RevertUpdatePerformanceMetrics_ServiceNameTooLong() public {
        string memory longName = "this-is-a-very-long-service-name-that-exceeds-the-maximum-allowed-length-of-64-characters";
        
        vm.expectRevert("Service name too long");
        
        registry.updatePerformanceMetrics(
            longName,
            AVG_LATENCY,
            SUCCESS_RATE,
            TOTAL_REQUESTS,
            TOTAL_SUCCESSES,
            UNIQUE_AGENTS
        );
    }
    
    function test_RevertUpdatePerformanceMetrics_InvalidSuccessRate() public {
        vm.expectRevert("Success rate must be <= 10000 (100.00%)");
        
        registry.updatePerformanceMetrics(
            SERVICE_NAME,
            AVG_LATENCY,
            10001, // Invalid: > 100.00%
            TOTAL_REQUESTS,
            TOTAL_SUCCESSES,
            UNIQUE_AGENTS
        );
    }
    
    function test_RevertUpdatePerformanceMetrics_InvalidSuccessCount() public {
        vm.expectRevert("Successes cannot exceed total requests");
        
        registry.updatePerformanceMetrics(
            SERVICE_NAME,
            AVG_LATENCY,
            SUCCESS_RATE,
            100,   // Total requests
            150,   // Successes > requests (invalid)
            UNIQUE_AGENTS
        );
    }
    
    // ========================================
    // QUERY TESTS
    // ========================================
    
    function test_GetPerformanceMetrics_NonExistent() public {
        ProviderPerformanceRegistry.PerformanceMetrics memory metrics = 
            registry.getPerformanceMetrics("non-existent-service");
        
        assertEq(metrics.avgLatencyMs, 0);
        assertEq(metrics.successRate, 0);
        assertEq(metrics.totalRequests, 0);
        assertEq(metrics.totalSuccesses, 0);
        assertEq(metrics.uniqueAgentCount, 0);
        assertEq(metrics.lastUpdated, 0);
    }
    
    function test_GetPerformanceMetricsByHash() public {
        registry.updatePerformanceMetrics(
            SERVICE_NAME,
            AVG_LATENCY,
            SUCCESS_RATE,
            TOTAL_REQUESTS,
            TOTAL_SUCCESSES,
            UNIQUE_AGENTS
        );
        
        bytes32 hash = keccak256(abi.encodePacked(SERVICE_NAME));
        ProviderPerformanceRegistry.PerformanceMetrics memory metrics = 
            registry.getPerformanceMetricsByHash(hash);
        
        assertEq(metrics.avgLatencyMs, AVG_LATENCY);
        assertEq(metrics.successRate, SUCCESS_RATE);
    }
    
    function test_HasPerformanceData() public {
        assertFalse(registry.hasPerformanceData(SERVICE_NAME));
        
        registry.updatePerformanceMetrics(
            SERVICE_NAME,
            AVG_LATENCY,
            SUCCESS_RATE,
            TOTAL_REQUESTS,
            TOTAL_SUCCESSES,
            UNIQUE_AGENTS
        );
        
        assertTrue(registry.hasPerformanceData(SERVICE_NAME));
    }
    
    function test_GetSuccessRatePercentage() public {
        registry.updatePerformanceMetrics(
            SERVICE_NAME,
            AVG_LATENCY,
            SUCCESS_RATE,
            TOTAL_REQUESTS,
            TOTAL_SUCCESSES,
            UNIQUE_AGENTS
        );
        
        uint32 successRate = registry.getSuccessRatePercentage(SERVICE_NAME);
        assertEq(successRate, SUCCESS_RATE);
    }
    
    // ========================================
    // SELF-TESTING / UNIQUE AGENT TRACKING TESTS
    // ========================================
    
    function test_UniqueAgentCount_ZeroAllowed() public {
        // Providers can test their own API (unique_agent_count can be 0)
        registry.updatePerformanceMetrics(
            SERVICE_NAME,
            AVG_LATENCY,
            SUCCESS_RATE,
            TOTAL_REQUESTS,
            TOTAL_SUCCESSES,
            0 // Zero agents allowed (self-testing)
        );
        
        ProviderPerformanceRegistry.PerformanceMetrics memory metrics = 
            registry.getPerformanceMetrics(SERVICE_NAME);
        
        assertEq(metrics.uniqueAgentCount, 0);
        // Data is still recorded for analytics
    }
    
    function test_UniqueAgentCount_Tracking() public {
        // Simulate service with multiple agents
        registry.updatePerformanceMetrics(
            SERVICE_NAME,
            AVG_LATENCY,
            SUCCESS_RATE,
            TOTAL_REQUESTS,
            TOTAL_SUCCESSES,
            3 // 3 unique agents
        );
        
        ProviderPerformanceRegistry.PerformanceMetrics memory metrics = 
            registry.getPerformanceMetrics(SERVICE_NAME);
        
        assertEq(metrics.uniqueAgentCount, 3);
        // No filtering - data is for analytics only
    }
    
    function test_UniqueAgentCount_Update() public {
        // Initial state: 5 agents
        registry.updatePerformanceMetrics(
            SERVICE_NAME,
            AVG_LATENCY,
            SUCCESS_RATE,
            100,
            95,
            5
        );
        
        // More agents joined
        registry.updatePerformanceMetrics(
            SERVICE_NAME,
            120, // Improved latency
            9900, // Improved success rate
            200,
            198,
            15 // More unique agents
        );
        
        ProviderPerformanceRegistry.PerformanceMetrics memory metrics = 
            registry.getPerformanceMetrics(SERVICE_NAME);
        
        assertEq(metrics.uniqueAgentCount, 15);
        assertEq(metrics.avgLatencyMs, 120);
    }
    
    // ========================================
    // MULTIPLE SERVICES TESTS
    // ========================================
    
    function test_MultipleServices() public {
        string memory service1 = "service-1";
        string memory service2 = "service-2";
        
        registry.updatePerformanceMetrics(service1, 100, 9500, 500, 475, 8);
        registry.updatePerformanceMetrics(service2, 200, 9800, 1000, 980, 12);
        
        ProviderPerformanceRegistry.PerformanceMetrics memory metrics1 = 
            registry.getPerformanceMetrics(service1);
        ProviderPerformanceRegistry.PerformanceMetrics memory metrics2 = 
            registry.getPerformanceMetrics(service2);
        
        assertEq(metrics1.avgLatencyMs, 100);
        assertEq(metrics2.avgLatencyMs, 200);
        assertEq(metrics1.uniqueAgentCount, 8);
        assertEq(metrics2.uniqueAgentCount, 12);
    }
    
    // ========================================
    // EDGE CASES
    // ========================================
    
    function testFuzz_UpdatePerformanceMetrics(
        uint64 latency,
        uint32 successRate,
        uint64 totalReq,
        uint64 totalSucc,
        uint32 uniqueAgents
    ) public {
        // Bound inputs to valid ranges
        successRate = uint32(bound(successRate, 0, 10000));
        totalSucc = uint64(bound(totalSucc, 0, totalReq));
        uniqueAgents = uint32(bound(uniqueAgents, 1, type(uint32).max));
        
        registry.updatePerformanceMetrics(
            SERVICE_NAME,
            latency,
            successRate,
            totalReq,
            totalSucc,
            uniqueAgents
        );
        
        ProviderPerformanceRegistry.PerformanceMetrics memory metrics = 
            registry.getPerformanceMetrics(SERVICE_NAME);
        
        assertEq(metrics.avgLatencyMs, latency);
        assertEq(metrics.successRate, successRate);
        assertEq(metrics.totalRequests, totalReq);
        assertEq(metrics.totalSuccesses, totalSucc);
        assertEq(metrics.uniqueAgentCount, uniqueAgents);
    }
}
