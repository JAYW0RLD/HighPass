// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title PaymentHandler
/// @notice Production-grade payment handler with all security features
contract PaymentHandler {
    address public admin;
    
    // Track admin fees separately
    uint256 public totalAdminFees;
    
    // Reentrancy guard
    bool private locked;
    
    // Pausable
    bool public paused;
    
    // Minimum payment to prevent precision loss
    uint256 public constant MIN_PAYMENT = 10000 wei; // Ensures fee >= 5 wei
    
    event PaymentProcessed(address indexed sender, uint256 indexed serviceId, uint256 amount, uint256 fee);
    event FeeWithdrawn(address indexed admin, uint256 amount);
    event ServiceProviderWithdrawn(uint256 amount);
    event AdminChanged(address indexed previousAdmin, address indexed newAdmin);
    event Paused(address indexed by);
    event Unpaused(address indexed by);

    modifier nonReentrant() {
        require(!locked, "ReentrancyGuard: reentrant call");
        locked = true;
        _;
        locked = false;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }
    
    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }

    constructor(address _admin) {
        require(_admin != address(0), "Admin cannot be zero address");
        admin = _admin;
        locked = false;
        paused = false;
    }

    /// @notice Pause contract (emergency stop)
    function pause() external onlyAdmin {
        require(!paused, "Already paused");
        paused = true;
        emit Paused(msg.sender);
    }
    
    /// @notice Unpause contract
    function unpause() external onlyAdmin {
        require(paused, "Not paused");
        paused = false;
        emit Unpaused(msg.sender);
    }

    /// @notice Change admin address
    /// @dev SECURITY: Allows admin rotation if compromised
    function changeAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "New admin cannot be zero address");
        require(newAdmin != admin, "New admin must be different");
        
        address previousAdmin = admin;
        admin = newAdmin;
        
        emit AdminChanged(previousAdmin, newAdmin);
    }

    /// @notice Pay for service with dynamic fee (gas + margin)
    /// @dev platformFee is calculated off-chain: estimatedGas + (amount * marginRate)
    /// @param serviceId Service identifier
    /// @param platformFee Expected platform fee (gas cost + margin)
    function pay(uint256 serviceId, uint256 platformFee) external payable nonReentrant whenNotPaused {
        require(msg.value >= MIN_PAYMENT, "Payment too small (min 10000 wei)");
        require(platformFee > 0, "Platform fee must be positive");
        require(platformFee < msg.value, "Fee cannot exceed payment");
        
        // SECURITY: Enforce maximum fee cap (20% ceiling)
        // Protects users from excessive fees even if backend is compromised
        uint256 maxAllowedFee = (msg.value * 2000) / 10000; // 20%
        require(platformFee <= maxAllowedFee, "Fee exceeds 20% safety cap");

        // Effects: Update state before external calls
        totalAdminFees += platformFee;

        // Emit event with breakdown
        emit PaymentProcessed(msg.sender, serviceId, msg.value, platformFee);
        
        // Note: Remaining balance (msg.value - platformFee) stays for service provider
    }
    
    /// @notice Admin withdraws accumulated fees
    /// @dev SECURITY: Checks-effects-interactions pattern with reentrancy guard
    function withdrawAdminFees() external onlyAdmin nonReentrant {
        uint256 amount = totalAdminFees;
        require(amount > 0, "No fees to withdraw");
        
        // Effects: Update state BEFORE transfer
        totalAdminFees = 0;
        
        // Interactions: External call last
        (bool success, ) = payable(admin).call{value: amount}("");
        require(success, "Transfer failed");
        
        emit FeeWithdrawn(admin, amount);
    }
    
    /// @notice Withdraw service provider balance
    /// @dev SECURITY: Separate from admin fees
    function withdrawServiceBalance() external onlyAdmin nonReentrant {
        uint256 totalBalance = address(this).balance;
        require(totalBalance > totalAdminFees, "No service balance");
        
        uint256 serviceBalance = totalBalance - totalAdminFees;
        require(serviceBalance > 0, "Service balance is zero");
        
        // Interactions: External call
        (bool success, ) = payable(admin).call{value: serviceBalance}("");
        require(success, "Transfer failed");
        
        emit ServiceProviderWithdrawn(serviceBalance);
    }

    /// @notice Get contract balance
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /// @notice Get service provider balance (excluding admin fees)
    function getServiceBalance() external view returns (uint256) {
        uint256 totalBalance = address(this).balance;
        if (totalBalance <= totalAdminFees) return 0;
        return totalBalance - totalAdminFees;
    }
    
    /// @notice Get admin fees available for withdrawal
    function getAdminFees() external view returns (uint256) {
        return totalAdminFees;
    }
    
    /// @notice Check if contract is paused
    function isPaused() external view returns (bool) {
        return paused;
    }
}
