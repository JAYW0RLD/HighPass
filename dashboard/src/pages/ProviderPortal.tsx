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

    // Form State
    const [newService, setNewService] = useState({
        name: '',
        slug: '',
        upstream_url: '',
        price_wei: '0',
        min_grade: 'F'
    });

    // Edit Modal State
    const [editingService, setEditingService] = useState<Service | null>(null);

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
        } catch (err) {
            console.error('Error fetching services:', err);
            setLoading(false);
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
            setNewService({ name: '', slug: '', upstream_url: '', price_wei: '0', min_grade: 'F' });
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
                    min_grade: editingService.min_grade
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

        // Check for existing demo service (Limit 1 per account)
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

            const { data, error } = await supabase.from('services').insert({
                provider_id: user.id,
                name: 'Demo Echo Service',
                slug: slug,
                upstream_url: demoUpstreamUrl,
                price_wei: '10000000000000000', // 0.01 CRO
                min_grade: 'F'
            }).select();

            if (error) throw error;
            console.log('Demo Service Created:', data);

            alert('Demo Service Deployed!');
            fetchServices();
        } catch (err: any) {
            alert(`Error: ${err.message}`);
        }
    };

    // --- Components for Tabs ---

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
                                <p className="help-text">≈ ${(Number(newService.price_wei) / 1e18 * 0.08).toFixed(4)} USD (1 CRO ≈ $0.08)</p>
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
                        style={{
                            padding: '0.5rem 1rem',
                            fontWeight: 500,
                            fontSize: '0.85rem',
                            background: 'transparent',
                            border: '1px solid var(--border)',
                            color: 'var(--text-secondary)'
                        }}
                    >
                        + Deploy Demo Echo API
                    </button>
                </div>
            </div>

            {/* SERVICE LIST */}
            <div className="data-section" style={{ padding: '1.5rem' }}>
                <h2 style={{ marginTop: 0, fontSize: '1.2rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>My Services</h2>
                {loading ? <p>Loading...</p> : (
                    <div className="service-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                        {services.map(svc => (
                            <div key={svc.id} className="metric-card" style={{ padding: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>{svc.name}</h3>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span className={`status-badge ${svc.upstream_url.includes('/api/demo/echo') ? 'verified' : 'pending'}`}>
                                            {svc.upstream_url.includes('/api/demo/echo') ? 'Verified' : 'Pending Verification'}
                                        </span>
                                        <button
                                            onClick={() => setEditingService(svc)}
                                            className="btn-secondary"
                                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                                        >
                                            Manage
                                        </button>
                                    </div>
                                </div>
                                <code style={{ display: 'block', color: 'var(--accent-blue)', marginBottom: '0.5rem', fontFamily: 'monospace' }}>/gatekeeper/{svc.slug}/resource</code>
                                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    <span>Target: {svc.upstream_url}</span>
                                    <span>•</span>
                                    <span>Price: {svc.price_wei} wei</span>
                                </div>
                            </div>
                        ))}
                        {services.length === 0 && <p className="cell-time">No services registered yet.</p>}
                    </div>
                )}
            </div>
        </div>
    );

    // Edit Service Modal Component
    const EditModal = () => {
        if (!editingService) return null;

        return (
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
            }}>
                <div className="data-section" style={{ padding: '1.5rem', width: '90%', maxWidth: '500px', backgroundColor: 'var(--bg-secondary)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
                    <h2 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.2rem' }}>Edit Service</h2>
                    <form onSubmit={handleUpdateService} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <label className="metric-label">Service Name</label>
                            <input
                                type="text"
                                value={editingService.name}
                                onChange={e => setEditingService({ ...editingService, name: e.target.value })}
                                required
                                className="form-control"
                            />
                        </div>
                        <div>
                            <label className="metric-label">URL Slug</label>
                            <input
                                type="text"
                                value={editingService.slug}
                                onChange={e => setEditingService({ ...editingService, slug: e.target.value })}
                                required
                                className="form-control"
                            />
                        </div>
                        <div>
                            <label className="metric-label">Upstream Target</label>
                            <input
                                type="text"
                                value={editingService.upstream_url}
                                onChange={e => setEditingService({ ...editingService, upstream_url: e.target.value })}
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
                                    value={editingService.price_wei === '0' ? '' : Number(editingService.price_wei) / 1e18}
                                    onChange={e => {
                                        const val = parseFloat(e.target.value);
                                        if (!isNaN(val)) {
                                            setEditingService({ ...editingService, price_wei: (val * 1e18).toLocaleString('fullwide', { useGrouping: false }) });
                                        } else {
                                            setEditingService({ ...editingService, price_wei: '0' });
                                        }
                                    }}
                                    required
                                    className="form-control"
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label className="metric-label">Min Grade</label>
                                <select
                                    value={editingService.min_grade}
                                    onChange={e => setEditingService({ ...editingService, min_grade: e.target.value })}
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
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                            <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                                Update
                            </button>
                            <button type="button" onClick={handleDeleteService} className="btn-secondary" style={{ flex: 1, borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }}>
                                Delete
                            </button>
                            <button type="button" onClick={() => setEditingService(null)} className="btn-secondary" style={{ flex: 1 }}>
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    };

    const IntegrationTab = () => {
        const [selectedService, setSelectedService] = useState<Service | null>(services[0] || null);

        if (services.length === 0) return <p>Please register a service first.</p>;

        const apiOrigin = import.meta.env.VITE_API_ORIGIN || 'http://localhost:3000';
        const endpoint = `${apiOrigin}/gatekeeper/${selectedService?.slug || 'service-slug'}/resource`;

        const codeSnippet = `
import { createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { cronosTestnet } from 'viem/chains'

const client = createWalletClient({
  account: privateKeyToAccount('YOUR_PRIVATE_KEY'),
  chain: cronosTestnet,
  transport: http()
})

async function callService() {
  const serviceUrl = "${endpoint}";
  
  // 1. Initial Request (Check Price/Debt)
  const res = await fetch(serviceUrl, {
    headers: { 'X-Agent-ID': 'my-agent' }
  });

  if (res.status === 402) {
    // 2. Handle Payment logic here
    console.log("Payment Required:", await res.json());
  } else {
    // 3. Success (Optimistic Access)
    console.log("Success:", await res.json());
  }
}

callService();
    `.trim();

        return (
            <div className="data-section" style={{ padding: '1.5rem' }}>
                <h2>Agent Integration Guide</h2>
                <p className="metric-label" style={{ marginBottom: '1rem' }}>Select a service to generate the connection code.</p>

                <select
                    onChange={(e) => setSelectedService(services.find(s => s.id === e.target.value) || null)}
                    className="form-control"
                    style={{ maxWidth: '300px', marginBottom: '1rem' }}
                >
                    {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>

                <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '6px', border: '1px solid var(--border)' }}>
                    <pre style={{ margin: 0, overflowX: 'auto', fontFamily: 'SF Mono, monospace', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                        {codeSnippet}
                    </pre>
                </div>
            </div>
        );
    };

    const RevenueTab = () => {
        // Mock Revenue Data (In prod, fetch from DB aggregation)
        const totalCalls = services.length * 125; // Dummy data
        const grossRevenue = services.length * 0.05 * 1000;
        const protocolFee = grossRevenue * 0.005;
        const netEarnings = grossRevenue - protocolFee;

        return (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
                <div className="data-section" style={{ padding: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.2rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Financial Overview</h2>
                    <div className="metrics-grid" style={{ marginTop: '1.5rem', marginBottom: 2 }}>
                        <div className="metric-card primary">
                            <div className="metric-label">Total Calls</div>
                            <div className="metric-value">{totalCalls}</div>
                        </div>
                        <div className="metric-card success">
                            <div className="metric-label">Gross Revenue (CRO)</div>
                            <div className="metric-value" style={{ color: 'var(--accent-green)' }}>{grossRevenue.toFixed(2)}</div>
                        </div>
                        <div className="metric-card warning">
                            <div className="metric-label">Protocol Fee (0.5%)</div>
                            <div className="metric-value" style={{ color: 'var(--accent-red)' }}>-{protocolFee.toFixed(2)}</div>
                        </div>
                        <div className="metric-card primary">
                            <div className="metric-label">Net Earnings (CRO)</div>
                            <div className="metric-value" style={{ color: 'var(--accent-blue)' }}>{netEarnings.toFixed(2)}</div>
                        </div>
                    </div>
                </div>

                <div className="data-section" style={{ padding: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.2rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Service Breakdown</h2>
                    <div className="data-table" style={{ marginTop: '1rem' }}>
                        <div className="table-header" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr' }}>
                            <span>SERVICE NAME</span>
                            <span>TOTAL CALLS</span>
                            <span>PRICE (CRO)</span>
                            <span>EARNINGS (CRO)</span>
                        </div>
                        <div className="table-body">
                            {services.map(svc => {
                                // Mock logic for breakdown
                                const calls = 125;
                                const priceCro = Number(svc.price_wei) / 1e18;
                                const earnings = calls * priceCro * 0.995;
                                return (
                                    <div key={svc.id} className="table-row" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr' }}>
                                        <span style={{ fontWeight: 600 }}>{svc.name}</span>
                                        <span>{calls}</span>
                                        <span>{priceCro.toFixed(4)}</span>
                                        <span style={{ color: 'var(--accent-green)' }}>{earnings.toFixed(4)}</span>
                                    </div>
                                );
                            })}
                            {services.length === 0 && <p style={{ padding: '1rem', color: 'var(--text-secondary)' }}>No services available.</p>}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="dashboard provider-portal">
            <Header title="Provider Portal" />

            {/* TABS */}
            <nav style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)' }}>
                <TabButton label="My Services" active={activeTab === 'services'} onClick={() => setActiveTab('services')} />
                <TabButton label="Integration Guide" active={activeTab === 'integration'} onClick={() => setActiveTab('integration')} />
                <TabButton label="Revenue & Analytics" active={activeTab === 'revenue'} onClick={() => setActiveTab('revenue')} />
            </nav>

            {activeTab === 'services' && <ServicesTab />}
            {activeTab === 'integration' && <IntegrationTab />}
            {activeTab === 'revenue' && <RevenueTab />}

            {/* Edit Modal */}
            <EditModal />
        </div>
    );
}

const TabButton = ({ label, active, onClick }: any) => (
    <button
        onClick={onClick}
        style={{
            background: 'none',
            border: 'none',
            color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: 'pointer',
            padding: '0.75rem 0.25rem',
            borderBottom: active ? '2px solid var(--accent-orange)' : '2px solid transparent',
            marginBottom: '-1px'
        }}
    >
        {label}
    </button>
);

export default ProviderPortal;
