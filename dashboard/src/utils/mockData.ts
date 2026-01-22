import type { ChartDataPoint } from '../types';

export const generateMockChartData = (): ChartDataPoint[] => {
    const data: ChartDataPoint[] = [];
    const now = Math.floor(Date.now() / 1000);

    // Generate last 24h data points (one per hour)
    for (let i = 24; i >= 0; i--) {
        data.push({
            time: (now - i * 3600) as any, // casting for lightweight-charts compatibility
            value: Math.floor(Math.random() * 100) + 50, // Calls
            revenue: Math.random() * 0.5 // Revenue
        });
    }
    return data;
};
