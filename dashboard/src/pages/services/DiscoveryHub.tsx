import { useState, useEffect, useCallback, useRef } from 'react';
import './DiscoveryHub.css';
// import Header from '../../components/Header'; 

interface Service {
    id: string;
    slug: string;
    name: string;
    description: string;
    category: string;
    tags: string[];
    price_wei: string;
    provider: string;
    performance: {
        latency: number;
        success_rate: number;
        requests: number;
    };
    grade: string;
    status: string;
    capabilities?: {
        endpoints: {
            path: string;
            description: string;
            price_usd?: string;
        }[];
    };
}

interface SearchResponse {
    data: Service[];
    meta: {
        total: number;
        page: number;
        limit: number;
        pages: number;
    };
}

import { API_CONFIG } from '../../config';

const API_BASE_URL = API_CONFIG.BASE_URL;

export default function DiscoveryHub() {
    const [query, setQuery] = useState('');
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [category, setCategory] = useState('');
    const [sort, setSort] = useState('performance');
    const [categories, setCategories] = useState<{ name: string, count: number }[]>([]);

    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Fetch Categories on Mount
    useEffect(() => {
        fetch(`${API_BASE_URL}/api/discovery/categories`)
            .then(res => res.json())
            .then(data => setCategories(data))
            .catch(err => console.error('Failed to load categories', err));
    }, []);

    // Search Function
    const searchServices = useCallback(async (
        searchQuery: string,
        cat: string,
        sortBy: string,
        pageNum: number
    ) => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({
                q: searchQuery,
                category: cat,
                sort: sortBy,
                page: pageNum.toString(),
                limit: '12'
            });

            const res = await fetch(`${API_BASE_URL}/api/discovery/search?${params}`);
            if (!res.ok) throw new Error('Search failed');

            const result: SearchResponse = await res.json();
            setServices(result.data);
            setTotalPages(result.meta.pages);
        } catch (err: any) {
            setError(err.message);
            setServices([]);
        } finally {
            setLoading(false);
        }
    }, []);

    // Debounced Search for Input
    // Replaced useDebounce with a simpler timeout ref pattern inside the handler
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

    const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setQuery(val);

        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        searchTimeoutRef.current = setTimeout(() => {
            setPage(1);
            searchServices(val, category, sort, 1);
        }, 500);
    };

    // Effect for Filters
    useEffect(() => {
        // Initial Load & Filter Changes
        searchServices(query, category, sort, page);
    }, [category, sort, page]);

    return (
        <div className="discovery-container">
            <header className="discovery-header">
                <h1 className="discovery-title">Discovery Hub</h1>
                <p className="discovery-subtitle">Find high-performance APIs for your Autonomous Agents</p>
            </header>

            <div className="search-filter-bar">
                <div className="search-input-group">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Search APIs by name, tag, or description..."
                        value={query}
                        onChange={handleSearchInput}
                    />
                </div>

                <div className="filter-group">
                    <select
                        className="filter-select"
                        value={category}
                        onChange={e => { setCategory(e.target.value); setPage(1); }}
                    >
                        <option value="">All Categories</option>
                        {categories.map(c => (
                            <option key={c.name} value={c.name}>{c.name} ({c.count})</option>
                        ))}
                    </select>

                    <select
                        className="filter-select"
                        value={sort}
                        onChange={e => { setSort(e.target.value); setPage(1); }}
                    >
                        <option value="performance">🔥 High Performance (Ranked)</option>
                        <option value="recent">✨ Recently Added</option>
                        <option value="price">💰 Lowest Price</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="services-grid">
                    {[1, 2, 3, 4].map(idx => (
                        <div key={idx} className="service-card loading-skeleton" style={{ height: '240px' }}></div>
                    ))}
                </div>
            ) : error ? (
                <div className="empty-state">
                    <h3>Error loading services</h3>
                    <p>{error}</p>
                </div>
            ) : services.length === 0 ? (
                <div className="empty-state">
                    <h3>No services found</h3>
                    <p>Try adjusting your search terms or filters</p>
                </div>
            ) : (
                <div className="services-grid">
                    {services.map(service => (
                        <div key={service.id} className="service-card">
                            <div className="card-header">
                                <h3 className="service-name">{service.name}</h3>
                                <div className={`grade-badge grade-${service.grade}`} title={`Grade ${service.grade}`}>
                                    {service.grade}
                                </div>
                            </div>

                            <div className="card-body">
                                <p className="service-description">{service.description || 'No description provided.'}</p>
                                <div className="tags-container">
                                    {service.tags?.slice(0, 3).map(tag => (
                                        <span key={tag} className="tag-badge">#{tag}</span>
                                    ))}
                                </div>
                                {service.capabilities?.endpoints && service.capabilities.endpoints.length > 0 && (
                                    <div className="mt-3">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Capabilities</div>
                                        <div className="flex flex-wrap gap-1">
                                            {service.capabilities.endpoints.map(ep => (
                                                <div key={ep.path} className="px-2 py-0.5 bg-slate-100 rounded text-[9px] font-mono text-slate-600 border border-slate-200">
                                                    /{ep.path}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="card-footer">
                                <span className="category-label">{service.category || 'General'}</span>
                                {service.status === 'verified' && (
                                    <div className="verified-mark" title="Verified Provider">
                                        <span>🛡️ Verified</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {totalPages > 1 && (
                <div className="pagination">
                    <button
                        className="page-btn"
                        disabled={page <= 1}
                        onClick={() => setPage(p => p - 1)}
                    >
                        Previous
                    </button>
                    <span style={{ alignSelf: 'center', opacity: 0.7 }}>
                        Page {page} of {totalPages}
                    </span>
                    <button
                        className="page-btn"
                        disabled={page >= totalPages}
                        onClick={() => setPage(p => p + 1)}
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
}
