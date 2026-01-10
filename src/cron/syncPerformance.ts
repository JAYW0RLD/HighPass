import cron from 'node-cron';
import { OnChainSyncService } from '../services/OnChainSyncService';

/**
 * Cron Job: On-Chain Performance Sync
 * 
 * Schedule: Every hour at minute 0
 * Strategy: Threshold-based sync (only services with >5% change)
 * 
 * Gas Optimization:
 * - Only syncs services with significant metric changes
 * - Skips services that haven't changed
 * - Logs sync statistics for monitoring
 */

async function runSync() {
    const startTime = Date.now();
    console.log('\n========================================');
    console.log(`[Cron] Performance Sync Started: ${new Date().toISOString()}`);
    console.log('========================================\n');

    try {
        const syncService = new OnChainSyncService();
        await syncService.syncChangedServices();

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`\n[Cron] ✓ Sync completed in ${duration}s\n`);
    } catch (error) {
        console.error('[Cron] ✗ Sync failed:', error);
        // Don't throw - let cron continue
    }
}

// Schedule: Every hour at minute 0
// Example: 00:00, 01:00, 02:00, etc.
cron.schedule('0 * * * *', async () => {
    await runSync();
});

console.log('[Cron] Performance sync scheduled: Every hour at minute 0');

// For manual trigger (optional)
export { runSync };
