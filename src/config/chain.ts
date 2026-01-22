import { defineChain } from 'viem';

// Configurable via Environment Variables
const CHAIN_ID = parseInt(process.env.CHAIN_ID || '338'); // Default to Cronos EVM Testnet (338)
const RPC_URL = process.env.RPC_URL || 'https://evm-t3.cronos.org';
const EXPLORER_URL = process.env.EXPLORER_URL || 'https://explorer.cronos.org/testnet';

// Custom App Configuration including Contracts
export const CHAIN_CONFIG = {
    id: CHAIN_ID,
    name: process.env.CHAIN_NAME || 'Cronos EVM Testnet',
    nativeCurrency: {
        decimals: 18,
        name: 'Cronos',
        symbol: 'TCRO',
    },
    rpcUrls: {
        default: { http: [RPC_URL] },
        public: { http: [RPC_URL] },
    },
    blockExplorers: {
        default: { name: 'Explorer', url: EXPLORER_URL },
    },
    contracts: {
        paymentHandler: process.env.PAYMENT_HANDLER_ADDRESS as `0x${string}`,
        identity: process.env.IDENTITY_CONTRACT_ADDRESS as `0x${string}`,
        performanceRegistry: process.env.PERFORMANCE_REGISTRY_ADDRESS as `0x${string}`,
        reputationRegistry: process.env.REPUTATION_REGISTRY_ADDRESS as `0x${string}`,
        // Pyth Price Feed ID for TCRO/USD on Cronos Testnet
        pythPriceFeedId: process.env.PYTH_PRICE_FEED_ID || "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac6"
    }
} as const;

// Standard Viem Chain Definition (Omit custom contracts)
export const activeChain = defineChain({
    id: CHAIN_CONFIG.id,
    name: CHAIN_CONFIG.name,
    nativeCurrency: CHAIN_CONFIG.nativeCurrency,
    rpcUrls: CHAIN_CONFIG.rpcUrls,
    blockExplorers: CHAIN_CONFIG.blockExplorers,
    // Add standard contracts if needed, but avoiding custom ones here to prevent Type Errors
});
