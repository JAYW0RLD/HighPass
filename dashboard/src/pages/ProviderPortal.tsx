import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import toast from 'react-hot-toast';
import Header from '../components/Header';
import { SkeletonList } from '../components/Skeleton';
// import { NoServicesState } from '../components/EmptyState';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { RealTimeChart } from '../components/RealTimeChart';
import { DashboardCard } from '../components/DashboardCard';
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

    // Mock Realtime Data
    const [chartData, setChartData] = useState<{ time: number; value: number }[]>([]);

    useEffect(() => {
        // Generate initial data
        const initialData = [];
        let time = Math.floor(Date.now() / 1000) - 1000;
        let value = 50;
        for (let i = 0; i < 1000; i++) {
            value += (Math.random() - 0.5) * 5;
            if (value < 0) value = 0;
            if (value > 100) value = 100;
            initialData.push({ time: time + i, value });
        }
        setChartData(initialData);

        // Simulate live updates
        const interval = setInterval(() => {
            setChartData(prev => {
                const last = prev[prev.length - 1];
                let newValue = last.value + (Math.random() - 0.5) * 5;
                if (newValue < 0) newValue = 0;
                if (newValue > 100) newValue = 100;

                const newPoint = { time: last.time + 1, value: newValue };
                // Keep only last 1000 points
                return [...prev.slice(1), newPoint];
            });
        }, 1000);

        return () => clearInterval(interval);
    }, []);

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
    // const [verificationData, setVerificationData] = useState<{ token: string; instructions: any } | null>(null);
    // const [verifying, setVerifying] = useState(false);

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
            fetchProviderStats();
        } catch (err) {
            console.error('Error fetching services:', err);
            setLoading(false);
        }
    };

    const fetchProviderStats = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const apiOrigin = import.meta.env.VITE_API_ORIGIN || window.location.origin;
            const res = await fetch(`${apiOrigin}/api/provider/stats`, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });

            if (!res.ok) throw new Error('Failed to fetch stats');
            const data = await res.json();
            setProviderStats(data);
        } catch (err) {
            console.error('Error fetching provider stats:', err);
        }
    };

    // const handleGenerateToken = async () => { ... } (Commented out for now as unused in new UI)
    /*
    const handleGenerateToken = async () => {
        if (!editingService) return;
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            const apiOrigin = import.meta.env.VITE_API_ORIGIN || window.location.origin;
            const res = await fetch(`${apiOrigin}/api/services/${editingService.id}/generate-token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` }
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setVerificationData(data);
            toast.success('Verification token generated');
        } catch (err: any) { toast.error(err.message); }
    };

    const handleVerifyDomain = async () => {
        if (!editingService) return;
        setVerifying(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            const apiOrigin = import.meta.env.VITE_API_ORIGIN || window.location.origin;
            const res = await fetch(`${apiOrigin}/api/services/${editingService.id}/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` }
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            toast.success('Domain verified successfully!');
            setEditingService(null);
            setVerificationData(null);
            fetchServices();
        } catch (err: any) { toast.error(`Verification failed: ${err.message}`); } finally { setVerifying(false); }
    };
    */

    const handleCreateService = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { error } = await supabase.from('services').insert({ provider_id: user.id, ...newService });
            if (error) throw error;
            toast.success('Service created successfully!');
            setNewService({ name: '', slug: '', upstream_url: '', price_wei: '0', min_grade: 'F', trust_seed_enabled: false, initial_debt_limit: 0.1 });
            fetchServices();
        } catch (err: any) { toast.error(`Failed to create service: ${err.message}`); }
    };

    const handleUpdateService = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingService) return;
        try {
            const { error } = await supabase.from('services').update({
                name: editingService.name,
                slug: editingService.slug,
                upstream_url: editingService.upstream_url,
                price_wei: editingService.price_wei,
                min_grade: editingService.min_grade,
                trust_seed_enabled: (editingService as any).trust_seed_enabled,
                initial_debt_limit: (editingService as any).initial_debt_limit
            }).eq('id', editingService.id);
            if (error) throw error;
            toast.success('Service updated successfully!');
            setEditingService(null);
            fetchServices();
        } catch (err: any) { toast.error(`Failed to update service: ${err.message}`); }
    };

    const handleDeleteService = () => {
        if (!editingService) return;
        setConfirmModal({
            isOpen: true,
            title: 'Delete Service',
            message: `Delete ${editingService.name}?`,
            isDangerous: true,
            action: async () => {
                try {
                    const { error } = await supabase.from('services').delete().eq('id', editingService.id);
                    if (error) throw error;
                    toast.success('Service deleted');
                    setEditingService(null);
                    fetchServices();
                } catch (err: any) { toast.error(`Failed to delete service: ${err.message}`); }
            }
        });
    };

    const createDemoService = () => {
        const apiOrigin = import.meta.env.VITE_API_ORIGIN || window.location.origin;
        const demoUpstreamUrl = `${apiOrigin}/api/demo/echo`;
        const existingDemo = services.find(s => s.upstream_url === demoUpstreamUrl);
        if (existingDemo) { toast.error('Demo service already exists.'); return; }
        setConfirmModal({
            isOpen: true,
            title: 'Deploy Demo Service',
            message: 'Deploy Demo Echo Service?',
            action: async () => {
                try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) return;
                    const slug = `demo-${Math.random().toString(36).substring(7)}`;
                    const { error } = await supabase.from('services').insert({
                        provider_id: user.id, name: 'Demo Echo Service', slug: slug, upstream_url: demoUpstreamUrl, price_wei: '10000000000000000', min_grade: 'F'
                    });
                    if (error) throw error;
                    toast.success('Demo service deployed!');
                    fetchServices();
                } catch (err: any) { toast.error(err.message); }
            }
        });
    };

    return (
        <div className="dashboard provider-portal">
            <Header title="Provider Dashboard" />

            <div className="dashboard-grid mt-2">

                {/* 1. Top Section: Charts & Reputation */}
                <div className="col-span-8">
                    <DashboardCard title="Real-time Revenue Pulse" className="h-full min-h-[300px]" padding={false}>
                        <div className="p-4 pt-0 h-[250px]">
                            <RealTimeChart
                                data={chartData}
                                height={250}
                                colors={{
                                    lineColor: '#3b82f6',
                                    topColor: 'rgba(59, 130, 246, 0.4)',
                                    bottomColor: 'rgba(59, 130, 246, 0.0)'
                                }}
                            />
                        </div>
                    </DashboardCard>
                </div>

                <div className="col-span-4 flex flex-col gap-4">
                    <DashboardCard className="bg-gradient-dark">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-secondary text-sm font-bold uppercase tracking-wider">ERC-8004 Rating</h3>
                                <div className="text-4xl font-bold text-white mt-2 flex items-center gap-2">
                                    S-Grade
                                    <span className="text-xs py-1 px-2 bg-green-500/20 text-green-400 rounded-full border border-green-500/30">Verified</span>
                                </div>
                            </div>
                            <div className="w-16 h-16 rounded-full border-4 border-blue-500 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                                <span className="text-2xl font-bold text-blue-400">S</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-4 border-t border-white/10 pt-4">
                            <div>
                                <div className="text-secondary text-xs">Latency</div>
                                <div className="text-blue-400 font-mono text-lg">35ms</div>
                            </div>
                            <div>
                                <div className="text-secondary text-xs">Success Rate</div>
                                <div className="text-green-400 font-mono text-lg">99.9%</div>
                            </div>
                        </div>
                    </DashboardCard>

                    <DashboardCard className="flex-1">
                        <h3 className="text-secondary text-sm font-bold uppercase tracking-wider mb-2">Long-running Jobs</h3>
                        <div className="space-y-3">
                            <div>
                                <div className="flex justify-between text-xs text-secondary mb-1">
                                    <span>Deep Scan</span>
                                    <span>65%</span>
                                </div>
                                <div className="w-full bg-white/5 rounded-full h-1.5">
                                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '65%' }}></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-xs text-secondary mb-1">
                                    <span>Index Build</span>
                                    <span>24%</span>
                                </div>
                                <div className="w-full bg-white/5 rounded-full h-1.5">
                                    <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: '24%' }}></div>
                                </div>
                            </div>
                        </div>
                    </DashboardCard>
                </div>

                {/* 2. Middle Section: Services Management */}
                <div className="col-span-12 mt-4">
                    {/* Modern Tabs */}
                    <div className="flex border-b border-border mb-6">
                        {['services', 'integration', 'revenue'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === tab
                                    ? 'border-blue-500 text-white'
                                    : 'border-transparent text-secondary hover:text-white'
                                    }`}
                            >
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </button>
                        ))}
                    </div>

                    {activeTab === 'services' && (
                        <div className="dashboard-grid">
                            <div className="col-span-4">
                                <DashboardCard title="Register Service">
                                    <form onSubmit={handleCreateService} className="flex flex-col gap-4">
                                        <div className="space-y-3">
                                            <input type="text" placeholder="Service Name" className="form-control bg-input border-border"
                                                value={newService.name} onChange={e => setNewService({ ...newService, name: e.target.value })} required
                                            />
                                            <input type="text" placeholder="URL Slug (e.g. weather-api)" className="form-control bg-input border-border"
                                                value={newService.slug} onChange={e => setNewService({ ...newService, slug: e.target.value })} required
                                            />
                                            <input type="text" placeholder="Upstream URL" className="form-control bg-input border-border"
                                                value={newService.upstream_url} onChange={e => setNewService({ ...newService, upstream_url: e.target.value })} required
                                            />

                                            <div className="grid grid-cols-2 gap-2">
                                                <input type="number" placeholder="Price (CRO)" className="form-control bg-input border-border"
                                                    step="any" value={newService.price_wei === '0' ? '' : Number(newService.price_wei) / 1e18}
                                                    onChange={e => setNewService({ ...newService, price_wei: (parseFloat(e.target.value || '0') * 1e18).toLocaleString('fullwide', { useGrouping: false }) })} required
                                                />
                                                <select className="form-control bg-input border-border"
                                                    value={newService.min_grade} onChange={e => setNewService({ ...newService, min_grade: e.target.value })}
                                                >
                                                    <option value="F">Allow All (F)</option>
                                                    <option value="C">Standard (C)</option>
                                                    <option value="A">Verified (A)</option>
                                                </select>
                                            </div>
                                        </div>
                                        <button type="submit" className="btn btn-primary w-full justify-center py-2.5">
                                            Create Service
                                        </button>
                                        <button type="button" onClick={createDemoService} className="text-xs text-center text-blue-400 hover:text-blue-300">
                                            + Deploy Demo Echo API
                                        </button>
                                    </form>
                                </DashboardCard>
                            </div>

                            <div className="col-span-8">
                                <div className="grid grid-cols-2 gap-4">
                                    {loading ? <SkeletonList count={2} /> : services.map(svc => (
                                        <DashboardCard key={svc.id} className="relative group">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="font-semibold text-white">{svc.name}</h3>
                                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${svc.upstream_url.includes('/api/demo')
                                                    ? 'border-green-500/30 text-green-400 bg-green-500/10'
                                                    : 'border-orange-500/30 text-orange-400 bg-orange-500/10'
                                                    }`}>
                                                    {svc.upstream_url.includes('/api/demo') ? 'Active' : 'Pending'}
                                                </span>
                                            </div>
                                            <code className="text-xs text-blue-400 bg-blue-500/5 px-2 py-1 rounded block mb-2 truncate">
                                                /gatekeeper/{svc.slug}/...
                                            </code>
                                            <div className="flex justify-between items-center text-sm text-secondary mt-4">
                                                <span>{(Number(svc.price_wei) / 1e18).toFixed(4)} CRO</span>
                                                <button onClick={() => setEditingService(svc)} className="text-white hover:text-blue-400 transition-colors">
                                                    Manage &rarr;
                                                </button>
                                            </div>
                                        </DashboardCard>
                                    ))}
                                    {services.length === 0 && !loading && (
                                        <div className="col-span-2 text-center text-secondary py-10 border border-dashed border-border rounded-xl">
                                            No active services
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'revenue' && (
                        <div className="dashboard-grid">
                            <div className="col-span-6">
                                <DashboardCard title="Net Revenue">
                                    <div className="text-3xl font-bold text-green-400">
                                        {(providerStats ? Number(providerStats.netRevenueWei) / 1e18 : 0).toFixed(4)} <span className="text-lg text-secondary">CRO</span>
                                    </div>
                                </DashboardCard>
                            </div>
                            <div className="col-span-6">
                                <DashboardCard title="Total Calls">
                                    <div className="text-3xl font-bold text-white">
                                        {providerStats?.totalCalls || 0}
                                    </div>
                                </DashboardCard>
                            </div>
                        </div>
                    )}

                </div>
            </div>

            {editingService && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <DashboardCard title={`Manage ${editingService.name}`} className="w-full max-w-lg">
                        <form onSubmit={handleUpdateService} className="flex flex-col gap-4">
                            <input type="text" value={editingService.name} onChange={e => setEditingService({ ...editingService, name: e.target.value })} className="form-control bg-input border-border" />
                            <div className="flex gap-2 justify-end mt-4">
                                <button type="button" onClick={() => setEditingService(null)} className="btn btn-secondary">Cancel</button>
                                <button type="submit" className="btn btn-primary">Save</button>
                                <button type="button" onClick={handleDeleteService} className="btn text-red-500 border border-red-500/20 hover:bg-red-500/10">Delete</button>
                            </div>
                        </form>
                    </DashboardCard>
                </div>
            )}

            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmModal.action}
                title={confirmModal.title}
                message={confirmModal.message}
                isDangerous={confirmModal.isDangerous}
            />
        </div>
    );
}

export default ProviderPortal;
