// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IValidationRegistry
 * @notice Standard interface for recording validation results of Agentic Tasks.
 * @dev Aligns but simplifies ERC-8004 Validation Registry concepts.
 */
interface IValidationRegistry {
    event ValidationRecordCreated(
        uint256 indexed validationId,
        uint256 indexed subjectId, // The Identity Token ID being validated
        address indexed validator,
        bool result,
        string evidence
    );

    /**
     * @notice Submit a validation result.
     * @param subjectId The Token ID of the Identity being validated.
     * @param result True if valid, false otherwise.
     * @param evidence IPFS hash, Merkle Root, or other proof data.
     * @return validationId The unique ID of this validation record.
     */
    function recordValidation(
        uint256 subjectId,
        bool result,
        string memory evidence
    ) external returns (uint256 validationId);
}
