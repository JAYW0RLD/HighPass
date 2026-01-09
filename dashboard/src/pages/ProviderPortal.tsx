import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import toast from 'react-hot-toast';
import Header from '../components/Header';
import { SkeletonList } from '../components/Skeleton';
import { NoServicesState } from '../components/EmptyState';
import { ConfirmationModal } from '../components/ConfirmationModal';
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

    // Confirmation Modal State
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        action: () => Promise<void>;
        isDangerous?: boolean;
    }>({
        isOpen: false,
        title: '',
        message: '',
        action: async () => { },
        isDangerous: false
    });



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
            toast.success('Verification token generated');
        } catch (err: any) {
            toast.error(err.message);
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

            toast.success('Domain verified successfully! 🎉', { duration: 5000 });
            setEditingService(null);
            setVerificationData(null);
            fetchServices();
        } catch (err: any) {
            toast.error(`Verification failed: ${err.message}`);
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

            toast.success('Service created successfully! 🚀', { icon: '✨' });
            setNewService({ name: '', slug: '', upstream_url: '', price_wei: '0', min_grade: 'F', trust_seed_enabled: false, initial_debt_limit: 0.1 });
            fetchServices();
        } catch (err: any) {
            toast.error(`Failed to create service: ${err.message}`);
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

            toast.success('Service updated successfully!');
            setEditingService(null);
            fetchServices();
        } catch (err: any) {
            toast.error(`Failed to update service: ${err.message}`);
        }
    };

    const handleDeleteService = () => {
        if (!editingService) return;

        setConfirmModal({
            isOpen: true,
            title: 'Delete Service',
            message: `Are you sure you want to delete ${editingService.name}? This action cannot be undone.`,
            isDangerous: true,
            action: async () => {
                try {
                    const { error } = await supabase
                        .from('services')
                        .delete()
                        .eq('id', editingService.id);

                    if (error) throw error;

                    toast.success('Service deleted');
                    setEditingService(null);
                    fetchServices();
                } catch (err: any) {
                    toast.error(`Failed to delete service: ${err.message}`);
                }
            }
        });
    };

    const createDemoService = () => {
        const apiOrigin = import.meta.env.VITE_API_ORIGIN || window.location.origin;
        const demoUpstreamUrl = `${apiOrigin}/api/demo/echo`;

        const existingDemo = services.find(s => s.upstream_url === demoUpstreamUrl);
        if (existingDemo) {
            toast.error('You already have a Demo Echo Service deployed.');
            return;
        }

        setConfirmModal({
            isOpen: true,
            title: 'Deploy Demo Service',
            message: 'This will deploy a Demo Echo Service to test your provider setup. Continue?',
            action: async () => {
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
                    toast.success('Demo service deployed! 🎉');
                    fetchServices();
                } catch (err: any) {
                    toast.error(`Failed to deploy demo: ${err.message}`);
                }
            }
        });
    };

    // --- Sub-Components ---

    const ServicesTab = () => (
        <div className="grid grid-cols-3 gap-2 service-grid-layout">
            <div className="flex flex-col gap-1">
                <div className="card p-15">
                    <h2 className="section-header">Register New Service</h2>
                    <form onSubmit={handleCreateService} className="flex flex-col gap-1 mt-1">
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

            <div className="card p-15">
                <h2 className="section-header">My Services</h2>
                {loading ? (
                    <SkeletonList count={3} />
                ) : services.length === 0 ? (
                    <NoServicesState />
                ) : (
                    <div className="flex flex-col gap-1 mt-1">
                        {services.map(svc => (
                            <div key={svc.id} className="card card-hover card-compact">
                                <div className="flex justify-between items-center mb-05">
                                    <h3 className="section-title">{svc.name}</h3>
                                    <div className="flex items-center gap-05">
                                        <span className={`status-badge ${svc.upstream_url.includes('/api/demo/echo') ? 'verified' : 'pending'}`}>
                                            {svc.upstream_url.includes('/api/demo/echo') ? 'Verified' : 'Pending Verification'}
                                        </span>
                                        <button onClick={() => setEditingService(svc)} className="btn-secondary" style={{ padding: '8px 20px', fontSize: '13px' }}>Manage</button>
                                    </div>
                                </div>
                                <code className="text-blue" style={{ display: 'block', marginBottom: '0.5rem' }}>/gatekeeper/{svc.slug}/resource</code>
                                <div className="flex gap-1 text-sm text-secondary">
                                    <span>Target: {svc.upstream_url}</span>
                                    <span>•</span>
                                    <span>Price: {(Number(svc.price_wei) / 1e18).toFixed(4)} CRO</span>
                                </div>
                            </div>
                        ))}
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
            <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                backdropFilter: 'blur(4px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
            }}>
                <div className="card p-15" style={{ width: '90%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
                    <div className="flex justify-between items-center mb-15">
                        <h2 className="section-title text-lg">Manage: {editingService.name}</h2>
                        <button
                            onClick={() => { setEditingService(null); setVerificationData(null); }}
                            className="text-secondary hover:text-primary text-xl"
                            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                            &times;
                        </button>
                    </div>
                    {!isDemo && (
                        <div className="mb-15 p-1 rounded bg-secondary border border-border">
                            <h3 className="text-sm font-semibold mb-05">🛡️ Domain Verification</h3>
                            {!verificationData ? (
                                <button onClick={handleGenerateToken} className="btn-secondary text-sm">Begin Verification</button>
                            ) : (
                                <div className="text-sm">
                                    <p className="mb-05">Upload token to: <code className="bg-primary px-05 py-1 rounded">{verificationData.instructions.path}</code></p>
                                    <code className="block p-05 bg-primary rounded mb-05 break-all">{verificationData.token}</code>
                                    <button onClick={handleVerifyDomain} disabled={verifying} className="btn-primary w-full">
                                        {verifying ? 'Verifying...' : 'Check Verification'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                    <form onSubmit={handleUpdateService} className="flex flex-col gap-1">
                        <input
                            type="text"
                            value={editingService.name}
                            onChange={e => setEditingService({ ...editingService!, name: e.target.value })}
                            placeholder="Name"
                            className="form-control"
                            required
                        />
                        <input
                            type="text"
                            value={editingService.slug}
                            onChange={e => setEditingService({ ...editingService!, slug: e.target.value })}
                            placeholder="Slug"
                            className="form-control"
                            required
                        />
                        <input
                            type="text"
                            value={editingService.upstream_url}
                            onChange={e => setEditingService({ ...editingService!, upstream_url: e.target.value })}
                            placeholder="Target URL"
                            className="form-control"
                            required
                            disabled={isDemo}
                        />
                        <input
                            type="number"
                            step="any"
                            value={Number(editingService.price_wei) / 1e18}
                            onChange={e => setEditingService({ ...editingService!, price_wei: (parseFloat(e.target.value) * 1e18).toLocaleString('fullwide', { useGrouping: false }) })}
                            placeholder="Price (CRO)"
                            className="form-control"
                            required
                        />

                        <div className="bg-secondary p-1 rounded">
                            <label className="metric-label flex items-center gap-05 cursor-pointer mb-05">
                                <input
                                    type="checkbox"
                                    checked={(editingService as any).trust_seed_enabled || false}
                                    onChange={e => setEditingService({ ...editingService!, trust_seed_enabled: e.target.checked } as any)}
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
                                        onChange={e => setEditingService({ ...editingService!, initial_debt_limit: parseFloat(e.target.value) } as any)}
                                        className="form-control"
                                    />
                                </div>
                            )}
                        </div>
                        <div className="flex gap-1">
                            <button type="submit" className="btn-primary flex-1">Save Changes</button>
                            <button type="button" onClick={handleDeleteService} className="btn-danger flex-05">Delete</button>
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
            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                isDangerous={confirmModal.isDangerous}
                onConfirm={async () => {
                    await confirmModal.action();
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }}
                onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
            />
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
