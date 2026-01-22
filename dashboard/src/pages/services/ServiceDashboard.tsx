import { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { SettingsIcon, ShieldIcon, GlobeIcon, ActivityIcon, CopyIcon, CheckIcon, XIcon } from '../../components/Icons';
import { RealTimeChart } from '../../components/RealTimeChart';
import { DashboardCard } from '../../components/DashboardCard';
import { useServices } from '../../hooks/useServices';
import { useProviderAnalytics } from '../../hooks/useProviderAnalytics';
// Mock data for charts
import { generateMockChartData } from '../../utils/mockData';

const ServiceDashboard = () => {
    const { serviceId } = useParams();
    const { services, loading, testConnection, verifyOpenSealRepo, generateToken, verifyOwnership, verifyDns } = useServices();
    const [timeRange, setTimeRange] = useState('24h');
    const [isRealMode, setIsRealMode] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        name: '',
        slug: '',
        description: '',
        category: 'General',
        tags: '',
        capabilities: { endpoints: [] as any[] },
        upstream_url: ''
    });
    const [isTestingConnection, setIsTestingConnection] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [latency, setLatency] = useState<number | null>(null);
    const [repoUrl, setRepoUrl] = useState('');
    const [isVerifyingRepo, setIsVerifyingRepo] = useState(false);
    const [repoStatus, setRepoStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [capturedHash, setCapturedHash] = useState<string | null>(null);
    const [isVerifyingOwnership, setIsVerifyingOwnership] = useState(false);
    const [verificationToken, setVerificationToken] = useState<string | null>(null);

    // Find the specific service
    const service = useMemo(() => {
        return services.find(s => s.id === serviceId);
    }, [services, serviceId]);

    const { chartData: realChartData, serviceStats, refresh } = useProviderAnalytics();
    const navigate = useNavigate();

    const handleToggleMode = () => {
        const nextMode = !isRealMode;
        setIsRealMode(nextMode);
        if (nextMode && service?.slug) {
            refresh(service.slug);
        }
    };



    const handleEditClick = () => {
        if (!service) return;
        setEditForm({
            name: service.name,
            slug: service.slug,
            // @ts-ignore
            description: service.description || '',
            // @ts-ignore
            category: service.category || 'General',
            // @ts-ignore
            tags: (service.tags || []).join(', '),
            // @ts-ignore
            capabilities: service.capabilities || { endpoints: [] },
            upstream_url: service.upstream_url || ''
        });
        setRepoUrl(service.openseal_repo_url || '');
        setCapturedHash(service.openseal_root_hash || null);
        setIsEditing(true);
    };

    const handleCancelClick = () => {
        setIsEditing(false);
    };

    const handleSaveClick = async () => {
        if (!service || !editForm.name || !editForm.slug) return;

        try {
            const { authenticatedFetch } = await import('../../utils/apiClient');
            const res = await authenticatedFetch(`/api/services/${service.id}`, {
                method: 'PATCH',
                body: JSON.stringify({
                    name: editForm.name,
                    slug: editForm.slug,
                    description: editForm.description,
                    category: editForm.category,
                    tags: editForm.tags.split(',').map(t => t.trim()).filter(Boolean),
                    capabilities: editForm.capabilities,
                    upstream_url: editForm.upstream_url,
                    openseal_repo_url: repoUrl,
                    openseal_root_hash: capturedHash
                })
            });

            if (res.ok) {
                alert('Service settings updated successfully');
                setIsEditing(false);
                window.location.reload(); // Refresh to reflect slug changes
            } else {
                const err = await res.json();
                alert(`Failed to update service: ${err.error || 'Unknown error'}`);
            }
        } catch (err) {
            console.error('Update error:', err);
            alert('An error occurred while updating settings');
        }
    };

    const handleTestConnection = async () => {
        if (!editForm.upstream_url) {
            alert('Please enter a URL first');
            return;
        }
        setIsTestingConnection(true);
        setConnectionStatus('idle');

        try {
            const data = await testConnection(editForm.upstream_url);
            setIsTestingConnection(false);
            if (data.success) {
                setConnectionStatus('success');
                setLatency(data.latency);
            } else {
                setConnectionStatus('error');
                setLatency(null);
            }
        } catch (err: any) {
            setIsTestingConnection(false);
            setConnectionStatus('error');
            setLatency(null);
        }
    };

    const handleVerifyRepo = async () => {
        if (!repoUrl) {
            alert('Please enter a Release Tag URL');
            return;
        }
        setIsVerifyingRepo(true);
        setRepoStatus('idle');
        setCapturedHash(null);

        try {
            const data = await verifyOpenSealRepo(repoUrl);
            setIsVerifyingRepo(false);
            if (data.success) {
                setRepoStatus('success');
                setCapturedHash(data.root_hash);
            } else {
                setRepoStatus('error');
            }
        } catch (err: any) {
            setIsVerifyingRepo(false);
            setRepoStatus('error');
        }
    };

    const handleGenerateToken = async () => {
        console.log('[DEBUG] handleGenerateToken called, service:', service);
        if (!service) {
            console.log('[DEBUG] No service found, returning');
            return;
        }
        setIsVerifyingOwnership(true);
        try {
            console.log('[DEBUG] Calling generateToken with service.id:', service.id);
            const data = await generateToken(service.id);
            console.log('[DEBUG] Token generated:', data);
            // API returns 'token' not 'verification_token'
            setVerificationToken(data.token);
        } catch (err: any) {
            console.error('[DEBUG] Error generating token:', err);
            alert(err.message);
        } finally {
            setIsVerifyingOwnership(false);
        }
    };

    const handleVerifyOwnership = async () => {
        if (!service) return;
        setIsVerifyingOwnership(true);
        try {
            await verifyOwnership(service.id);
            alert('Domain ownership verified via HTTP!');
            window.location.reload();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsVerifyingOwnership(false);
        }
    };

    const handleVerifyDns = async () => {
        if (!service) return;
        setIsVerifyingOwnership(true);
        try {
            await verifyDns(service.id);
            alert('Domain ownership verified via DNS!');
            window.location.reload();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsVerifyingOwnership(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm(`Are you sure you want to delete "${service?.name}"? This action cannot be undone.`)) return;

        try {
            const { authenticatedFetch } = await import('../../utils/apiClient');
            const res = await authenticatedFetch(`/api/services/${service?.id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                alert('Service deleted successfully');
                navigate('/account');
            } else {
                alert('Failed to delete service');
            }
        } catch (err) {
            console.error('Delete error:', err);
            alert('An error occurred while deleting');
        }
    };

    // Helper to get backend URL for public endpoints
    const getBackendOrigin = () => {
        const origin = window.location.origin;
        if (origin.includes('localhost:5173')) {
            return origin.replace('5173', '3000');
        }
        return origin;
    };

    const handleMetadataClick = () => {
        const url = `${getBackendOrigin().replace(/\/$/, '')}/gatekeeper/${service?.slug}/info`;
        window.open(url, '_blank');
    };

    // Mock Data for charts (still simulated for visual appeal)
    const mockChartData = generateMockChartData();

    const currentChartData = isRealMode ? realChartData : mockChartData;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    if (!service) {
        return (
            <div className="text-center py-20">
                <h2 className="text-xl font-bold text-white">Service Not Found</h2>
                <Link to="/account" className="text-emerald-500 hover:underline mt-4 inline-block">Back to Account</Link>
            </div>
        );
    }

    return (
        <div className="bg-slate-50 min-h-screen font-sans selection:bg-emerald-500/30">
            {/* Header / Hero Section */}
            <div className="bg-white border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-6 py-8">
                    <div className="flex justify-between items-start">
                        {/* Left Side: Content */}
                        <div className="space-y-4 flex-1 max-w-3xl">
                            {isEditing ? (
                                <div className="flex flex-col gap-4">
                                    {/* Domain Ownership Verification Block */}
                                    {service.status !== 'verified' && (
                                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-2">
                                            <div className="flex items-center gap-2 mb-3">
                                                <ShieldIcon className="w-4 h-4 text-amber-600" />
                                                <span className="text-xs font-black uppercase tracking-wider text-amber-700">Domain Ownership Verification Required</span>
                                            </div>

                                            {!verificationToken ? (
                                                <button
                                                    type="button"
                                                    onClick={handleGenerateToken}
                                                    disabled={isVerifyingOwnership}
                                                    className="w-full py-2 bg-amber-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all"
                                                >
                                                    {isVerifyingOwnership ? 'Generating...' : 'Generate Verification Token'}
                                                </button>
                                            ) : (
                                                <div className="space-y-3">
                                                    <div className="bg-white p-3 rounded-xl border border-amber-100 flex items-center justify-between">
                                                        <code className="text-[10px] text-amber-700 font-mono">highstation-verification={verificationToken}</code>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(`highstation-verification=${verificationToken}`);
                                                                alert('Copied to clipboard');
                                                            }}
                                                            className="text-amber-500 hover:text-amber-700"
                                                        >
                                                            <CopyIcon className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={handleVerifyOwnership}
                                                            disabled={isVerifyingOwnership}
                                                            className="py-2 bg-white border border-amber-200 text-amber-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-100"
                                                        >
                                                            Verify via HTTP
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={handleVerifyDns}
                                                            disabled={isVerifyingOwnership}
                                                            className="py-2 bg-white border border-amber-200 text-amber-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-100"
                                                        >
                                                            Verify via DNS
                                                        </button>
                                                    </div>
                                                    <p className="text-[9px] text-amber-600/70 text-center">
                                                        HTTP: Upload to <code>/.well-known/x402-verify.txt</code><br />
                                                        DNS: Add TXT record to <code>@</code> hostname
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="flex flex-col gap-2">
                                        <input
                                            type="text"
                                            value={editForm.name}
                                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                            className="text-4xl font-black tracking-tighter bg-slate-100 border-2 border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:border-emerald-500 focus:outline-none transition-all w-full"
                                            placeholder="Service Name"
                                        />
                                        <div className="flex items-center gap-2">
                                            <span className="text-slate-400 font-mono text-sm">/services/</span>
                                            <input
                                                type="text"
                                                value={editForm.slug}
                                                onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })}
                                                className="font-mono text-sm bg-slate-100 border-2 border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 focus:border-emerald-500 focus:outline-none transition-all flex-1"
                                                placeholder="slug-name"
                                            />
                                        </div>
                                    </div>
                                    <textarea
                                        value={editForm.description}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                                        className="w-full bg-slate-100 border-2 border-slate-200 rounded-xl px-4 py-3 text-slate-700 placeholder-slate-400 focus:border-emerald-500 focus:outline-none min-h-[80px]"
                                        placeholder="Service description..."
                                    />
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <input
                                                type="text"
                                                value={editForm.upstream_url}
                                                onChange={(e) => setEditForm(prev => ({ ...prev, upstream_url: e.target.value }))}
                                                className="w-full bg-slate-100 border-2 border-slate-200 rounded-xl px-4 py-2 text-slate-700 focus:border-emerald-500 outline-none"
                                                placeholder="Upstream URL (e.g. https://api.service.com)"
                                            />
                                        </div>
                                        <button
                                            onClick={handleTestConnection}
                                            disabled={isTestingConnection}
                                            className={`px-4 rounded-xl font-bold text-[10px] uppercase tracking-wider border transition-all ${connectionStatus === 'success' ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-white text-slate-500 border-slate-200'}`}
                                        >
                                            {isTestingConnection ? 'Testing...' : connectionStatus === 'success' ? `Success (${latency}ms)` : 'Test Connection'}
                                        </button>
                                    </div>

                                    <div className="flex gap-4">
                                        <select
                                            value={editForm.category}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value }))}
                                            className="bg-slate-100 border-2 border-slate-200 rounded-xl px-4 py-2 text-slate-700 focus:border-emerald-500 outline-none"
                                        >
                                            {['General', 'DeFi', 'AI', 'Social', 'Infrastructure', 'Gaming'].map(c => (
                                                <option key={c} value={c}>{c}</option>
                                            ))}
                                        </select>
                                        <input
                                            type="text"
                                            value={editForm.tags}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, tags: e.target.value }))}
                                            className="bg-slate-100 border-2 border-slate-200 rounded-xl px-4 py-2 text-slate-700 focus:border-emerald-500 outline-none flex-1"
                                            placeholder="Tags (comma separated)"
                                        />
                                    </div>

                                    {/* Capabilities Editor */}
                                    <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Endpoints & Schema</span>
                                            <button
                                                type="button"
                                                onClick={() => setEditForm(prev => ({
                                                    ...prev,
                                                    capabilities: {
                                                        endpoints: [...prev.capabilities.endpoints, { path: '', description: '', price_usd: '0.01', input_template: '{\n  "param": "value"\n}' }]
                                                    }
                                                }))}
                                                className="text-emerald-600 text-[10px] font-black uppercase"
                                            >
                                                + Add Endpoint
                                            </button>
                                        </div>
                                        <div className="space-y-3">
                                            {editForm.capabilities.endpoints.map((ep: any, idx: number) => (
                                                <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200 relative">
                                                    <button
                                                        onClick={() => {
                                                            const copy = [...editForm.capabilities.endpoints];
                                                            copy.splice(idx, 1);
                                                            setEditForm(prev => ({ ...prev, capabilities: { endpoints: copy } }));
                                                        }}
                                                        className="absolute top-2 right-2 text-slate-300 hover:text-red-500"
                                                    >
                                                        ×
                                                    </button>
                                                    <div className="grid grid-cols-3 gap-2 mb-2">
                                                        <input
                                                            type="text"
                                                            placeholder="Path"
                                                            value={ep.path}
                                                            onChange={e => {
                                                                const copy = [...editForm.capabilities.endpoints];
                                                                copy[idx].path = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                                                                setEditForm(prev => ({ ...prev, capabilities: { endpoints: copy } }));
                                                            }}
                                                            className="text-[10px] font-mono border border-slate-100 rounded px-2 py-1"
                                                        />
                                                        <input
                                                            type="text"
                                                            placeholder="Description"
                                                            value={ep.description}
                                                            onChange={e => {
                                                                const copy = [...editForm.capabilities.endpoints];
                                                                copy[idx].description = e.target.value;
                                                                setEditForm(prev => ({ ...prev, capabilities: { endpoints: copy } }));
                                                            }}
                                                            className="text-[10px] border border-slate-100 rounded px-2 py-1"
                                                        />
                                                        <div className="flex items-center gap-1 border border-slate-100 rounded px-2 py-1">
                                                            <span className="text-[10px] text-slate-400">$</span>
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                placeholder="Price"
                                                                value={ep.price_usd}
                                                                onChange={e => {
                                                                    const copy = [...editForm.capabilities.endpoints];
                                                                    copy[idx].price_usd = e.target.value;
                                                                    setEditForm(prev => ({ ...prev, capabilities: { endpoints: copy } }));
                                                                }}
                                                                className="text-[10px] w-full outline-none"
                                                            />
                                                        </div>
                                                    </div>
                                                    <textarea
                                                        rows={2}
                                                        value={ep.input_template}
                                                        onChange={e => {
                                                            const copy = [...editForm.capabilities.endpoints];
                                                            copy[idx].input_template = e.target.value;
                                                            setEditForm(prev => ({ ...prev, capabilities: { endpoints: copy } }));
                                                        }}
                                                        className="w-full text-[9px] font-mono border border-slate-100 rounded px-2 py-1 bg-slate-50"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* OpenSeal Editor */}
                                    <div className="mt-4 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 block mb-2">OpenSeal Verification</span>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={repoUrl}
                                                onChange={e => setRepoUrl(e.target.value)}
                                                placeholder="GitHub Repo URL"
                                                className="flex-1 text-xs bg-white border border-blue-100 rounded-lg px-3 py-1.5 outline-none"
                                            />
                                            <button
                                                onClick={handleVerifyRepo}
                                                disabled={isVerifyingRepo}
                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${repoStatus === 'success' ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-blue-500 text-white border-blue-600'}`}
                                            >
                                                {isVerifyingRepo ? '...' : repoStatus === 'success' ? 'Verified' : 'Verify'}
                                            </button>
                                        </div>
                                        {capturedHash && <code className="block mt-2 text-[9px] text-blue-500 font-mono break-all">{capturedHash}</code>}
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">
                                        {service.name}
                                    </h1>
                                    {/* @ts-ignore */}
                                    {service.description && (
                                        <p className="text-slate-500 text-sm max-w-2xl mb-4 leading-relaxed">
                                            {service.description}
                                        </p>
                                    )}
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full border border-slate-200">
                                            <div className={`w-2 h-2 rounded-full ${(service.status === 'active' || service.status === 'verified') ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                                            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">{service.status}</span>
                                        </div>
                                        {/* @ts-ignore */}
                                        {service.category && (
                                            <span className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-bold uppercase tracking-wider rounded-full border border-blue-100">
                                                {service.category}
                                            </span>
                                        )}
                                        {/* @ts-ignore */}
                                        {service.tags && service.tags.map((tag: string) => (
                                            <span key={tag} className="text-slate-400 text-xs hover:text-slate-600 cursor-default">#{tag}</span>
                                        ))}
                                        <code className="text-xs text-slate-400 font-mono px-2">ID: {service.slug}</code>
                                    </div>
                                </div>
                            )}

                            {/* Node Status Badge */}
                            {!isEditing && (
                                <div className="mt-4">
                                    <span className="inline-flex items-center gap-3 px-5 py-2 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-xl border border-emerald-100 uppercase tracking-[0.2em] shadow-sm">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                        Node Live
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Right Side: Actions */}
                        <div className="flex gap-3 items-start pl-6">
                            {isEditing ? (
                                <>
                                    <button
                                        onClick={handleSaveClick}
                                        className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-emerald-500 text-white hover:bg-emerald-600 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                                    >
                                        <CheckIcon className="w-4 h-4" /> Save
                                    </button>
                                    <button
                                        onClick={handleCancelClick}
                                        className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all flex items-center gap-2"
                                    >
                                        <XIcon className="w-4 h-4" /> Cancel
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all"
                                    >
                                        Edit Service
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-red-200 text-red-500/70 hover:text-red-600 hover:bg-red-50 transition-all"
                                    >
                                        Delete
                                    </button>
                                    <button
                                        onClick={handleToggleMode}
                                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${isRealMode ? 'bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-500/20' : 'bg-slate-900 text-slate-300 hover:text-white border-transparent'}`}
                                    >
                                        {isRealMode ? '✨ Real Mode' : 'Switch Mode'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">


                {/* Integrity / Verification Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 bg-emerald-50 border border-emerald-100 rounded-2xl p-6 flex items-start gap-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
                            <ShieldIcon className="w-32 h-32 text-emerald-500" />
                        </div>
                        <div className="p-4 bg-emerald-500/20 rounded-2xl text-emerald-500 shadow-[0_8px_20px_rgba(16,185,129,0.2)]">
                            <ShieldIcon className="w-8 h-8" />
                        </div>
                        <div className="relative z-10">
                            <h2 className="text-xl font-bold text-emerald-400 mb-1">Integrity Shield Active</h2>
                            <p className="text-emerald-500/60 text-sm max-w-lg mb-4">
                                Your service is protected by the HighStation verification layer.
                                Traffic is being proxied through the Cronos-based gatekeeper with automated settlement.
                            </p>
                            <div className="flex gap-3">
                                {/* @ts-ignore */}
                                {service.openseal_root_hash ? (
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                        <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-tighter">OpenSeal Sealing Verified</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800/50 border border-white/5 rounded-lg">
                                        <div className="w-2 h-2 rounded-full bg-zinc-600"></div>
                                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-tighter">Code Not Sealed</span>
                                    </div>
                                )}
                                {/* @ts-ignore */}
                                {service.zk_verified && (
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-tighter">ZK Performance Proof Valid</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between shadow-sm">
                        <div>
                            <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-4">Trust Score</div>
                            <div className="flex items-end gap-2">
                                <span className="text-5xl font-black text-slate-900 tracking-tighter">98.4</span>
                                <span className="text-emerald-500 font-bold mb-2">/100</span>
                            </div>
                        </div>
                        <div className="mt-4 flex flex-col gap-2">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500">L1 Code Integrity</span>
                                <span className="text-blue-500 font-bold">PASS</span>
                            </div>
                            <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 w-[98.4%] shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                            </div>
                        </div>
                    </div>
                </div>


                {/* Quick Actions */}
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    <button
                        type="button"
                        onClick={handleEditClick}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all whitespace-nowrap"
                    >
                        <SettingsIcon className="w-4 h-4 text-slate-400" /> Edit Service
                    </button>

                    {/* Dynamic Source Code Button */}
                    {
                        (service.slug === 'text-washer' || service.openseal_repo_url) && (
                            <a
                                href={service.openseal_repo_url || "https://github.com/Gnomone/crypto-price-oracle"}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-sm text-blue-400 hover:bg-blue-500/20 transition-all whitespace-nowrap"
                            >
                                <span className="text-blue-500">📂</span> View Source Code
                            </a>
                        )
                    }

                    {/* API Metadata (Available for all services) */}
                    <button
                        type="button"
                        onClick={handleMetadataClick}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-xl text-sm text-purple-400 hover:bg-purple-500/20 transition-all whitespace-nowrap"
                    >
                        <span className="text-purple-500">📜</span> API Metadata
                    </button>
                </div>

                {/* Traffic Chart */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-8">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <ActivityIcon className="w-5 h-5 text-emerald-500" />
                                Traffic Analytics
                            </h3>
                            <p className="text-slate-500 text-xs mt-1">Real-time throughput processed via Cronos Node.</p>
                        </div>
                        <div className="flex bg-slate-100 rounded-xl p-1 border border-slate-200">
                            {['1h', '24h', '7d', '30d'].map((range) => (
                                <button
                                    key={range}
                                    onClick={() => setTimeRange(range)}
                                    className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${timeRange === range
                                        ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                                        : 'text-slate-400 hover:text-slate-600'
                                        }`}
                                >
                                    {range}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="h-[320px] w-full">
                        <RealTimeChart data={currentChartData} />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 border-t border-slate-100 pt-8">
                        <div className="space-y-1">
                            <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Unique Agents</div>
                            <div className="text-slate-900 text-2xl font-mono font-black tracking-tighter">
                                {isRealMode ? (serviceStats?.uniqueAgents?.toLocaleString() || '0') : '1,248'}
                            </div>
                            <div className="text-[10px] text-emerald-600 font-bold">
                                {isRealMode ? 'Active identity tracking' : `+12% vs last ${timeRange}`}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Total Requests</div>
                            <div className="text-slate-900 text-2xl font-mono font-black tracking-tighter">
                                {isRealMode ? (serviceStats?.totalRequests?.toLocaleString() || '0') : '15.4k'}
                            </div>
                            <div className="text-[10px] text-slate-500 font-bold">Stable performance</div>
                        </div>
                        <div className="space-y-1">
                            <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Revenue (CRO)</div>
                            <div className="text-emerald-600 text-2xl font-mono font-black tracking-tighter">
                                {isRealMode ? (serviceStats?.totalRevenueWei ? (Number(serviceStats.totalRevenueWei) / 1e18).toFixed(4) : '0.0000') : '42.85'}
                            </div>
                            <div className="text-[10px] text-slate-500 font-bold">Settled on-chain</div>
                        </div>
                        <div className="space-y-1">
                            <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Avg. Latency</div>
                            <div className="text-slate-900 text-2xl font-mono font-black tracking-tighter">
                                {isRealMode ? `${serviceStats?.avgLatency || 0}ms` : '38ms'}
                            </div>
                            <div className="text-[10px] text-blue-500 font-bold">Global priority routing</div>
                        </div>
                    </div>
                </div>

                {/* API Gateway Section (Crucial for Promotion) [NEW] */}
                <DashboardCard title="Protocol Gateway Issuance" subtitle="Official managed endpoints issued by HighStation">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl group hover:border-emerald-500/50 transition-all">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Public Call Endpoint</span>
                                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[8px] font-black rounded uppercase">x402 Protected</span>
                                </div>
                                <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200">
                                    <code className="text-sm font-mono text-emerald-600 break-all flex-1">
                                        https://{service.slug}.highstation.net/v1/resource
                                    </code>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(`https://${service.slug}.highstation.net/v1/resource`);
                                            alert('Protocol-assigned infrastructure endpoint copied!');
                                        }}
                                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-900 transition-all"
                                    >
                                        <CopyIcon className="w-4 h-4" />
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-2 font-medium italic">HighStation Managed Gateway (Subdomain-assigned). <span className="text-slate-400">Supports wildcards (e.g., /v2/clean, /session_123)</span></p>
                            </div>

                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl group hover:border-blue-500/50 transition-all">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Global Discovery URL</span>
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[8px] font-black rounded uppercase">Public Info</span>
                                </div>
                                <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200">
                                    <code className="text-sm font-mono text-blue-600 break-all flex-1">
                                        https://{service.slug}.highstation.net/info
                                    </code>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(`https://${service.slug}.highstation.net/info`);
                                            alert('Global discovery URL copied!');
                                        }}
                                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-900 transition-all"
                                    >
                                        <CopyIcon className="w-4 h-4" />
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-2 font-medium italic">Universal protocol metadata for autonomous agents.</p>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col justify-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-10">
                                <GlobeIcon className="w-32 h-32 text-slate-900" />
                            </div>
                            <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                                🚀 Ready for Traffic
                            </h4>
                            <p className="text-xs text-slate-500 leading-relaxed mb-6">
                                Share these endpoints with agent developers. HighStation automatically handles identity verification, payment settlement, and telemetry logging for every request.
                            </p>
                            <div className="flex gap-3">
                                <button className="flex-1 px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-slate-200 shadow-sm">
                                    Integration Kit
                                </button>
                                <button className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-500/20">
                                    Promote Service
                                </button>
                            </div>
                        </div>
                    </div>
                </DashboardCard>

                {/* Bottom Details Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <DashboardCard title="Security Events" subtitle="Filtered by HighStation WAF">
                            <div className="py-12 flex flex-col items-center justify-center text-center opacity-40">
                                <ShieldIcon className="w-12 h-12 text-slate-400 mb-3" />
                                <div className="text-sm font-bold text-slate-500">No malicious activity detected</div>
                                <div className="text-xs text-slate-400 mt-1">Your API is safe and performing within limits.</div>
                            </div>
                        </DashboardCard>
                    </div>
                    <div>
                        <DashboardCard title="OpenSeal Identity" subtitle="Cryptographic Sealing status">
                            <div className="space-y-4">
                                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                                    <span className="text-slate-500 text-[10px] font-black uppercase block mb-1">Root Hash</span>
                                    <span className="text-slate-600 font-mono text-[10px] break-all leading-tight">
                                        {/* @ts-ignore */}
                                        {service.openseal_root_hash || "NOT_SEALED"}
                                    </span>
                                </div>
                                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                                    <span className="text-slate-500 text-[10px] font-black uppercase block mb-1">Repository</span>
                                    <a href="#" className="text-emerald-500 hover:underline text-[10px] font-mono flex items-center gap-1">
                                        {/* @ts-ignore */}
                                        {service.openseal_repo_url || "Link repository in settings"}
                                        <GlobeIcon className="w-3 h-3" />
                                    </a>
                                </div>
                            </div>
                        </DashboardCard>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ServiceDashboard;

