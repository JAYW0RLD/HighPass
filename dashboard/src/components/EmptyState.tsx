import React from 'react';

/**
 * Empty State Component
 * Shows when there's no data to display
 * Follows GitHub + Bybit design patterns
 */
interface EmptyStateProps {
    icon?: string;
    title: string;
    description: string;
    action?: {
        label: string;
        onClick: () => void;
        variant?: 'primary' | 'secondary';
    };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    icon = '📭',
    title,
    description,
    action
}) => (
    <div className="empty-state">
        <div className="empty-icon">{icon}</div>
        <h3>{title}</h3>
        <p>{description}</p>
        {action && (
            <button
                className={action.variant === 'secondary' ? 'btn-secondary' : 'btn-primary'}
                onClick={action.onClick}
            >
                {action.label}
            </button>
        )}
    </div>
);

/**
 * No Services State
 */
export const NoServicesState: React.FC<{ onCreateClick?: () => void }> = ({
    onCreateClick
}) => (
    <EmptyState
        icon="🚀"
        title="No services registered yet"
        description="Create your first API service to start earning revenue on the HighStation network"
        action={onCreateClick ? {
            label: "Register Service",
            onClick: onCreateClick
        } : undefined}
    />
);

/**
 * No Wallets State
 */
export const NoWalletsState: React.FC = () => (
    <EmptyState
        icon="💳"
        title="No wallets linked"
        description="Link a wallet address to enable Track 2 optimistic payments and higher credit limits"
    />
);

/**
 * No Data State
 */
export const NoDataState: React.FC<{
    title?: string;
    description?: string;
}> = ({
    title = "No data available",
    description = "Data will appear here once you start using the service"
}) => (
        <EmptyState
            icon="📊"
            title={title}
            description={description}
        />
    );
