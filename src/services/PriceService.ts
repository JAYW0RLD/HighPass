import axios from "axios";

// Pyth Hermes URL (Public)
const HERMES_URL = "https://hermes.pyth.network";

// Price Feed IDs
// CRO/USD: 23199c2bcb1303f667e733b9934db9eca5991e765b45f5ed18bc4b231415f2fe
const PRICE_FEEDS = {
    CRO: process.env.PYTH_PRICE_FEED_ID || "23199c2bcb1303f667e733b9934db9eca5991e765b45f5ed18bc4b231415f2fe"
};

export class PriceService {
    private priceCache: { price: number; timestamp: number } | null = null;
    private readonly CACHE_DURATION_MS = 60000; // 1 minute

    /**
     * Get the current price of an asset in USD.
     * @param asset 'CRO'
     * @returns Price in USD as a number (e.g., 0.15)
     */
    async getPrice(asset: keyof typeof PRICE_FEEDS): Promise<number> {
        try {
            // Check cache
            if (this.priceCache && Date.now() - this.priceCache.timestamp < this.CACHE_DURATION_MS) {
                console.log(`[PriceService] Using cached ${asset} price: $${this.priceCache.price}`);
                return this.priceCache.price;
            }

            // Direct API call to Hermes v2
            const feedId = PRICE_FEEDS[asset];
            const params = new URLSearchParams();
            params.append('ids[]', feedId);
            const url = `${HERMES_URL}/v2/updates/price/latest?${params.toString()}`;

            console.log(`[PriceService] Requesting: ${url}`);
            const response = await axios.get(url);

            const priceUpdates = response.data;

            if (!priceUpdates || !priceUpdates.parsed || priceUpdates.parsed.length === 0) {
                throw new Error("No price updates found in Hermes response");
            }

            const parsed = priceUpdates.parsed[0];
            const priceInfo = parsed.price;

            // Pyth price is price * 10^expo
            const actualPrice = Number(priceInfo.price) * Math.pow(10, priceInfo.expo);

            // Update cache
            this.priceCache = { price: actualPrice, timestamp: Date.now() };

            console.log(`[PriceService] ${asset} Price: $${actualPrice}`);
            return actualPrice;
        } catch (error: any) {
            console.error("[PriceService] Error fetching price:", error.message);
            if (error.response) {
                console.error("[PriceService] Hermes Error Response:", error.response.data);
            }
            throw error;
        }
    }

    /**
     * v1.6.1: Convert CRO (bigint wei) to USD
     * @param croWei Amount in wei
     * @returns USD amount
     */
    async croToUsd(croWei: bigint): Promise<number> {
        const croPrice = await this.getPrice('CRO');
        const croAmount = Number(croWei) / 1e18;
        const usdAmount = croAmount * croPrice;

        console.log(`[PriceService] ${croAmount.toFixed(4)} CRO → $${usdAmount.toFixed(4)}`);
        return usdAmount;
    }

    /**
     * v1.6.1: Convert USD to CRO (bigint wei)
     * @param usdAmount USD amount
     * @returns CRO in wei
     */
    async usdToCro(usdAmount: number): Promise<bigint> {
        const croPrice = await this.getPrice('CRO');
        const croAmount = usdAmount / croPrice;
        const croWei = BigInt(Math.floor(croAmount * 1e18));

        console.log(`[PriceService] $${usdAmount.toFixed(4)} → ${croAmount.toFixed(4)} CRO`);
        return croWei;
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
        const tokensNeeded = targetUsdValue / priceUsd;
        const wei = BigInt(Math.floor(tokensNeeded * 1e18)); // Assuming 18 decimals for CRO

        return wei;
    }
}
