import { HermesClient } from "@pythnetwork/hermes-client";

// Pyth Hermes URL (Public)
const HERMES_URL = "https://hermes.pyth.network";

// Price Feed IDs (Cronos zkEVM Testnet / General EVM)
// CRO/USD: 0x23199c2bcb1303f667e733b9934db9eca5991e765b45f5ed18bc4b231415f2fe
const PRICE_FEEDS = {
    CRO: "0x23199c2bcb1303f667e733b9934db9eca5991e765b45f5ed18bc4b231415f2fe"
};

export class PriceService {
    private hermes: HermesClient;

    constructor() {
        this.hermes = new HermesClient(HERMES_URL);
    }

    /**
     * Get the current price of an asset in USD.
     * @param asset 'CRO'
     * @returns Price in USD as a number (e.g., 0.15)
     */
    async getPrice(asset: keyof typeof PRICE_FEEDS): Promise<number> {
        try {
            const priceUpdates = await this.hermes.getLatestPriceUpdates([PRICE_FEEDS[asset]]);

            if (!priceUpdates || !priceUpdates.parsed || priceUpdates.parsed.length === 0) {
                throw new Error("No price updates found");
            }

            const parsed = priceUpdates.parsed[0];
            const price = parsed.price;

            // Pyth price is price * 10^expo
            // e.g., price = 15000000, expo = -8 => 0.15
            const actualPrice = Number(price.price) * Math.pow(10, price.expo);

            console.log(`[PriceService] ${asset} Price: $${actualPrice}`);
            return actualPrice;
        } catch (error) {
            console.error("[PriceService] Error fetching price:", error);
            // Fail-closed: Rethrow to prevent operating with stale/invalid prices
            throw error;
        }
    }

    /**
     * Calculate how many tokens act as $0.01 USD.
     * @param asset 'CRO'
     * @param targetUsdValue Default 0.01
     * @returns Amount in WEI (BigInt)
     */
    async getPaymentAmountWei(asset: keyof typeof PRICE_FEEDS, targetUsdValue: number = 0.01): Promise<bigint> {
        if (!PRICE_FEEDS[asset]) {
            throw new Error(`Invalid asset: ${asset}`);
        }
        if (targetUsdValue <= 0) {
            throw new Error("Target USD value must be positive");
        }

        const priceUsd = await this.getPrice(asset);

        // targetUsdValue / priceUsd = tokens needed
        // e.g. 0.01 / 0.10 = 0.1 tokens
        // 0.1 tokens * 10^18 wei

        const tokensNeeded = targetUsdValue / priceUsd;
        const wei = BigInt(Math.floor(tokensNeeded * 1e18)); // Assuming 18 decimals for CRO

        return wei;
    }
}
