// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// [HACKATHON] ERC-8004 Identity System Disabled
// This contract implements NFT-based service identity management
// Disabled for hackathon simplification - uncomment to re-enable

/*
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title HighStationIdentity
 * @notice ERC-8004 Compliant Identity Registry for AI Agents/Services.
 * @dev Each token represents a unique Service/Agent Identity.
 *
contract HighStationIdentity is ERC721, Ownable {
    using Strings for uint256;

    // Service Slug Hash -> Token ID
    mapping(bytes32 => uint256) public slugToTokenId;
    
    // Token ID -> Metadata URI (e.g. Supabase API endpoint)
    mapping(uint256 => string) public tokenURIs;

    // Counter for generic IDs if needed, but we prefer hash-based
    uint256 public nextTokenId = 1;

    event ServiceMinted(address indexed to, uint256 indexed tokenId, string slug);
    event MetadataUpdated(uint256 indexed tokenId, string newUri);

    constructor() ERC721("HighStation Identity", "HSID") Ownable(msg.sender) {}

    /**
     * @notice Mint a new Identity Token for a service provider.
     * @param to The initial owner (Provider Wallet Address).
     * @param slug The unique service slug (e.g. "my-agent-service").
     * @param metadataUri Off-chain metadata URL.
     *
    function mintIdentity(address to, string memory slug, string memory metadataUri) external onlyOwner returns (uint256) {
        bytes32 slugHash = keccak256(abi.encodePacked(slug));
        require(slugToTokenId[slugHash] == 0, "Slug already registered");

        uint256 tokenId = uint256(slugHash); // Use hash as ID for deterministic lookup
        
        _safeMint(to, tokenId);
        slugToTokenId[slugHash] = tokenId;
        tokenURIs[tokenId] = metadataUri;

        emit ServiceMinted(to, tokenId, slug);
        return tokenId;
    }

    /**
     * @notice Update metadata URI.
     * @param tokenId The token ID to update.
     * @param newUri New metadata URI.
     *
    function setTokenURI(uint256 tokenId, string memory newUri) external {
        require(ownerOf(tokenId) == msg.sender || owner() == msg.sender, "Not authorized");
        tokenURIs[tokenId] = newUri;
        emit MetadataUpdated(tokenId, newUri);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return tokenURIs[tokenId];
    }

    /**
     * @notice Resolve slug to Token ID.
     *
    function getIdentityId(string memory slug) external view returns (uint256) {
        bytes32 slugHash = keccak256(abi.encodePacked(slug));
        return slugToTokenId[slugHash];
    }
}
*/
