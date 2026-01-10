import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import Header from '../components/Header';
import { SkeletonList } from '../components/Skeleton';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { RealTimeChart } from '../components/RealTimeChart';
import { DashboardCard } from '../components/DashboardCard';
import '../App.css';

// MOCK DATA - No Supabase dependency
interface Service {
    id: string;
    slug: string;
    name: string;
    upstream_url: string;
    price_wei: string;
    min_grade: string;
}

function UIOnlyProviderPortal() {
    const [activeTab, setActiveTab] = useState<'services' | 'integration' | 'revenue'>('services');

    // MOCK: Pre-filled services
    const [services, setServices] = useState<Service[]>([
        {
            id: '1',
            name: 'Weather API v1',
            slug: 'weather-api',
            upstream_url: 'https://api.weather.com/v1',
            price_wei: '10000000000000000', // 0.01 CRO
            min_grade: 'F'
        },
        {
            id: '2',
            name: 'Stock Price Feed',
            slug: 'stock-feed',
            upstream_url: 'https://finance.api.com',
            price_wei: '50000000000000000', // 0.05 CRO
            min_grade: 'A'
        },
        {
            id: '3',
            name: 'Demo Echo Service',
            slug: 'demo-echo',
            upstream_url: 'http://localhost:3000/api/demo/echo',
            price_wei: '0',
            min_grade: 'F'
        }
    ]);

    const [loading, setLoading] = useState(false); // No loading

    // MOCK: Provider Stats
    const [providerStats, setProviderStats] = useState<{
        totalCalls: number;
        totalRevenueWei: string;
        netRevenueWei: string;
        protocolFeeWei: string;
    } | null>({
        totalCalls: 12543,
        totalRevenueWei: '58420000000000000000',
        netRevenueWei: '55120000000000000000', // ~55.12 CRO
        protocolFeeWei: '3300000000000000000'
    });

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

    // MOCK ACTIONS
    const handleCreateService = async (e: React.FormEvent) => {
        e.preventDefault();
        toast.success('(MOCK) Service created successfully!');
        setNewService({ name: '', slug: '', upstream_url: '', price_wei: '0', min_grade: 'F', trust_seed_enabled: false, initial_debt_limit: 0.1 });
    };

    const handleUpdateService = async (e: React.FormEvent) => {
        e.preventDefault();
        toast.success('(MOCK) Service updated successfully!');
        setEditingService(null);
    };

    const handleDeleteService = () => {
        if (!editingService) return;
        setConfirmModal({
            isOpen: true,
            title: 'Delete Service',
            message: `Delete ${editingService.name}?`,
            isDangerous: true,
            action: async () => {
                toast.success('(MOCK) Service deleted');
                setEditingService(null);
            }
        });
    };

    const createDemoService = () => {
        setConfirmModal({
            isOpen: true,
            title: 'Deploy Demo Service',
            message: 'Deploy Demo Echo Service?',
            action: async () => {
                toast.success('(MOCK) Demo service deployed!');
            }
        });
    };

    return (
        <div className="dashboard provider-portal">
            <Header title="Provider Dashboard (UI Test Mode)" />

            <div className="grid grid-cols-12 gap-6 mt-6">

                {/* 1. Top Section: Pulse (Left) & Platform Summary (Right) */}
                <div className="col-span-12 lg:col-span-4">
                    <DashboardCard title="Real-time Revenue Pulse" className="h-full min-h-[200px] border border-white/10 bg-[#0A0A0B]" padding={false}>
                        <div className="p-4 pt-0 h-[200px]">
                            <RealTimeChart
                                data={chartData}
                                height={200}
                            />
                        </div>
                    </DashboardCard>
                </div>

                <div className="col-span-12 lg:col-span-8 flex flex-col gap-4">
                    <DashboardCard title="Platform Summary" className="flex-1 bg-gradient-to-br from-[#0A0A0B] to-[#1a1a1e] border border-white/10 bg-[#0A0A0B]">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mt-6 items-start">
                            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                <h3 className="text-secondary text-[10px] font-bold uppercase tracking-wider mb-2">Net Revenue</h3>
                                <div className="text-2xl font-bold text-white font-mono break-all">
                                    {providerStats ? (Number(providerStats.netRevenueWei) / 1e18).toFixed(4) : '0.0000'}
                                    <span className="text-sm text-accent-green ml-1">CRO</span>
                                </div>
                            </div>

                            <div className="pt-2">
                                <h3 className="text-secondary text-[10px] font-bold uppercase tracking-wider mb-1">Total Calls</h3>
                                <div className="text-xl font-bold text-white">
                                    {providerStats?.totalCalls.toLocaleString() || '0'}
                                </div>
                            </div>

                            <div className="pt-2">
                                <h3 className="text-secondary text-[10px] font-bold uppercase tracking-wider mb-1">Active Services</h3>
                                <div className="text-xl font-bold text-white">
                                    {services.length}
                                </div>
                            </div>

                            <div className="pt-2">
                                <h3 className="text-secondary text-[10px] font-bold uppercase tracking-wider mb-2">System Status</h3>
                                <div className="flex items-center gap-2 text-xs text-green-400 bg-green-500/10 px-2 py-1.5 rounded border border-green-500/20 w-fit">
                                    <span className="relative flex h-1.5 w-1.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                                    </span>
                                    Operational
                                </div>
                            </div>
                        </div>
                    </DashboardCard>
                </div>

                {/* 2. Middle Section: Services Management */}
                <div className="col-span-12 mt-8">
                    {/* Premium Tabs - Black BG, White Text, Stylish Border */}
                    <div className="flex items-center gap-2 mb-6">
                        {['services', 'integration', 'revenue'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={`px-6 py-2.5 text-sm font-bold transition-all border ${activeTab === tab
                                    ? 'bg-black text-white border-accent-green shadow-[0_0_10px_rgba(0,229,153,0.1)]'
                                    : 'bg-black text-secondary border-transparent hover:text-white hover:border-white/10'
                                    }`}
                            >
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </button>
                        ))}
                    </div>

                    {activeTab === 'services' && (
                        <div className="grid grid-cols-12 gap-6">
                            <div className="col-span-12 lg:col-span-5">
                                <DashboardCard title="Register Service" className="h-full border border-white/10 bg-[#0A0A0B]">
                                    <form onSubmit={handleCreateService} className="flex flex-col gap-6">

                                        {/* Section: Basic Info */}
                                        <div className="p-4 bg-white/5 rounded-lg border border-white/5 space-y-4">
                                            <div className="text-xs font-bold text-secondary uppercase tracking-wider mb-2">Service Identity</div>
                                            <div className="space-y-1">
                                                <label className="text-[11px] text-secondary">Service Name</label>
                                                <input type="text" placeholder="e.g. Weather API v1" className="form-control bg-[#121214] border-white/10 focus:border-accent-green/50 text-white placeholder-white/20"
                                                    value={newService.name} onChange={e => setNewService({ ...newService, name: e.target.value })} required
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[11px] text-secondary">URL Slug</label>
                                                <div className="flex items-center">
                                                    <span className="p-2 bg-white/5 border border-r-0 border-white/10 rounded-l text-xs text-secondary font-mono">/gatekeeper/</span>
                                                    <input type="text" placeholder="weather-api" className="form-control rounded-l-none bg-[#121214] border-white/10 focus:border-accent-green/50 text-white placeholder-white/20 font-mono text-xs"
                                                        value={newService.slug} onChange={e => setNewService({ ...newService, slug: e.target.value })} required
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Section: Pricing & Access */}
                                        <div className="p-4 bg-white/5 rounded-lg border border-white/5 space-y-4">
                                            <div className="text-xs font-bold text-secondary uppercase tracking-wider mb-2">Configuration</div>
                                            <div className="space-y-1">
                                                <label className="text-[11px] text-secondary">Upstream URL</label>
                                                <input type="text" placeholder="https://api.weather.com/v1" className="form-control bg-[#121214] border-white/10 focus:border-accent-green/50 text-white placeholder-white/20 font-mono text-xs"
                                                    value={newService.upstream_url} onChange={e => setNewService({ ...newService, upstream_url: e.target.value })} required
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <label className="text-[11px] text-secondary">Price (CRO)</label>
                                                    <input type="number" placeholder="0.00" className="form-control bg-[#121214] border-white/10 focus:border-accent-green/50 text-white"
                                                        step="any" value={newService.price_wei === '0' ? '' : Number(newService.price_wei) / 1e18}
                                                        onChange={e => setNewService({ ...newService, price_wei: (parseFloat(e.target.value || '0') * 1e18).toLocaleString('fullwide', { useGrouping: false }) })} required
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[11px] text-secondary">Min Grade</label>
                                                    <select className="form-control bg-[#121214] border-white/10 focus:border-accent-green/50 text-white"
                                                        value={newService.min_grade} onChange={e => setNewService({ ...newService, min_grade: e.target.value })}
                                                    >
                                                        <option value="F">Allow All (F)</option>
                                                        <option value="C">Standard (C)</option>
                                                        <option value="A">Verified (A)</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-2 flex flex-col gap-3">
                                            <button type="submit" className="btn btn-primary w-full justify-center py-3 text-sm font-bold shadow-[0_0_15px_rgba(0,229,153,0.2)] hover:shadow-[0_0_20px_rgba(0,229,153,0.4)]">
                                                Create Service
                                            </button>
                                            <button type="button" onClick={createDemoService} className="w-full py-2 text-xs font-medium text-secondary hover:text-white border border-white/10 hover:border-white/30 rounded transition-all bg-white/5 hover:bg-white/10">
                                                ⚡ Deploy Demo Echo API
                                            </button>
                                        </div>
                                    </form>
                                </DashboardCard>
                            </div>

                            <div className="col-span-12 lg:col-span-7">
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                    {loading ? <SkeletonList count={2} /> : services.map(svc => (
                                        <DashboardCard key={svc.id} className="relative group border border-white/10 bg-[#0A0A0B] hover:border-white/20 transition-all hover:shadow-lg hover:shadow-black/50">
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
                                        <div className="col-span-1 xl:col-span-2 text-center text-secondary py-10 border border-dashed border-border rounded-xl">
                                            No active services
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'revenue' && (
                        <div className="grid grid-cols-12 gap-6">
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
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

export default UIOnlyProviderPortal;
