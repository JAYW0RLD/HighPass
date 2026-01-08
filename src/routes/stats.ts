import { Router, Request, Response } from 'express';
import { getStats } from '../database/db';
import { createPublicClient, http } from 'viem';

const router = Router();

router.get('/stats', async (req: Request, res: Response) => {
    try {
        const stats = await getStats();

        // Get admin wallet balance from blockchain
        const adminAddress = process.env.ADMIN_WALLET_ADDRESS as `0x${string}`;
        if (adminAddress) {
            const client = createPublicClient({
                chain: {
                    id: 240,
                    name: 'Cronos zkEVM Testnet',
                    nativeCurrency: { decimals: 18, name: 'Cronos', symbol: 'TCRO' },
                    rpcUrls: {
                        default: { http: ['https://testnet.zkevm.cronos.org'] },
                        public: { http: ['https://testnet.zkevm.cronos.org'] }
                    }
                },
                transport: http('https://testnet.zkevm.cronos.org')
            });

            const balance = await client.getBalance({ address: adminAddress });
            (stats as any).adminBalanceWei = balance.toString();
        }

        res.json(stats);
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

export default router;
