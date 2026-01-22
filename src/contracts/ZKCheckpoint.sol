// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IValidationRegistry.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ZKCheckpoint
 * @notice Batch ZK Checkpoint Registry implementing Standard Validation Interface.
 * @dev Stores Merkle Roots as validation evidence for Service Identities.
 */
contract ZKCheckpoint is IValidationRegistry, Ownable {
    
    struct Checkpoint {
        uint256 subjectId;
        uint256 batchIndex;
        string merkleRoot;
        uint256 timestamp;
        address prover;
    }

    // Validation ID -> Checkpoint
    mapping(uint256 => Checkpoint) public checkpoints;
    uint256 public nextValidationId = 1;

    // Prover Allowlist
    mapping(address => bool) public provers;

    event ProverStatusChanged(address indexed prover, bool isActive);

    modifier onlyProver() {
        require(provers[msg.sender], "Not authorized prover");
        _;
    }

    constructor() Ownable(msg.sender) {
        provers[msg.sender] = true; // Owner is default prover
    }

    function setProverStatus(address prover, bool isActive) external onlyOwner {
        provers[prover] = isActive;
        emit ProverStatusChanged(prover, isActive);
    }

    /**
     * @notice Standard Validation Record function.
     * @dev Used to anchor a Merkle Root (evidence) for a Service (subjectId).
     */
    function recordValidation(
        uint256 subjectId,
        bool result,
        string memory evidence
    ) external onlyProver returns (uint256) {
        require(result == true, "ZKCheckpoint only records valid batches");
        
        uint256 validationId = nextValidationId++;
        
        checkpoints[validationId] = Checkpoint({
            subjectId: subjectId,
            batchIndex: block.timestamp, // Using timestamp as implicit batch index if not provided
            merkleRoot: evidence,
            timestamp: block.timestamp,
            prover: msg.sender
        });

        emit ValidationRecordCreated(validationId, subjectId, msg.sender, result, evidence);
        return validationId;
    }

    /**
     * @notice Extended function for detailed Batch Checkpointing
     * @dev Use this if you want to enforce batch indexing logic explicitly.
     */
    function submitBatchCheckpoint(
        uint256 subjectId,
        uint256 batchIndex,
        string memory merkleRoot
    ) external onlyProver returns (uint256) {
        uint256 validationId = nextValidationId++;
        
        checkpoints[validationId] = Checkpoint({
            subjectId: subjectId,
            batchIndex: batchIndex,
            merkleRoot: merkleRoot,
            timestamp: block.timestamp,
            prover: msg.sender
        });

        emit ValidationRecordCreated(validationId, subjectId, msg.sender, true, merkleRoot);
        return validationId;
    }
}
