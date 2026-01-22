// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// [HACKATHON] ERC-8004 Identity System Disabled for Simplification
// Uncomment to re-enable NFT-based identity management
// import "./HighStationIdentity.sol";

/// @title PaymentHandler
/// @notice Production-grade payment handler (ERC-8004 Identity Integration DISABLED for Hackathon)
contract PaymentHandler {
    address public admin;
    // [HACKATHON-DISABLED] HighStationIdentity public identityRegistry;
    
    // Track admin fees separately
    uint256 public totalAdminFees;

    // [NEW] Per-service balance tracking (Segregated Funds)
    mapping(uint256 => uint256) public serviceBalances;
    
    // Reentrancy guard
    bool private locked;
    
    // Pausable
    bool public paused;
    
    // Configurable Parameters
    uint256 public minPayment = 10000 wei;
    uint256 public safetyCapBps = 2000;
    
    event PaymentProcessed(address indexed sender, uint256 indexed serviceId, uint256 amount, uint256 fee);
    event FeeWithdrawn(address indexed admin, uint256 amount);
    event ServiceProviderWithdrawn(uint256 indexed serviceId, address indexed provider, uint256 amount);
    event AdminChanged(address indexed previousAdmin, address indexed newAdmin);
    event IdentityRegistryUpdated(address indexed registry);
    event ParamsUpdated(uint256 minPayment, uint256 safetyCapBps);
    event Paused(address indexed by);
    event Unpaused(address indexed by);
    event FundsReceived(address indexed sender, uint256 amount);

    /// @notice Allow contract to receive native CRO
    receive() external payable {
        emit FundsReceived(msg.sender, msg.value);
    }

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

    // [HACKATHON-DISABLED] Set the Identity Registry address
    /*
    function setIdentityRegistry(address _registry) external onlyAdmin {
        identityRegistry = HighStationIdentity(_registry);
        emit IdentityRegistryUpdated(_registry);
    }
    */

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
    function changeAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "New admin cannot be zero address");
        require(newAdmin != admin, "New admin must be different");
        
        address previousAdmin = admin;
        admin = newAdmin;
        
        emit AdminChanged(previousAdmin, newAdmin);
    }

    /// @notice Update contract parameters
    function setParams(uint256 _minPayment, uint256 _safetyCapBps) external onlyAdmin {
        require(_minPayment > 0, "Min payment must be > 0");
        require(_safetyCapBps <= 5000, "Cap cannot exceed 50%");
        
        minPayment = _minPayment;
        safetyCapBps = _safetyCapBps;
        
        emit ParamsUpdated(_minPayment, _safetyCapBps);
    }

    /// @notice Pay for service with dynamic fee
    /// @param serviceId Service Token ID (from Identity Registry)
    /// @param platformFee Expected platform fee
    function pay(uint256 serviceId, uint256 platformFee) external payable nonReentrant whenNotPaused {
        require(msg.value >= minPayment, "Payment too small");
        require(platformFee > 0, "Platform fee must be positive");
        require(platformFee < msg.value, "Fee cannot exceed payment");
        
        uint256 maxAllowedFee = (msg.value * safetyCapBps) / 10000; 
        require(platformFee <= maxAllowedFee, "Fee exceeds safety cap");

        // [HACKATHON-DISABLED] Validate Service Identity if Registry is set
        /*
        if (address(identityRegistry) != address(0)) {
            require(identityRegistry.ownerOf(serviceId) != address(0), "Service not registered or invalid ID");
        }
        */

        // Update Admin Fees
        totalAdminFees += platformFee;

        // [NEW] Accrue to specific service balance
        uint256 serviceShare = msg.value - platformFee;
        serviceBalances[serviceId] += serviceShare;

        emit PaymentProcessed(msg.sender, serviceId, msg.value, platformFee);
    }
    
    /// @notice Admin withdraws accumulated fees
    function withdrawAdminFees() external onlyAdmin nonReentrant {
        uint256 amount = totalAdminFees;
        require(amount > 0, "No fees to withdraw");
        
        totalAdminFees = 0;
        
        (bool success, ) = payable(admin).call{value: amount}("");
        require(success, "Transfer failed");
        
        emit FeeWithdrawn(admin, amount);
    }
    
    /// @notice Withdraw funds for a specific service ID to its current owner
    /// @param serviceId The Identity Token ID of the service
    function withdrawServiceBalance(uint256 serviceId) external nonReentrant {
        uint256 amount = serviceBalances[serviceId];
        require(amount > 0, "No funds for this service");
        
        // [HACKATHON-SIMPLIFIED] Admin-only withdrawal (no NFT ownership check)
        // In production with ERC-8004, this would check identityRegistry.ownerOf(serviceId)
        require(msg.sender == admin, "Only admin can withdraw service balance");
        address recipient = admin;

        /*
        // [ORIGINAL CODE - DISABLED]
        address recipient;
        if (address(identityRegistry) != address(0)) {
            recipient = identityRegistry.ownerOf(serviceId);
            require(recipient != address(0), "Invalid service owner");
        } else {
            require(msg.sender == admin, "Registry missing, only admin can withdraw");
            recipient = admin; 
        }
        */

        // Effects
        serviceBalances[serviceId] = 0;

        // Interaction
        (bool success, ) = payable(recipient).call{value: amount}("");
        require(success, "Transfer failed");
        
        emit ServiceProviderWithdrawn(serviceId, recipient, amount);
    }

    /// @notice Get contract balance
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /// @notice Get specific service balance
    function getServiceBalance(uint256 serviceId) external view returns (uint256) {
        return serviceBalances[serviceId];
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
