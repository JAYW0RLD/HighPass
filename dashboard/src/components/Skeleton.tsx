import React from 'react';

/**
 * Base Skeleton Component
 * Used for loading states
 */
interface SkeletonProps {
    width?: string;
    height?: string;
    className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
    width = '100%',
    height = '20px',
    className = ''
}) => (
    <div
        className={`skeleton ${className}`}
        style={{ width, height }}
    />
);

/**
 * Service Card Skeleton
 * Matches the service card layout
 */
export const ServiceCardSkeleton: React.FC = () => (
    <div className="card">
        <div className="flex justify-between items-center mb-1">
            <Skeleton height="24px" width="60%" />
            <Skeleton height="32px" width="80px" />
        </div>
        <Skeleton height="16px" width="80%" className="mb-05" />
        <div className="flex gap-1 mt-1">
            <Skeleton width="100px" height="16px" />
            <Skeleton width="120px" height="16px" />
        </div>
    </div>
);

/**
 * Metric Card Skeleton
 * For dashboard metrics
 */
export const MetricCardSkeleton: React.FC = () => (
    <div className="metric-card">
        <Skeleton height="16px" width="50%" className="skeleton-text" />
        <Skeleton height="36px" width="70%" className="skeleton-title" />
        <Skeleton height="14px" width="40%" />
    </div>
);

/**
 * Table Row Skeleton
 */
export const TableRowSkeleton: React.FC = () => (
    <div className="table-row">
        <Skeleton height="16px" width="80px" />
        <Skeleton height="16px" width="60px" />
        <Skeleton height="16px" width="100px" />
        <Skeleton height="16px" width="120px" />
        <Skeleton height="16px" width="90%" />
        <Skeleton height="16px" width="140px" />
    </div>
);

/**
 * Generic Loading List
 */
interface SkeletonListProps {
    count?: number;
    itemComponent?: React.FC;
}

export const SkeletonList: React.FC<SkeletonListProps> = ({
    count = 3,
    itemComponent: ItemComponent = ServiceCardSkeleton
}) => (
    <>
        {Array.from({ length: count }).map((_, i) => (
            <ItemComponent key={i} />
        ))}
    </>
);
