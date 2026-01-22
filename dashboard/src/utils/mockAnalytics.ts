import type { Service } from '../types';

export interface ServiceAnalytics {
    serviceId: string;
    serviceName: string;
    stats: {
        totalRequests: number;
        totalRevenueWei: string;
        avgLatencyMs: number;
        successRate: number; // 0-100
        changePercent: number; // day-over-day change
    };
    chartData: {
        time: number; // Unix timestamp
        requests: number;
        successRate: number;
    }[];
    recentActivity: {
        timestamp: number;
        agentId: string;
        status: 'success' | 'failed';
        latencyMs: number;
        revenueWei: string;
    }[];
}

export const generateServiceAnalytics = (services: Service[]): ServiceAnalytics[] => {
    return services.map(service => {
        // Generate realistic stats
        const baseRequests = Math.floor(Math.random() * 1000) + 100;
        const successRate = 95 + Math.random() * 5; // 95-100%
        const avgLatency = Math.floor(Math.random() * 100) + 50; // 50-150ms
        const priceWei = BigInt(service.price_wei || '0');
        const totalRevenueWei = (priceWei * BigInt(baseRequests)).toString();
        const changePercent = (Math.random() - 0.3) * 30; // -9% to +21%

        // Generate 24 hours of chart data (hourly)
        const now = Date.now();
        const chartData = Array.from({ length: 24 }, (_, i) => {
            const time = now - (23 - i) * 3600 * 1000;
            const hourlyRequests = Math.floor(baseRequests / 24 * (0.5 + Math.random()));
            const hourlySuccessRate = 90 + Math.random() * 10;
            return {
                time: Math.floor(time / 1000),
                requests: hourlyRequests,
                successRate: hourlySuccessRate
            };
        });

        // Generate recent activity (10 items)
        const recentActivity = Array.from({ length: 10 }, (_, i) => {
            const timestamp = now - i * 300000; // Every 5 minutes
            const isSuccess = Math.random() > 0.05; // 95% success
            return {
                timestamp: Math.floor(timestamp / 1000),
                agentId: `0x${Math.random().toString(16).substring(2, 10)}`,
                status: isSuccess ? 'success' as const : 'failed' as const,
                latencyMs: Math.floor(Math.random() * 200) + 50,
                revenueWei: isSuccess ? service.price_wei : '0'
            };
        });

        return {
            serviceId: service.id || '',
            serviceName: service.name,
            stats: {
                totalRequests: baseRequests,
                totalRevenueWei,
                avgLatencyMs: avgLatency,
                successRate,
                changePercent
            },
            chartData,
            recentActivity
        };
    });
};

export const aggregateAnalytics = (analyticsArray: ServiceAnalytics[]): ServiceAnalytics => {
    if (analyticsArray.length === 0) {
        return {
            serviceId: 'all',
            serviceName: 'All Services',
            stats: {
                totalRequests: 0,
                totalRevenueWei: '0',
                avgLatencyMs: 0,
                successRate: 0,
                changePercent: 0
            },
            chartData: [],
            recentActivity: []
        };
    }

    // Aggregate stats
    const totalRequests = analyticsArray.reduce((sum, a) => sum + a.stats.totalRequests, 0);
    const totalRevenueWei = analyticsArray
        .reduce((sum, a) => sum + BigInt(a.stats.totalRevenueWei), BigInt(0))
        .toString();
    const avgLatencyMs = Math.floor(
        analyticsArray.reduce((sum, a) => sum + a.stats.avgLatencyMs, 0) / analyticsArray.length
    );
    const successRate = analyticsArray.reduce((sum, a) => sum + a.stats.successRate, 0) / analyticsArray.length;
    const changePercent = analyticsArray.reduce((sum, a) => sum + a.stats.changePercent, 0) / analyticsArray.length;

    // Merge chart data (sum requests by time)
    const timeMap = new Map<number, { requests: number; successRate: number; count: number }>();
    analyticsArray.forEach(analytics => {
        analytics.chartData.forEach(point => {
            const existing = timeMap.get(point.time) || { requests: 0, successRate: 0, count: 0 };
            timeMap.set(point.time, {
                requests: existing.requests + point.requests,
                successRate: existing.successRate + point.successRate,
                count: existing.count + 1
            });
        });
    });

    const chartData = Array.from(timeMap.entries())
        .map(([time, data]) => ({
            time,
            requests: data.requests,
            successRate: data.successRate / data.count
        }))
        .sort((a, b) => a.time - b.time);

    // Merge recent activity
    const allActivity = analyticsArray.flatMap(a => a.recentActivity);
    const recentActivity = allActivity
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 10);

    return {
        serviceId: 'all',
        serviceName: 'All Services',
        stats: {
            totalRequests,
            totalRevenueWei,
            avgLatencyMs,
            successRate,
            changePercent
        },
        chartData,
        recentActivity
    };
};
