import { useState, useMemo } from 'react';
import type { Service } from '../types';
import { generateServiceAnalytics, aggregateAnalytics } from '../utils/mockAnalytics';
import {
    ActivityIcon,
    ArrowUpRightIcon,
    CheckIcon,
    XIcon as CloseIcon,
    ChevronRightIcon
} from './Icons';
import { ResponsiveContainer, AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useSettings } from '../contexts/SettingsContext';

interface ServiceAnalyticsSectionProps {
    services: Service[];
}

export default function ServiceAnalyticsSection({ services }: ServiceAnalyticsSectionProps) {
    const { showDemoData } = useSettings();
    const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(['all']);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // Generate mock analytics for all services
    const analyticsData = useMemo(() => {
        if (!showDemoData) return [];
        return generateServiceAnalytics(services);
    }, [services, showDemoData]);

    // Filter data based on selection
    const currentAnalytics = useMemo(() => {
        if (!showDemoData || services.length === 0 || analyticsData.length === 0) {
            return {
                serviceId: 'all',
                serviceName: 'No Data',
                stats: { totalRequests: 0, totalRevenueWei: '0', avgLatencyMs: 0, successRate: 0, changePercent: 0 },
                chartData: [],
                recentActivity: []
            };
        }

        if (selectedServiceIds.includes('all') || selectedServiceIds.length === 0) {
            return aggregateAnalytics(analyticsData);
        }

        const selectedData = analyticsData.filter(d => selectedServiceIds.includes(d.serviceId));
        if (selectedData.length === 1) return selectedData[0];
        if (selectedData.length > 1) return aggregateAnalytics(selectedData);

        return aggregateAnalytics(analyticsData);
    }, [selectedServiceIds, analyticsData, services.length, showDemoData]);

    const revenueEth = Number(BigInt(currentAnalytics.stats.totalRevenueWei)) / 1e18;
    const revenueUsd = revenueEth * 2400; // Mock ETH price

    return (
        <section className="space-y-6 mt-12 animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-3">
                <ActivityIcon className="w-6 h-6 text-emerald-500" />
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Service Analytics</h2>
            </div>

            {/* Multiselect Dropdown */}
            <div className="relative inline-block text-left mb-4">
                <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold shadow-sm hover:border-emerald-300 transition-all min-w-[200px] justify-between"
                >
                    <span className="truncate">
                        {selectedServiceIds.includes('all')
                            ? 'All Services'
                            : selectedServiceIds.length === 1
                                ? services.find(s => s.id === selectedServiceIds[0])?.name || '1 Service'
                                : `${selectedServiceIds.length} Services Selected`}
                    </span>
                    <ChevronRightIcon className={`w-4 h-4 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-90' : ''}`} />
                </button>

                {isDropdownOpen && (
                    <div className="absolute left-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="space-y-1 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                            <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded-md cursor-pointer transition-colors">
                                <input
                                    type="checkbox"
                                    checked={selectedServiceIds.includes('all')}
                                    onChange={() => {
                                        if (selectedServiceIds.includes('all')) {
                                            setSelectedServiceIds([]);
                                        } else {
                                            setSelectedServiceIds(['all']);
                                        }
                                    }}
                                    className="w-4 h-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                                />
                                <span className="text-sm font-medium text-slate-700">All Services</span>
                            </label>
                            <div className="h-px bg-slate-100 my-1 mx-2" />
                            {services.map(service => (
                                <label key={service.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded-md cursor-pointer transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={selectedServiceIds.includes(service.id || '')}
                                        onChange={() => {
                                            let newIds = [...selectedServiceIds].filter(id => id !== 'all');
                                            if (selectedServiceIds.includes(service.id || '')) {
                                                newIds = newIds.filter(id => id !== service.id);
                                            } else {
                                                newIds.push(service.id || '');
                                            }
                                            if (newIds.length === 0 || newIds.length === services.length) {
                                                setSelectedServiceIds(['all']);
                                            } else {
                                                setSelectedServiceIds(newIds);
                                            }
                                        }}
                                        className="w-4 h-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                                    />
                                    <span className="text-sm text-slate-600 truncate">{service.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Requests */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Requests</h3>
                        <div className={`text-xs font-bold ${currentAnalytics.stats.changePercent >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {currentAnalytics.stats.changePercent >= 0 ? '+' : ''}{currentAnalytics.stats.changePercent.toFixed(1)}%
                        </div>
                    </div>
                    <div className="flex items-baseline gap-3">
                        <span className="text-3xl font-black text-slate-900">
                            {currentAnalytics.stats.totalRequests.toLocaleString()}
                        </span>
                        <span className="text-sm text-slate-400">reqs</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">Last 24 hours</p>
                </div>

                {/* Total Revenue */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Revenue</h3>
                        <ArrowUpRightIcon className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-slate-900">
                            {revenueEth.toFixed(4)}
                        </span>
                        <span className="text-sm text-slate-400">ETH</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">≈ ${revenueUsd.toFixed(2)} USD</p>
                </div>

                {/* Average Latency */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Avg Latency</h3>
                        <span className={`text-xs font-bold px-2 py-1 rounded ${currentAnalytics.stats.avgLatencyMs < 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {currentAnalytics.stats.avgLatencyMs < 100 ? 'Fast' : 'Normal'}
                        </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-slate-900">
                            {currentAnalytics.stats.avgLatencyMs}
                        </span>
                        <span className="text-sm text-slate-400">ms</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                        Success Rate: {currentAnalytics.stats.successRate.toFixed(1)}%
                    </p>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Requests Over Time */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-700 mb-4">Requests Over Time</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={currentAnalytics.chartData.map(d => ({
                                time: new Date(d.time * 1000).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
                                requests: d.requests
                            }))}>
                                <defs>
                                    <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis
                                    dataKey="time"
                                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                                    stroke="#cbd5e1"
                                />
                                <YAxis
                                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                                    stroke="#cbd5e1"
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'white',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        fontSize: '12px'
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="requests"
                                    stroke="#10b981"
                                    strokeWidth={2}
                                    fill="url(#colorRequests)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Success Rate Trend */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-700 mb-4">Success Rate Trend</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={currentAnalytics.chartData.map(d => ({
                                time: new Date(d.time * 1000).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
                                rate: d.successRate
                            }))}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis
                                    dataKey="time"
                                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                                    stroke="#cbd5e1"
                                />
                                <YAxis
                                    domain={[0, 100]}
                                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                                    stroke="#cbd5e1"
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'white',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        fontSize: '12px'
                                    }}
                                    formatter={(value: number | undefined) => value !== undefined ? [`${value.toFixed(1)}%`, 'Success Rate'] : ['', '']}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="rate"
                                    stroke="#10b981"
                                    strokeWidth={2}
                                    dot={{ fill: '#10b981', r: 3 }}
                                    activeDot={{ r: 5 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <h3 className="text-sm font-bold text-slate-700">Recent Activity</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 text-[10px] font-bold text-slate-400 border-b border-slate-100 uppercase tracking-wider">
                                <th className="py-3 px-6">Timestamp</th>
                                <th className="py-3">Agent ID</th>
                                <th className="py-3">Status</th>
                                <th className="py-3">Latency</th>
                                <th className="py-3 pr-6">Revenue</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {currentAnalytics.recentActivity.map((activity, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                    <td className="py-3 px-6">
                                        <span className="text-xs text-slate-600">
                                            {new Date(activity.timestamp * 1000).toLocaleTimeString()}
                                        </span>
                                    </td>
                                    <td className="py-3">
                                        <span className="text-xs font-mono text-slate-500">{activity.agentId}</span>
                                    </td>
                                    <td className="py-3">
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase ${activity.status === 'success'
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : 'bg-red-100 text-red-700'
                                            }`}>
                                            {activity.status === 'success' ? (
                                                <CheckIcon className="w-3 h-3" />
                                            ) : (
                                                <CloseIcon className="w-3 h-3" />
                                            )}
                                            {activity.status}
                                        </span>
                                    </td>
                                    <td className="py-3">
                                        <span className="text-xs text-slate-600">{activity.latencyMs}ms</span>
                                    </td>
                                    <td className="py-3 pr-6">
                                        <span className="text-xs font-mono text-slate-700">
                                            {(Number(activity.revenueWei) / 1e18).toFixed(6)} ETH
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    );
}
