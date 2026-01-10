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
        <div className={`card-glass ${className}`}>
            {(title || headerAction) && (
                <div className="flex justify-between items-start mb-4 px-6 pt-5">
                    <div>
                        {title && <h3 className="text-lg font-semibold text-white tracking-tight">{title}</h3>}
                        {subtitle && <p className="text-sm text-secondary mt-1">{subtitle}</p>}
                    </div>
                    {headerAction && <div>{headerAction}</div>}
                </div>
            )}
            <div className={padding ? 'px-6 pb-6' : ''}>
                {children}
            </div>
        </div>
    );
};
