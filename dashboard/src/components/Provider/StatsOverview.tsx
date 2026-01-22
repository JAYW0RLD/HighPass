import React from 'react';
import { WalletIcon, ServerIcon, ActivityIcon } from '../Icons';
import type { ProviderStats, ChartDataPoint } from '../../types';

interface StatsOverviewProps {
    stats: ProviderStats | null;
    chartData: ChartDataPoint[]; // Kept for interface compatibility
    servicesCount: number;
    onWithdraw?: () => void; // [NEW] Callback for withdrawal
}

const StatCard = ({ icon: Icon, title, value, subtext, trend, action }: any) => (
    <div className="bg-card border border-base rounded-xl p-5 flex flex-col justify-between h-[100px] relative overflow-hidden group hover:border-emerald-500/20 hover:shadow-md transition-all shadow-sm">
        <div className="flex justify-between items-start z-10 w-full">
            <div className="flex items-center gap-2 text-secondary text-sm font-medium">
                <Icon className="w-4 h-4" />
                <span>{title}</span>
            </div>
            {action ? action : (trend && (
                <span className={`text-xs font-bold ${trend.startsWith('+') ? 'text-emerald-600' : 'text-secondary'}`}>
                    {trend}
                </span>
            ))}
        </div>
        <div className="z-10 mt-1">
            <div className="text-2xl font-bold text-primary font-mono tracking-tight">{value}</div>
            {subtext && <div className="text-[10px] text-secondary font-medium mt-1 uppercase tracking-wider">{subtext}</div>}
        </div>

        {/* Hover Effect - Subtle glow instead of stark opacity */}
        <div className="absolute right-0 bottom-0 p-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity transform translate-y-2 translate-x-2 text-primary">
            <Icon className="w-16 h-16" />
        </div>
    </div>
);

export const StatsOverview = React.memo(({ stats, servicesCount, onWithdraw }: StatsOverviewProps) => {
    const revenue = stats ? (Number(stats.netRevenueWei) / 1e18) : 0;
    const hasBalance = revenue > 0;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <StatCard
                icon={WalletIcon}
                title="Total Earnings"
                value={`$ ${(revenue * 0.15).toFixed(2)}`} // Mocking USD conversion
                subtext={`${revenue.toFixed(4)} CRO`}
                action={
                    <button
                        onClick={onWithdraw}
                        disabled={!hasBalance}
                        className={`text-[9px] px-2 py-1 rounded border font-black uppercase tracking-widest transition-all ${hasBalance
                            ? 'bg-emerald-500 text-black border-emerald-500 hover:bg-emerald-400 cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                            : 'bg-zinc-800 text-zinc-600 border-zinc-700 cursor-not-allowed'
                            }`}
                    >
                        Withdraw
                    </button>
                }
            />
            <StatCard
                icon={ServerIcon}
                title="Active Nodes"
                value={`${servicesCount} / 15`}
                subtext="System Healthy"
            />
            <StatCard
                icon={ActivityIcon}
                title="Avg Latency"
                value="45 ms"
                trend="[Stable]"
                subtext="Global Edge"
            />
        </div>
    );
});

