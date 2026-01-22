import { useState, useEffect, useCallback } from 'react';
import { authenticatedFetch } from '../utils/apiClient';
import type { ProviderStats, ChartDataPoint, ServiceStats } from '../types';
import { useSettings } from '../contexts/SettingsContext';
// import { generateServiceAnalytics, aggregateAnalytics } from '../utils/mockAnalytics';

export function useProviderAnalytics() {
    const { showDemoData } = useSettings();
    const [providerStats, setProviderStats] = useState<ProviderStats | null>(null);
    const [serviceStats, setServiceStats] = useState<ServiceStats | null>(null);
    const [chartData, setChartData] = useState<ChartDataPoint[]>(() => {
        const now = Math.floor(Date.now() / 1000);
        return Array.from({ length: 10 }, (_, i) => ({
            time: now - (9 - i) * 3600,
            value: 0
        }));
    });

    const fetchAnalytics = useCallback(async (slug?: string) => {
        if (showDemoData) {
            // Use mock analytics utility
            const now = Math.floor(Date.now() / 1000);
            const mockTimeSeries = Array.from({ length: 24 }, (_, i) => ({
                time: now - (23 - i) * 3600,
                total: Math.floor(Math.random() * 500) + 100
            }));

            const max = Math.max(...mockTimeSeries.map(d => d.total));
            setChartData(mockTimeSeries.map(d => ({
                time: d.time,
                value: (d.total / max) * 100,
                rawValue: d.total
            })));

            setServiceStats({
                totalRequests: 8420,
                uniqueAgents: 12,
                totalRevenueWei: '1250000000000000000',
                avgLatency: 42
            });
            return;
        }

        try {
            const url = slug ? `/api/provider/analytics?slug=${slug}` : `/api/provider/analytics`;
            const res = await authenticatedFetch(url);

            if (res.ok) {
                const data = await res.json();
                if (data.timeSeries && data.timeSeries.length > 0) {
                    const max = Math.max(...data.timeSeries.map((d: { total: number }) => d.total));
                    setChartData(data.timeSeries.map((d: { time: number; total: number }) => ({
                        time: d.time,
                        value: max > 0 ? (d.total / max) * 100 : 0,
                        rawValue: d.total
                    })));
                } else {
                    setChartData([]);
                }

                if (data.stats) {
                    setServiceStats(data.stats);
                }
            }
        } catch (err) {
            console.error('Failed to fetch analytics:', err);
        }
    }, [showDemoData]);

    const fetchProviderStats = useCallback(async () => {
        if (showDemoData) {
            // Mock Provider Stats
            setProviderStats({
                totalCalls: 8420,
                totalRevenueWei: '1250000000000000000', // 1.25 ETH
                netRevenueWei: '1187500000000000000', // 95%
                protocolFeeWei: '62500000000000000', // 5%
                settlementAddress: '0x71C...demo',
                reliability: 0.99
            });
            return;
        }
        try {
            const res = await authenticatedFetch(`/api/provider/stats`);
            if (!res.ok) throw new Error('Failed to fetch stats');
            const data = await res.json();
            setProviderStats(data);
        } catch (err) {
            console.error('Error fetching provider stats:', err);
        }
    }, [showDemoData]);

    useEffect(() => {
        fetchAnalytics();
        fetchProviderStats();
        const interval = setInterval(() => {
            fetchAnalytics();
            fetchProviderStats();
        }, 60000);
        return () => clearInterval(interval);
    }, [fetchAnalytics, fetchProviderStats]);

    return {
        providerStats,
        serviceStats,
        chartData,
        refresh: (slug?: string) => {
            fetchAnalytics(slug);
            fetchProviderStats();
        }
    };
}
