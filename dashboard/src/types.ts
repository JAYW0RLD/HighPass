export interface Service {
    id: string;
    slug: string;
    name: string;
    upstream_url: string;
    endpoint_url?: string; // HighStation URL
    price_wei: string;
    access_requirements: {
        min_grade: string;
        requires_openseal?: boolean;
        requires_zk_proof?: boolean;
    };
    signing_secret?: string;
    trust_seed_enabled?: boolean;
    openseal_root_hash?: string;
    openseal_repo_url?: string;
    zk_verified?: boolean;
    // Metadata for Discovery
    category?: string;
    tags?: string[];
    description?: string;
    capabilities?: Record<string, any>;
    status: 'active' | 'inactive' | 'suspended' | 'verified';
}

export interface ChartDataPoint {
    time: number;
    value: number;
    rawValue?: number;
    revenue?: number;
}

export interface ProviderStats {
    totalCalls: number;
    totalRevenueWei: string;
    netRevenueWei: string;
    protocolFeeWei: string;
    settlementAddress?: string;
    reliability?: number;
}

export interface ServiceStats {
    totalRequests: number;
    uniqueAgents: number;
    totalRevenueWei: string;
    avgLatency: number;
}

export type ProviderTab = 'services' | 'integration' | 'revenue';
