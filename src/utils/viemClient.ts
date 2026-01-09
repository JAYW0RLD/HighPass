import { createPublicClient, http, defineChain } from 'viem';
// Load env vars via centralized loader
import './env';

const CHAIN_ID = Number(process.env.CHAIN_ID) || 240; // Default to Cronos zkEVM Testnet
const RPC_URL = process.env.RPC_URL || 'https://rpc-t3.cronos-zkevm.org';

// Define Chain Configuration
export const currentChain = defineChain({
    id: CHAIN_ID,
    name: 'Cronos zkEVM',
    network: 'cronos-zkevm',
    nativeCurrency: { decimals: 18, name: 'Cronos', symbol: 'TCRO' },
    rpcUrls: { default: { http: [RPC_URL] }, public: { http: [RPC_URL] } }
});

// Singleton Public Client
export const publicClient = createPublicClient({
    chain: currentChain,
    transport: http(RPC_URL)
});

console.log(`[Viem] Client initialized for Chain ID ${CHAIN_ID} at ${RPC_URL}`);
