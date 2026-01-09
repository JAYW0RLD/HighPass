import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Header from '../components/Header';
import '../App.css';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

interface Service {
    id: string;
    slug: string;
    name: string;
    upstream_url: string;
    price_wei: string;
    min_grade: string;
}

function ProviderPortal() {
    const [activeTab, setActiveTab] = useState<'services' | 'integration' | 'revenue'>('services');
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [providerStats, setProviderStats] = useState<{
        totalCalls: number;
        totalRevenueWei: string;
        netRevenueWei: string;
        protocolFeeWei: string;
    } | null>(null);

    // Form State
    const [newService, setNewService] = useState({
        name: '',
        slug: '',
        upstream_url: '',
        price_wei: '0',
        min_grade: 'F',
        trust_seed_enabled: false,
        initial_debt_limit: 0.1
    });

    // Edit Modal State
    const [editingService, setEditingService] = useState<Service | null>(null);
    const [verificationData, setVerificationData] = useState<{ token: string; instructions: any } | null>(null);
    const [verifying, setVerifying] = useState(false);



    useEffect(() => {
        fetchServices();
    }, []);

    const fetchServices = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('services')
                .select('*')
                .eq('provider_id', user.id);

            if (error) throw error;
            setServices(data || []);
            setLoading(false);

            // Fetch provider stats
            fetchProviderStats(user.id);
        } catch (err) {
            console.error('Error fetching services:', err);
            setLoading(false);
        }
    };

    const fetchProviderStats = async (userId: string) => {
        try {
            const apiOrigin = import.meta.env.VITE_API_ORIGIN || window.location.origin;
            const res = await fetch(`${apiOrigin}/api/provider/stats`, {
                headers: {
                    'x-user-id': userId
                }
            });

            if (!res.ok) throw new Error('Failed to fetch stats');
            const data = await res.json();
            setProviderStats(data);
        } catch (err) {
            console.error('Error fetching provider stats:', err);
        }
    };

    const handleGenerateToken = async () => {
        if (!editingService) return;
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const apiOrigin = import.meta.env.VITE_API_ORIGIN || window.location.origin;
            const res = await fetch(`${apiOrigin}/api/services/${editingService.id}/generate-token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': user.id
                }
            });

            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setVerificationData(data);
        } catch (err: any) {
            alert(`Error: ${err.message}`);
        }
    };

    const handleVerifyDomain = async () => {
        if (!editingService) return;
        setVerifying(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const apiOrigin = import.meta.env.VITE_API_ORIGIN || window.location.origin;
            const res = await fetch(`${apiOrigin}/api/services/${editingService.id}/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': user.id
                }
            });

            const data = await res.json();
            if (data.error) throw new Error(data.error);

            alert('Domain Verified Successfully!');
            setEditingService(null);
            setVerificationData(null);
            fetchServices();
        } catch (err: any) {
            alert(`Verification Failed: ${err.message}`);
        } finally {
            setVerifying(false);
        }
    };



    const handleCreateService = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase.from('services').insert({
                provider_id: user.id,
                ...newService
            });

            if (error) throw error;

            alert('Service Created!');
            setNewService({ name: '', slug: '', upstream_url: '', price_wei: '0', min_grade: 'F', trust_seed_enabled: false, initial_debt_limit: 0.1 });
            fetchServices();
        } catch (err: any) {
            alert(`Error: ${err.message}`);
        }
    };

    const handleUpdateService = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingService) return;

        try {
            const { error } = await supabase
                .from('services')
                .update({
                    name: editingService.name,
                    slug: editingService.slug,
                    upstream_url: editingService.upstream_url,
                    price_wei: editingService.price_wei,
                    min_grade: editingService.min_grade,
                    trust_seed_enabled: (editingService as any).trust_seed_enabled,
                    initial_debt_limit: (editingService as any).initial_debt_limit
                })
                .eq('id', editingService.id);

            if (error) throw error;

            alert('Service Updated!');
            setEditingService(null);
            fetchServices();
        } catch (err: any) {
            alert(`Error updating service: ${err.message}`);
        }
    };

    const handleDeleteService = async () => {
        if (!editingService) return;
        if (!confirm('Are you sure you want to delete this service? This action cannot be undone.')) return;

        try {
            const { error } = await supabase
                .from('services')
                .delete()
                .eq('id', editingService.id);

            if (error) throw error;

            alert('Service Deleted!');
            setEditingService(null);
            fetchServices();
        } catch (err: any) {
            alert(`Error deleting service: ${err.message}`);
        }
    };

    const createDemoService = async () => {
        const apiOrigin = import.meta.env.VITE_API_ORIGIN || window.location.origin;
        const demoUpstreamUrl = `${apiOrigin}/api/demo/echo`;

        const existingDemo = services.find(s => s.upstream_url === demoUpstreamUrl);
        if (existingDemo) {
            alert('You already have a Demo Echo Service deployed.');
            return;
        }

        if (!confirm('Deploy a Demo Echo Service for testing?')) return;

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const slug = `demo-${Math.random().toString(36).substring(7)}`;

            const { error } = await supabase.from('services').insert({
                provider_id: user.id,
                name: 'Demo Echo Service',
                slug: slug,
                upstream_url: demoUpstreamUrl,
                price_wei: '10000000000000000', // 0.01 CRO
                min_grade: 'F'
            });

            if (error) throw error;
            alert('Demo Service Deployed!');
            fetchServices();
        } catch (err: any) {
            alert(`Error: ${err.message}`);
        }
    };

    // --- Sub-Components ---

    const ServicesTab = () => (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '2rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="data-section" style={{ padding: '1.5rem' }}>
                    <h2 style={{ marginTop: 0, fontSize: '1.2rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Register New Service</h2>
                    <form onSubmit={handleCreateService} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                        <div>
                            <label className="metric-label">Service Name</label>
                            <input
                                type="text"
                                value={newService.name}
                                onChange={e => setNewService({ ...newService, name: e.target.value })}
                                placeholder="My Weather API"
                                required
                                className="form-control"
                            />
                        </div>
                        <div>
                            <label className="metric-label">URL Slug</label>
                            <input
                                type="text"
                                value={newService.slug}
                                onChange={e => setNewService({ ...newService, slug: e.target.value })}
                                placeholder="weather-api"
                                required
                                className="form-control"
                            />
                            <small className="cell-endpoint">Endpoint: /gatekeeper/{newService.slug || '...'}/resource</small>
                        </div>
                        <div>
                            <label className="metric-label">Upstream Target</label>
                            <input
                                type="text"
                                value={newService.upstream_url}
                                onChange={e => setNewService({ ...newService, upstream_url: e.target.value })}
                                placeholder="https://api.myapp.com"
                                required
                                className="form-control"
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div style={{ flex: 1 }}>
                                <label className="metric-label">Price (CRO)</label>
                                <input
                                    type="number"
                                    step="any"
                                    value={newService.price_wei === '0' ? '' : Number(newService.price_wei) / 1e18}
                                    onChange={e => {
                                        const val = parseFloat(e.target.value);
                                        if (!isNaN(val)) {
                                            setNewService({ ...newService, price_wei: (val * 1e18).toLocaleString('fullwide', { useGrouping: false }) });
                                        } else {
                                            setNewService({ ...newService, price_wei: '0' });
                                        }
                                    }}
                                    placeholder="0.05"
                                    required
                                    className="form-control"
                                />
                                <p className="help-text">≈ ${(Number(newService.price_wei) / 1e18 * 0.08).toFixed(4)} USD</p>
                            </div>
                            <div style={{ flex: 1 }}>
                                <label className="metric-label">Min Grade</label>
                                <select
                                    value={newService.min_grade}
                                    onChange={e => setNewService({ ...newService, min_grade: e.target.value })}
                                    className="form-control"
                                >
                                    <option value="A">A (Verified Only)</option>
                                    <option value="B">B (Trusted)</option>
                                    <option value="C">C (Standard)</option>
                                    <option value="D">D (Limited)</option>
                                    <option value="F">F (Allow All)</option>
                                </select>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', alignItems: 'center', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                            <div style={{ flex: 1 }}>
                                <label className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={(newService as any).trust_seed_enabled || false}
                                        onChange={e => setNewService({ ...newService, trust_seed_enabled: e.target.checked } as any)}
                                    />
                                    Enable Trust Seed (Optimistic Entry)
                                </label>
                                <p className="help-text">Allow new users to accrue debt up to a limit before paying.</p>
                            </div>
                            {(newService as any).trust_seed_enabled && (
                                <div style={{ flex: 1 }}>
                                    <label className="metric-label">Initial Debt Limit (USD)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={(newService as any).initial_debt_limit || 0.1}
                                        onChange={e => setNewService({ ...newService, initial_debt_limit: parseFloat(e.target.value) } as any)}
                                        className="form-control"
                                    />
                                </div>
                            )}
                        </div>
                        <button type="submit" className="btn-primary" style={{ padding: '0.75rem', fontWeight: 600 }}>
                            REGISTER SERVICE
                        </button>
                    </form>
                </div>

                <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Don't have an API?</p>
                    <button
                        type="button"
                        onClick={createDemoService}
                        className="btn-secondary"
                        style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                    >
                        + Deploy Demo Echo API
                    </button>
                </div>
            </div>

            <div className="data-section" style={{ padding: '1.5rem' }}>
                <h2 style={{ marginTop: 0, fontSize: '1.2rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>My Services</h2>
                {loading ? <p>Loading...</p> : (
                    <div className="service-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                        {services.map(svc => (
                            <div key={svc.id} className="metric-card" style={{ padding: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <h3 style={{ margin: 0, fontSize: '1rem' }}>{svc.name}</h3>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span className={`status-badge ${svc.upstream_url.includes('/api/demo/echo') ? 'verified' : 'pending'}`}>
                                            {svc.upstream_url.includes('/api/demo/echo') ? 'Verified' : 'Pending Verification'}
                                        </span>
                                        <button onClick={() => setEditingService(svc)} className="btn-secondary" style={{ padding: '8px 20px', fontSize: '13px' }}>Manage</button>
                                    </div>
                                </div>
                                <code style={{ display: 'block', color: 'var(--accent-blue)', marginBottom: '0.5rem' }}>/gatekeeper/{svc.slug}/resource</code>
                                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    <span>Target: {svc.upstream_url}</span>
                                    <span>•</span>
                                    <span>Price: {(Number(svc.price_wei) / 1e18).toFixed(4)} CRO</span>
                                </div>
                            </div>
                        ))}
                        {services.length === 0 && <p>No services registered yet.</p>}
                    </div>
                )}
            </div>
        </div>
    );

    const IntegrationTab = () => {
        const [selectedService, setSelectedService] = useState<Service | null>(services[0] || null);
        const apiOrigin = import.meta.env.VITE_API_ORIGIN || 'http://localhost:3000';
        const endpoint = `${apiOrigin}/gatekeeper/${selectedService?.slug || 'service-slug'}/resource`;

        if (services.length === 0) return <p>Please register a service first.</p>;

        return (
            <div className="data-section" style={{ padding: '1.5rem' }}>
                <h2>Agent Integration Guide</h2>
                <select
                    onChange={(e) => setSelectedService(services.find(s => s.id === e.target.value) || null)}
                    className="form-control"
                    style={{ maxWidth: '300px', marginBottom: '1rem' }}
                >
                    {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <div style={{ background: '#0d1117', padding: '1rem', borderRadius: '6px', overflowX: 'auto' }}>
                    <pre style={{ margin: 0, color: '#c9d1d9', fontSize: '0.85rem' }}>
                        {`// Example Call via Gatekeeper
const res = await fetch("${endpoint}", {
  headers: { 'X-Agent-ID': 'my-agent' }
});
const data = await res.json();`}
                    </pre>
                </div>
            </div>
        );
    };

    const RevenueTab = () => {
        const totalCalls = providerStats?.totalCalls || 0;
        const netRevenueCRO = providerStats ? (Number(providerStats.netRevenueWei) / 1e18).toFixed(4) : '0.0000';
        const protocolFeeCRO = providerStats ? (Number(providerStats.protocolFeeWei) / 1e18).toFixed(4) : '0.0000';

        return (
            <div className="data-section" style={{ padding: '1.5rem' }}>
                <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>Revenue & Analytics</h2>
                <div className="metrics-grid">
                    <div className="metric-card primary">
                        <div className="metric-label">Total API Calls</div>
                        <div className="metric-value">{totalCalls}</div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Active Services: {services.length}</p>
                    </div>
                    <div className="metric-card success">
                        <div className="metric-label">Net Earnings (CRO)</div>
                        <div className="metric-value">{netRevenueCRO}</div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Protocol Fee: {protocolFeeCRO} CRO</p>
                    </div>
                </div>
                {totalCalls === 0 && (
                    <div style={{ marginTop: '2rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No API calls recorded yet. Use the Agent Simulator CLI to test!</p>
                    </div>
                )}
            </div>
        );
    };



    const EditModal = () => {
        if (!editingService) return null;
        const isDemo = editingService.upstream_url.includes('/api/demo/echo');

        return (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                <div className="data-section" style={{ padding: '1.5rem', width: '90%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                        <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Manage: {editingService.name}</h2>
                        <button onClick={() => { setEditingService(null); setVerificationData(null); }} style={{ border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'gray' }}>&times;</button>
                    </div>
                    {!isDemo && (
                        <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(0,122,255,0.05)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                            <h3 style={{ marginTop: 0, fontSize: '0.9rem' }}>🛡️ Domain Verification</h3>
                            {!verificationData ? (
                                <button onClick={handleGenerateToken} className="btn-secondary" style={{ fontSize: '0.8rem' }}>Begin Verification</button>
                            ) : (
                                <div style={{ fontSize: '0.8rem' }}>
                                    <p>Upload token to: <code>{verificationData.instructions.path}</code></p>
                                    <code style={{ display: 'block', padding: '0.5rem', background: 'var(--bg-primary)', margin: '0.5rem 0' }}>{verificationData.token}</code>
                                    <button onClick={handleVerifyDomain} disabled={verifying} className="btn-primary" style={{ width: '100%' }}>{verifying ? 'Verifying...' : 'Check Verification'}</button>
                                </div>
                            )}
                        </div>
                    )}
                    <form onSubmit={handleUpdateService} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <input type="text" value={editingService.name} onChange={e => setEditingService({ ...editingService, name: e.target.value })} placeholder="Name" className="form-control" required />
                        <input type="text" value={editingService.slug} onChange={e => setEditingService({ ...editingService, slug: e.target.value })} placeholder="Slug" className="form-control" required />
                        <input type="text" value={editingService.upstream_url} onChange={e => setEditingService({ ...editingService, upstream_url: e.target.value })} placeholder="Target URL" className="form-control" required disabled={isDemo} />
                        <input type="number" step="any" value={Number(editingService.price_wei) / 1e18} onChange={e => setEditingService({ ...editingService, price_wei: (parseFloat(e.target.value) * 1e18).toLocaleString('fullwide', { useGrouping: false }) })} placeholder="Price (CRO)" className="form-control" required />

                        <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                            <label className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: '0.5rem' }}>
                                <input
                                    type="checkbox"
                                    checked={(editingService as any).trust_seed_enabled || false}
                                    onChange={e => setEditingService({ ...editingService, trust_seed_enabled: e.target.checked } as any)}
                                />
                                Enable Trust Seed
                            </label>
                            {(editingService as any).trust_seed_enabled && (
                                <div>
                                    <label className="metric-label">Debt Limit (USD)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={(editingService as any).initial_debt_limit || 0.1}
                                        onChange={e => setEditingService({ ...editingService, initial_debt_limit: parseFloat(e.target.value) } as any)}
                                        className="form-control"
                                    />
                                </div>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button type="submit" className="btn-primary" style={{ flex: 1 }}>Save Changes</button>
                            <button type="button" onClick={handleDeleteService} className="btn-secondary" style={{ flex: 0.5, color: 'red' }}>Delete</button>
                        </div>
                    </form>
                </div>
            </div>
        );
    };

    return (
        <div className="dashboard provider-portal">
            <Header title="Provider Portal" />
            {/* TABS (YouTube Chips Style) */}
            <nav className="chip-nav">
                <button className={`chip ${activeTab === 'services' ? 'active' : ''}`} onClick={() => setActiveTab('services')}>My Services</button>
                <button className={`chip ${activeTab === 'integration' ? 'active' : ''}`} onClick={() => setActiveTab('integration')}>Integration</button>
                <button className={`chip ${activeTab === 'revenue' ? 'active' : ''}`} onClick={() => setActiveTab('revenue')}>Revenue</button>
            </nav>
            {activeTab === 'services' && <ServicesTab />}
            {activeTab === 'integration' && <IntegrationTab />}
            {activeTab === 'revenue' && <RevenueTab />}
            <EditModal />
            <footer className="footer" style={{ marginTop: '4rem' }}>
                <span>Provider Portal</span>
                <span>•</span>
                <span>Role: Service Provider</span>
                <span>•</span>
                <span>HighStation v2.3</span>
            </footer>
        </div>
    );
}

export default ProviderPortal;
