import { useMemo } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar
} from 'recharts';

interface AdminChartsProps {
    logs: any[];
}

export default function AdminCharts({ logs }: AdminChartsProps) {
    const chartData = useMemo(() => {
        // Group logs by minute or just take the last 30 requests to show trend
        // For a more realistic look, let's group by 10-second intervals or similar
        // For now, we'll just map the last 20 logs to a simple trend
        const sorted = [...logs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        // Simple mock of traffic volume over the last 10 'slots'
        const groups: { [key: string]: { count: number, revenue: number } } = {};

        sorted.forEach(log => {
            const time = new Date(log.timestamp);
            const key = `${time.getHours()}:${time.getMinutes()}:${Math.floor(time.getSeconds() / 10) * 10}`;
            if (!groups[key]) groups[key] = { count: 0, revenue: 0 };
            groups[key].count += 1;
            groups[key].revenue += log.status === 200 ? Number(log.amount) / 1e18 : 0;
        });

        return Object.entries(groups).map(([time, val]) => ({
            time,
            requests: val.count,
            revenue: val.revenue
        })).slice(-15);
    }, [logs]);

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', width: '100%' }}>
            <div className="chart-container" style={{ background: '#0a0a0c', border: '1px solid #1a1a1c', borderRadius: '12px', padding: '16px', height: '200px' }}>
                <div style={{ fontSize: '12px', color: '#888', marginBottom: '12px', fontWeight: 'bold' }}>TRAFFIC (REQ/10S)</div>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="colorReq" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1c" vertical={false} />
                        <XAxis dataKey="time" hide />
                        <YAxis hide />
                        <Tooltip
                            contentStyle={{ background: '#0a0a0c', border: '1px solid #1a1a1c', fontSize: '10px' }}
                            itemStyle={{ color: '#3b82f6' }}
                        />
                        <Area type="monotone" dataKey="requests" stroke="#3b82f6" fillOpacity={1} fill="url(#colorReq)" isAnimationActive={false} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            <div className="chart-container" style={{ background: '#0a0a0c', border: '1px solid #1a1a1c', borderRadius: '12px', padding: '16px', height: '200px' }}>
                <div style={{ fontSize: '12px', color: '#888', marginBottom: '12px', fontWeight: 'bold' }}>EXP: TRUST SCORE (DECISION COMPRESSION)</div>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={logs.map((l, i) => ({ i, score: l.trustSignal?.computed_score || 0.85 })).slice(-20)}>
                        <defs>
                            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1c" vertical={false} />
                        <XAxis dataKey="i" hide />
                        <YAxis domain={[0, 1]} hide />
                        <Tooltip
                            contentStyle={{ background: '#0a0a0c', border: '1px solid #1a1a1c', fontSize: '10px' }}
                            itemStyle={{ color: '#8b5cf6' }}
                        />
                        <Area type="monotone" dataKey="score" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorScore)" isAnimationActive={false} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            <div className="chart-container" style={{ background: '#0a0a0c', border: '1px solid #1a1a1c', borderRadius: '12px', padding: '16px', height: '200px', gridColumn: 'span 2' }}>
                <div style={{ fontSize: '12px', color: '#888', marginBottom: '12px', fontWeight: 'bold' }}>REVENUE (CRO)</div>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1c" vertical={false} />
                        <XAxis dataKey="time" hide />
                        <YAxis hide />
                        <Tooltip
                            contentStyle={{ background: '#0a0a0c', border: '1px solid #1a1a1c', fontSize: '10px' }}
                            itemStyle={{ color: '#10b981' }}
                        />
                        <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
