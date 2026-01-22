import React from 'react';
import type { ReactNode } from 'react';

interface DashboardCardProps {
    children: ReactNode;
    title?: string;
    subtitle?: string;
    className?: string;
    headerAction?: ReactNode;
    padding?: boolean;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({
    children,
    title,
    subtitle,
    className = '',
    headerAction,
    padding = true
}) => {
    return (
        <div className={`premium-card ${className}`}>

            {(title || headerAction) && (
                <div className="flex justify-between items-start mb-6 px-7 pt-6 relative z-10">
                    <div>
                        {title && <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest opacity-80">{title}</h3>}
                        {subtitle && <p className="text-[11px] text-slate-500 mt-1 font-medium">{subtitle}</p>}
                    </div>
                    {headerAction && <div className="relative z-20">{headerAction}</div>}
                </div>
            )}
            <div className={`${padding ? 'px-7 pb-7' : ''} relative z-10`}>
                {children}
            </div>
        </div>
    );
};
