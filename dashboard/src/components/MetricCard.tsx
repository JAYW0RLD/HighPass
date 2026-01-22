import React, { type ReactNode } from 'react';

interface MetricCardProps {
    title: string;
    value: string | number;
    subValue?: string;
    icon?: ReactNode;
    trend?: {
        value: number; // percentage
        isPositive: boolean;
    };
    className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({ title, value, subValue, icon, trend, className = '' }) => {
    return (
        <div className={`p-5 rounded-xl border border-border-base bg-card hover:border-accent/30 transition-all duration-300 group hover:-translate-y-0.5 hover:shadow-card ${className}`}>
            <div className="flex justify-between items-start mb-3">
                <div className="flex flex-col gap-1">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-tertiary group-hover:text-secondary transition-colors">
                        {title}
                    </h3>
                </div>
                {icon && (
                    <div className="p-2 rounded-lg bg-card-hover/50 text-tertiary group-hover:text-primary transition-colors border border-border-subtle group-hover:border-border-base">
                        {icon}
                    </div>
                )}
            </div>

            <div className="flex flex-col gap-1">
                <div className="text-2xl font-bold text-primary font-mono tracking-tight">
                    {value}
                </div>

                <div className="flex items-center gap-2 text-xs">
                    {trend && (
                        <span className={`font-medium px-1.5 py-0.5 rounded ${trend.isPositive
                            ? 'bg-success/10 text-success'
                            : 'bg-danger/10 text-danger'
                            }`}>
                            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
                        </span>
                    )}
                    {subValue && (
                        <span className="text-tertiary">{subValue}</span>
                    )}
                </div>
            </div>
        </div>
    );
};
