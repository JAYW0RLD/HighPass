import { createPublicClient, createWalletClient, http, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { cronosTestnet } from 'viem/chains';
import { getSupabase } from '../utils/supabase';

/**
 * On-Chain Performance Sync Service
 * Syncs provider performance metrics from PostgreSQL to blockchain
 * 
 * Design Principles:
 * - Gas Optimization: Only sync when metrics change > 5%
 * - Self-Testing Allowed: No minimum unique agent requirement
 * - Sliding Window Priority: Use 7-day metrics for current state
 */

interface PerformanceMetrics {
    service_slug: string;
    avg_latency_ms: number;
    success_rate: number;
    total_requests: number;
    total_successes: number;
    avg_latency_ms_7d: number;
    success_rate_7d: number;
    unique_agent_count: number;
    last_onchain_sync: string | null;
    onchain_sync_count: number;
    updated_at: string;
}

interface OnChainMetrics {
    avgLatencyMs: number;
    successRate: number;
    totalRequests: number;
    totalSuccesses: number;
    uniqueAgentCount: number;
}

export class OnChainSyncService {
    private readonly SYNC_THRESHOLD_PERCENT = 5; // 5% change threshold
    private readonly CONTRACT_ADDRESS: `0x${string}`;
    private client;
    private walletClient;
    private supabase;

    constructor() {
        const contractAddress = process.env.PERFORMANCE_REGISTRY_ADDRESS;
        if (!contractAddress) {
            throw new Error('PERFORMANCE_REGISTRY_ADDRESS not set in environment');
        }
        this.CONTRACT_ADDRESS = contractAddress as `0x${string}`;

        // Public client for reading
        this.client = createPublicClient({
            chain: cronosTestnet,
            transport: http(process.env.CRONOS_RPC_URL || 'https://evm-t3.cronos.org')
        });

        // Wallet client for writing (transactions)
        const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
        if (!privateKey) {
            throw new Error('DEPLOYER_PRIVATE_KEY not set');
        }
        const account = privateKeyToAccount(privateKey as `0x${string}`);
        this.walletClient = createWalletClient({
            account,
            chain: cronosTestnet,
            transport: http(process.env.CRONOS_RPC_URL || 'https://evm-t3.cronos.org')
        });

        this.supabase = getSupabase();
        if (!this.supabase) {
            throw new Error('Supabase client not initialized');
        }
    }

    /**
     * Sync all services (use with caution - high gas cost)
     */
    async syncAllPerformanceMetrics(): Promise<void> {
        console.log('[OnChainSync] Starting full sync...');

        const { data: metrics, error } = await this.supabase
            .from('provider_performance_metrics')
            .select('*')
            .order('total_requests', { ascending: false });

        if (error) {
            console.error('[OnChainSync] Error fetching metrics:', error);
            throw error;
        }

        if (!metrics || metrics.length === 0) {
            console.log('[OnChainSync] No metrics to sync');
            return;
        }

        console.log(`[OnChainSync] Syncing ${metrics.length} services...`);

        for (const metric of metrics) {
            try {
                await this.syncServicePerformance(metric.service_slug);
            } catch (error) {
                console.error(`[OnChainSync] Failed to sync ${metric.service_slug}:`, error);
                // Continue with other services
            }
        }

        console.log('[OnChainSync] Full sync complete');
    }

    /**
     * Sync a specific service
     */
    async syncServicePerformance(serviceSlug: string): Promise<void> {
        const { data: metric, error } = await this.supabase
            .from('provider_performance_metrics')
            .select('*')
            .eq('service_slug', serviceSlug)
            .single();

        if (error || !metric) {
            console.error(`[OnChainSync] Service ${serviceSlug} not found`);
            return;
        }

        // Use 7-day sliding window metrics (priority)
        const metricsToSync: OnChainMetrics = {
            avgLatencyMs: Math.round(metric.avg_latency_ms_7d || metric.avg_latency_ms),
            successRate: Math.round((metric.success_rate_7d || metric.success_rate) * 100), // Convert to 0-10000
            totalRequests: metric.total_requests,
            totalSuccesses: metric.total_successes,
            uniqueAgentCount: metric.unique_agent_count
        };

        await this.writeToBlockchain(serviceSlug, metricsToSync);

        // Update sync metadata
        await this.supabase
            .from('provider_performance_metrics')
            .update({
                last_onchain_sync: new Date().toISOString(),
                onchain_sync_count: metric.onchain_sync_count + 1
            })
            .eq('service_slug', serviceSlug);

        console.log(`[OnChainSync] ✓ Synced ${serviceSlug} to blockchain`);
    }

    /**
     * Sync only services with significant changes (> 5%)
     * Gas-optimized approach
     */
    async syncChangedServices(): Promise<void> {
        console.log('[OnChainSync] Starting threshold-based sync...');

        const { data: metrics, error } = await this.supabase
            .from('provider_performance_metrics')
            .select('*')
            .order('updated_at', { ascending: false });

        if (error || !metrics) {
            console.error('[OnChainSync] Error fetching metrics:', error);
            return;
        }

        let syncedCount = 0;
        let skippedCount = 0;

        for (const metric of metrics) {
            try {
                const shouldSync = await this.shouldSyncService(metric);

                if (shouldSync) {
                    await this.syncServicePerformance(metric.service_slug);
                    syncedCount++;
                } else {
                    skippedCount++;
                }
            } catch (error) {
                console.error(`[OnChainSync] Error processing ${metric.service_slug}:`, error);
            }
        }

        console.log(`[OnChainSync] Threshold sync complete: ${syncedCount} synced, ${skippedCount} skipped`);
    }

    /**
     * Determine if a service should be synced
     * Criteria: 
     * - Never synced before
     * - Latency changed > 5%
     * - Success rate changed > 5 percentage points
     */
    private async shouldSyncService(metric: PerformanceMetrics): Promise<boolean> {
        // First sync
        if (!metric.last_onchain_sync) {
            console.log(`[OnChainSync] ${metric.service_slug}: First sync`);
            return true;
        }

        // Get current on-chain metrics
        try {
            const onChainMetrics = await this.readFromBlockchain(metric.service_slug);

            if (!onChainMetrics || onChainMetrics.lastUpdated === 0) {
                console.log(`[OnChainSync] ${metric.service_slug}: No on-chain data, syncing`);
                return true;
            }

            // Use 7-day window for comparison (current state)
            const currentLatency = metric.avg_latency_ms_7d || metric.avg_latency_ms;
            const currentSuccessRate = (metric.success_rate_7d || metric.success_rate) * 100; // 0-10000

            // Calculate changes
            const latencyChange = Math.abs(currentLatency - onChainMetrics.avgLatencyMs) /
                Math.max(onChainMetrics.avgLatencyMs, 1);
            const successRateChange = Math.abs(currentSuccessRate - onChainMetrics.successRate);

            const shouldSync = latencyChange > (this.SYNC_THRESHOLD_PERCENT / 100) ||
                successRateChange > (this.SYNC_THRESHOLD_PERCENT * 100);

            if (shouldSync) {
                console.log(`[OnChainSync] ${metric.service_slug}: Change detected (latency: ${(latencyChange * 100).toFixed(1)}%, rate: ${(successRateChange / 100).toFixed(1)}pp)`);
            }

            return shouldSync;
        } catch (error) {
            console.error(`[OnChainSync] Error checking ${metric.service_slug}:`, error);
            return false;
        }
    }

    /**
     * Read performance metrics from blockchain
     */
    private async readFromBlockchain(serviceName: string): Promise<any> {
        const abi = parseAbi([
            'function getPerformanceMetrics(string memory serviceName) external view returns (tuple(uint64 avgLatencyMs, uint32 successRate, uint64 totalRequests, uint64 totalSuccesses, uint32 uniqueAgentCount, uint64 lastUpdated))'
        ]);

        const data = await this.client.readContract({
            address: this.CONTRACT_ADDRESS,
            abi,
            functionName: 'getPerformanceMetrics',
            args: [serviceName]
        });

        return {
            avgLatencyMs: Number(data[0]),
            successRate: Number(data[1]),
            totalRequests: Number(data[2]),
            totalSuccesses: Number(data[3]),
            uniqueAgentCount: Number(data[4]),
            lastUpdated: Number(data[5])
        };
    }

    /**
     * Write performance metrics to blockchain
     */
    private async writeToBlockchain(serviceName: string, metrics: OnChainMetrics): Promise<void> {
        const abi = parseAbi([
            'function updatePerformanceMetrics(string memory serviceName, uint64 avgLatencyMs, uint32 successRate, uint64 totalRequests, uint64 totalSuccesses, uint32 uniqueAgentCount) external'
        ]);

        const { request } = await this.client.simulateContract({
            address: this.CONTRACT_ADDRESS,
            abi,
            functionName: 'updatePerformanceMetrics',
            args: [
                serviceName,
                BigInt(metrics.avgLatencyMs),
                metrics.successRate,
                BigInt(metrics.totalRequests),
                BigInt(metrics.totalSuccesses),
                metrics.uniqueAgentCount
            ],
            account: this.walletClient.account
        });

        const hash = await this.walletClient.writeContract(request);

        console.log(`[OnChainSync] Transaction submitted: ${hash}`);

        // Wait for confirmation
        const receipt = await this.client.waitForTransactionReceipt({ hash });

        if (receipt.status === 'success') {
            console.log(`[OnChainSync] ✓ Transaction confirmed: ${hash}`);
        } else {
            throw new Error(`Transaction failed: ${hash}`);
        }
    }
}
