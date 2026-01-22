import { useState, useEffect } from 'react';
import { useServices } from '../../hooks/useServices';
import { useProviderAnalytics } from '../../hooks/useProviderAnalytics';
import {
    ActivityIcon,
    ArrowUpRightIcon,
    FilterIcon,
    CreditCardIcon,
    XIcon,
    ShieldIcon,
    FileTextIcon
} from '../../components/Icons';
// import { useAccount } from 'wagmi';
import { supabase, authenticatedFetch } from '../../utils/apiClient';
import toast from 'react-hot-toast';
import { ResponsiveContainer, BarChart, Bar, Cell, Tooltip } from 'recharts';
import { useSettings } from '../../contexts/SettingsContext';

function ProviderPortal() {
    // const { isConnected } = useAccount();
    const { showDemoData } = useSettings();

    // --- Data Hooks ---
    const {
        handleCreateService,
        deployDemoService
    } = useServices();

    const { providerStats, chartData } = useProviderAnalytics();

    // --- Local State ---
    // (viewMode removed as we show both sections now)
    const [withdrawals, setWithdrawals] = useState<any[]>([]);

    const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
    const [provisionTab, setProvisionTab] = useState<'quick' | 'custom'>('quick');

    // --- Form State ---
    const [customService, setCustomService] = useState({
        name: '',
        slug: '',
        upstream_url: '',
        price_usdt: '0.01',
        min_grade: 'C',
        openseal_repo_url: ''
    });

    const [demoConfig] = useState({
        name: 'Crypto Price Oracle',
        slug: 'text-washer',
        upstream_url: 'http://localhost:3000/api/demo/prime'
    });

    // --- Fetch History (Always fetch on mount or just fetch) ---
    useEffect(() => {
        if (showDemoData) {
            setWithdrawals([
                { id: 'm1', amount_wei: '500000000000000000', status: 'completed', created_at: new Date(Date.now() - 86400000 * 2).toISOString(), tx_hash: '0x123abc...def' },
                { id: 'm2', amount_wei: '250000000000000000', status: 'completed', created_at: new Date(Date.now() - 86400000 * 5).toISOString(), tx_hash: '0x456ghi...jkl' },
                { id: 'm3', amount_wei: '100000000000000000', status: 'completed', created_at: new Date(Date.now() - 86400000 * 10).toISOString(), tx_hash: '0x789mno...pqr' }
            ]);
            return;
        }

        const fetchHistory = async () => {
            try {
                const res = await authenticatedFetch('/api/provider/withdrawals');
                if (res.ok) {
                    const data = await res.json();
                    setWithdrawals(data || []);
                }
            } catch (e) {
                console.error("Failed to load history", e);
            }
        };
        fetchHistory();
    }, [showDemoData]);

    // --- Data Formatting Helpers ---
    const revenueWei = providerStats?.netRevenueWei ? BigInt(providerStats.netRevenueWei) : BigInt(0);
    const revenueDisplay = Number(revenueWei) / 1e18;

    // Chart Data Transformation
    const formattedChartData = chartData && chartData.length > 0 ? chartData.map(d => ({
        name: new Date(d.time * 1000).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
        value: d.rawValue || d.value
    })) : [];

    // --- Handlers ---
    const handleWithdraw = async () => {
        // We now rely on providing a destination address in the future. 
        // For now, let's allow withdrawal using the authenticated session.
        if (revenueWei <= 0) {
            toast.error('No withdrawable balance.');
            return;
        }
        try {
            toast.loading('Processing withdrawal...', { id: 'withdraw-loading' });

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Authentication required');

            // Prompt user for destination address since we removed mandatory connection
            const destAddress = prompt("Enter destination wallet address (0x...):");
            if (!destAddress || !destAddress.startsWith('0x')) {
                toast.dismiss('withdraw-loading');
                toast.error('Invalid destination address');
                return;
            }

            const res = await fetch('/api/provider/withdraw', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                    'x-user-id': session.user.id
                },
                body: JSON.stringify({
                    amountWei: revenueWei.toString(),
                    address: destAddress,
                    // signature: signature // Signature removed for session-based trust
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Withdrawal failed');

            toast.dismiss('withdraw-loading');
            toast.success(`Withdrawal Successful!`);

            // Refresh history
            const resHist = await authenticatedFetch('/api/provider/withdrawals');
            if (resHist.ok) setWithdrawals(await resHist.json());

        } catch (error: any) {
            toast.dismiss('withdraw-loading');
            console.error('Withdrawal failed', error);
            toast.error(error.message || 'Failed to process withdrawal');
        }
    };

    const handleCustomSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        let priceWei = '0';
        try {
            const usdtVal = parseFloat(customService.price_usdt);
            if (!isNaN(usdtVal)) {
                const weiBig = BigInt(Math.floor(usdtVal * 1e18));
                priceWei = weiBig.toString();
            }
        } catch (err) {
            console.error('Price conversion failed', err);
        }

        const success = await handleCreateService({
            name: customService.name,
            slug: customService.slug,
            upstream_url: customService.upstream_url,
            price_wei: priceWei,
            access_requirements: {
                min_grade: customService.min_grade,
                requires_openseal: !!customService.openseal_repo_url,
                requires_zk_proof: false
            },
            openseal_repo_url: customService.openseal_repo_url
        });

        if (success) {
            setIsProvisionModalOpen(false);
            setCustomService({
                name: '', slug: '', upstream_url: '', price_usdt: '0.01', min_grade: 'C', openseal_repo_url: ''
            });
        }
    };

    const handleDemoDeploy = async () => {
        const success = await deployDemoService(demoConfig);
        if (success) setIsProvisionModalOpen(false);
    }

    return (
        <div className="space-y-10 font-sans text-slate-900 pb-20 relative animate-fade-in">

            {/* Provision Modal */}
            {isProvisionModalOpen && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/20 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-scale-in">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50">
                            <h3 className="text-slate-800 font-black text-lg uppercase tracking-tight">Provision Infrastructure</h3>
                            <button onClick={() => setIsProvisionModalOpen(false)} className="text-slate-400 hover:text-slate-800 transition-colors">
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="flex gap-4 mb-8 border-b border-slate-100">
                                <button
                                    onClick={() => setProvisionTab('quick')}
                                    className={`pb-3 text-xs font-black uppercase tracking-widest transition-all ${provisionTab === 'quick' ? 'text-emerald-500 border-b-2 border-emerald-500' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    Quick Start
                                </button>
                                <button
                                    onClick={() => setProvisionTab('custom')}
                                    className={`pb-3 text-xs font-black uppercase tracking-widest transition-all ${provisionTab === 'custom' ? 'text-emerald-500 border-b-2 border-emerald-500' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    Custom Service
                                </button>
                            </div>

                            {provisionTab === 'quick' ? (
                                <div className="space-y-6">
                                    <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-xl flex gap-4 items-start">
                                        <div className="p-3 bg-white rounded-lg text-emerald-500 shadow-sm border border-emerald-100">
                                            <ShieldIcon className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h4 className="text-slate-800 font-bold text-sm uppercase tracking-wide">Crypto Price Oracle (Demo)</h4>
                                            <p className="text-slate-500 text-xs mt-1 leading-relaxed max-w-sm">
                                                A reference implementation of a verifiable text sanitization service.
                                                Automatically deploys with OpenSeal verification.
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleDemoDeploy}
                                        className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-white font-black uppercase tracking-widest rounded-xl transition-all shadow-lg hover:shadow-emerald-500/20 active:scale-[0.98]"
                                    >
                                        Deploy Demo System
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleCustomSubmit} className="space-y-5">
                                    <div className="grid grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Service Name</label>
                                            <input
                                                type="text" required placeholder="My Service"
                                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 transition-colors"
                                                value={customService.name}
                                                onChange={e => setCustomService({ ...customService, name: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">URL Slug</label>
                                            <input
                                                type="text" required placeholder="my-service"
                                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 transition-colors"
                                                value={customService.slug}
                                                onChange={e => setCustomService({ ...customService, slug: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <button type="submit" className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest rounded-xl transition-all">
                                        Create Service
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* SECTION 2: Revenue & Records */}
            <section className="space-y-6">
                <div className="flex items-center gap-2 mb-2">
                    <ActivityIcon className="w-5 h-5 text-emerald-500" />
                    <h2 className="text-xl font-black tracking-tight text-slate-900">Revenue & Settlement Records</h2>
                </div>

                {/* Hero Balance */}
                {/* Hero Balance */}
                <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 relative overflow-hidden shadow-sm">
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <h2 className="text-slate-500 text-sm font-bold tracking-wide mb-2 uppercase">Accumulated Revenue</h2>
                            <div className="flex items-baseline gap-4">
                                <span className="text-4xl font-black tracking-tight text-slate-900">
                                    CRO {revenueDisplay.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 })}
                                </span>
                                <span className="text-emerald-500 text-xs font-bold bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">{showDemoData ? 'Simulation' : 'Live'}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* Withdraw Button */}
                            <button
                                onClick={handleWithdraw}
                                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20"
                            >
                                <ArrowUpRightIcon className="w-4 h-4" />
                                Withdraw
                            </button>
                        </div>
                    </div>
                </div>

                {/* Charts & Wallet Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Charts */}
                    <div className="lg:col-span-2 bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-slate-700">Cash Flow (24h)</h3>
                            </div>
                            <span className="px-3 py-1 bg-slate-900 text-white text-[10px] font-bold rounded-lg">Daily</span>
                        </div>
                        <div className="h-48 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={formattedChartData}>
                                    <Bar dataKey="value" radius={[4, 4, 4, 4]}>
                                        {formattedChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.value > 0 ? '#34D399' : '#EF4444'} fillOpacity={1} />
                                        ))}
                                    </Bar>
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Settlement Wallet Card */}
                    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-2">
                                <CreditCardIcon className="w-5 h-5 text-emerald-500" />
                                <h3 className="font-bold text-slate-700">Settlement Wallet</h3>
                            </div>
                        </div>
                        <div className={`w-full aspect-[1.586] rounded-2xl p-6 shadow-md flex flex-col justify-between relative overflow-hidden transition-transform hover:scale-[1.02] bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-300`}>
                            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/40 rounded-full blur-2xl"></div>
                            <div className="flex justify-between items-start">
                                <span className="font-bold tracking-widest text-sm text-slate-500 uppercase">
                                    Managed Sub-Wallet
                                </span>
                            </div>
                            <div className="flex items-center gap-2 mt-4 mb-2 text-slate-400">
                                <div className="text-xs font-mono">****</div>
                                <div className="text-xs font-mono">****</div>
                                <div className="text-xs font-mono">****</div>
                                <div className="text-sm font-mono font-bold text-slate-800">
                                    {providerStats?.settlementAddress?.slice(-4) || 'NULL'}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs font-medium text-slate-400 mb-1">
                                    Unique Deposit Address
                                </div>
                                <div className="text-sm font-bold tracking-tight truncate font-mono text-slate-900">
                                    {providerStats?.settlementAddress || 'Assigning Unique Address...'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Transaction History Table */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h3 className="font-bold text-sm text-slate-700 flex items-center gap-2">
                            <FileTextIcon className="w-4 h-4 text-emerald-500" />
                            Transaction History
                        </h3>
                        <button className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-500 hover:text-slate-900 transition-colors">
                            <FilterIcon className="w-3 h-3" />
                            Filter
                        </button>
                    </div>
                    <div className="p-6">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-[10px] font-bold text-slate-400 border-b border-slate-100 uppercase tracking-wider">
                                    <th className="pb-3 pl-2">Tx Hash</th>
                                    <th className="pb-3">Amount</th>
                                    <th className="pb-3">Status</th>
                                    <th className="pb-3">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {withdrawals.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="py-8 text-center text-sm text-slate-400 font-medium">No transaction history found.</td>
                                    </tr>
                                )}
                                {withdrawals.map((tx, idx) => (
                                    <tr key={tx.id || idx} className="group hover:bg-slate-50 transition-colors">
                                        <td className="py-4 pl-2">
                                            <div className="text-sm font-bold text-slate-800 font-mono">
                                                {tx.tx_hash ? `${tx.tx_hash.slice(0, 10)}...` : 'Pending'}
                                            </div>
                                        </td>
                                        <td className="py-4">
                                            <div className="text-sm font-bold text-slate-800">
                                                {(Number(tx.amount_wei) / 1e18).toFixed(4)} CRO
                                            </div>
                                        </td>
                                        <td className="py-4">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide ${tx.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                {tx.status}
                                            </span>
                                        </td>
                                        <td className="py-4">
                                            <div className="text-xs font-medium text-slate-400">
                                                {new Date(tx.created_at).toLocaleDateString()}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>
        </div>
    );
}

export default ProviderPortal;
