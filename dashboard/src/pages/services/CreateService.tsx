import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useServices } from '../../hooks/useServices';
import {
    GlobeIcon,
    ServerIcon,
    ShieldIcon,
    CheckIcon,
    ArrowUpRightIcon,
    ZapIcon,
    InfoIcon,
    ActivityIcon,
    ShieldCheckIcon,
    AlertCircleIcon
} from '../../components/Icons';
import { DEMO_SERVICE_DEFAULTS } from '../../config';
import toast from 'react-hot-toast';

// Steps Enum
const STEPS = [
    { id: 1, title: 'Identity', icon: GlobeIcon },
    { id: 2, title: 'Security', icon: ShieldIcon },
    { id: 3, title: 'Capabilities', icon: ActivityIcon },
    { id: 4, title: 'Network', icon: ServerIcon },
    { id: 5, title: 'Economics', icon: ZapIcon },
];

export default function CreateService() {
    const navigate = useNavigate();
    const { handleCreateService, testConnection, verifyOpenSealRepo } = useServices();

    // Wizard State
    const [currentStep, setCurrentStep] = useState(1);
    const [completedSteps, setCompletedSteps] = useState<number[]>([]);

    // Form State
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [upstreamUrl, setUpstreamUrl] = useState('');
    const [priceUsdt, setPriceUsdt] = useState('0.01');
    const [minGrade, setMinGrade] = useState('C');
    const [repoUrl, setRepoUrl] = useState('');
    const [manualHash] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState<string>('General');
    const [tags] = useState<string>('');
    const [endpoints, setEndpoints] = useState<any[]>([]);

    // Validation State
    const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [latency, setLatency] = useState<number | null>(null);
    const [isTestingConnection, setIsTestingConnection] = useState(false);

    const [capturedHash, setCapturedHash] = useState<string | null>(null);
    const [isVerifyingRepo, setIsVerifyingRepo] = useState(false);
    const [liveIntegrity, setLiveIntegrity] = useState<'idle' | 'verified' | 'mismatch'>('idle');

    // Auto-generate slug
    useEffect(() => {
        if (name && !slug) {
            setSlug(name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
        }
    }, [name]);

    const handleFillDemoData = () => {
        setName(DEMO_SERVICE_DEFAULTS.NAME);
        // Default slug will be auto-generated from name ('crypto-price-oracle')
        setUpstreamUrl(DEMO_SERVICE_DEFAULTS.UPSTREAM_URL_DEFAULT);
        setPriceUsdt('0.01');
        setMinGrade(DEMO_SERVICE_DEFAULTS.MIN_GRADE);
        setRepoUrl(DEMO_SERVICE_DEFAULTS.OPENSEAL_REPO);
        setCapturedHash(DEMO_SERVICE_DEFAULTS.OPENSEAL_HASH);
        setDescription('Real-time cryptocurrency price oracle. Supports BTC, ETH, and more. Protected by OpenSeal.');
        setEndpoints(DEMO_SERVICE_DEFAULTS.ENDPOINTS || []);
        toast.success('Crypto Oracle demo data populated!');
    };

    const handleNext = () => {
        // Validation per step
        if (currentStep === 1) {
            if (!name || !slug) return toast.error('Name and Slug are required');
        }
        if (currentStep === 2) {
            // Step 2 is now Security (A-Hash)
            const hashToUse = manualHash || capturedHash;
            if (!hashToUse || hashToUse.length < 32) {
                return toast.error('Root A-Hash is required.');
            }
        }
        if (currentStep === 3) {
            // Step 3 is now Capabilities
            if (endpoints.length === 0) {
                toast.error('Defining at least one capability endpoint is recommended.');
            }
        }
        if (currentStep === 4) {
            // Step 4 is now Network (URL)
            if (!upstreamUrl) return toast.error('Upstream URL is required');
            if (connectionStatus !== 'success') return toast.error('Please verify connection first.');
            if (liveIntegrity === 'mismatch') return toast.error('Integrity mismatch detected. Please check your A-Hash or Target URL.');
        }

        if (currentStep < 5) {
            setCompletedSteps(prev => [...prev, currentStep]);
            setCurrentStep(prev => prev + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleTestConnection = async () => {
        if (!upstreamUrl) return toast.error('Enter URL first');
        setIsTestingConnection(true);
        try {
            // Try to use the first meaningful path from capabilities if it exists
            const testPath = endpoints.find(e => e.path && e.path.trim() !== '')?.path || '';
            const data = await testConnection(upstreamUrl, testPath);
            if (data.success) {
                setConnectionStatus('success');
                setLatency(data.latency);
                toast.success(testPath ? `Verified via ${testPath}` : 'Connection Verified');

                // [LIVE INTEGRITY CHECK]
                const providedHash = manualHash || capturedHash;
                if (data.openseal && data.openseal.a_hash) {
                    if (data.openseal.a_hash === providedHash) {
                        setLiveIntegrity('verified');
                    } else {
                        setLiveIntegrity('mismatch');
                        console.warn(`[Integrity] Mismatch! Expected: ${providedHash}, Got: ${data.openseal.a_hash}`);
                    }
                } else {
                    setLiveIntegrity('idle'); // No OpenSeal detected on probe
                }
            } else {
                setConnectionStatus('error');
                setLiveIntegrity('idle');
                toast.error(`Connection failed (Status: ${data.status})`);
            }
        } catch (e: any) {
            setConnectionStatus('error');
            toast.error(e.message);
        } finally {
            setIsTestingConnection(false);
        }
    };

    const handleVerifyRepo = async () => {
        if (!repoUrl) return toast.error('Enter Repo URL first');
        setIsVerifyingRepo(true);
        try {
            const data = await verifyOpenSealRepo(repoUrl);
            if (data.success) {
                setCapturedHash(data.root_hash);
                toast.success('Integrity Verified');
            } else {
                toast.error('Verification Failed');
            }
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setIsVerifyingRepo(false);
        }
    };

    const handleSubmit = async () => {
        // Final Price Calc
        let priceWei = '0';
        try {
            const usdVal = parseFloat(priceUsdt);
            if (!isNaN(usdVal)) {
                // Rate: 1 ETH = 2500 USD
                const weiBig = BigInt(Math.floor((usdVal / 2500) * 1e18));
                priceWei = weiBig.toString();
            }
        } catch (err) { console.error(err); }

        const success = await handleCreateService({
            name,
            slug,
            upstream_url: upstreamUrl,
            price_wei: priceWei,
            access_requirements: {
                min_grade: minGrade,
                requires_openseal: true, // Always required in this flow 
                requires_zk_proof: false
            },
            openseal_repo_url: repoUrl,
            openseal_root_hash: manualHash || capturedHash,
            category,
            tags: tags.split(',').map(t => t.trim()).filter(Boolean),
            description,
            capabilities: {
                endpoints: endpoints.filter(e => e.path.trim() !== '')
            }
        });

        if (success) navigate('/services');
    };

    // --- Step Renderers ---

    const renderIdentityStep = () => (
        <div className="space-y-6 animate-fade-in">
            <h2 className="text-xl font-bold mb-6">Service Identity</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-2">
                    <label className="label">Service Name</label>
                    <input
                        value={name} onChange={e => setName(e.target.value)}
                        placeholder="e.g. Premium Text Analysis"
                        className="input-primary w-full text-lg"
                        autoFocus
                    />
                </div>
                <div>
                    <label className="label">URL Slug</label>
                    <div className="flex">
                        <span className="bg-slate-50 border border-r-0 border-slate-200 rounded-l-xl px-3 py-3 text-xs text-slate-500 font-mono">/</span>
                        <input
                            value={slug} onChange={e => setSlug(e.target.value)}
                            className="input-primary w-full rounded-l-none font-mono text-sm"
                            placeholder="service-slug"
                        />
                    </div>
                </div>
                <div>
                    <label className="label">Category</label>
                    <select
                        value={category} onChange={e => setCategory(e.target.value)}
                        className="input-primary w-full"
                    >
                        {['General', 'DeFi', 'AI', 'Social', 'Infrastructure', 'Gaming'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div className="col-span-2">
                    <label className="label">Description</label>
                    <textarea
                        value={description} onChange={e => setDescription(e.target.value)}
                        rows={3} className="input-primary w-full resize-none"
                    />
                </div>
            </div>
        </div>
    );

    const renderSecurityStep = () => (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h2 className="text-xl font-bold mb-2">Codebase Integrity (OpenSeal)</h2>
                <p className="text-sm text-slate-500 mb-6">Establish the "Golden Truth" identity for your service using the OpenSeal protocol.</p>
            </div>

            <div className="space-y-8">
                <div className="bg-emerald-50/30 p-6 rounded-2xl border-2 border-emerald-500/20 relative overflow-hidden">
                    <ShieldIcon className="absolute -right-6 -bottom-6 w-32 h-32 text-emerald-500/5 -z-10" />

                    <label className="label text-emerald-900 flex items-center gap-2">
                        <ZapIcon className="w-3 h-3 text-emerald-500" />
                        <span>Root Hash (Required)</span>
                    </label>
                    <p className="text-[11px] text-emerald-700/60 mb-3">Securely extracted from your linked public repository.</p>

                    <input
                        value={capturedHash || ''}
                        readOnly
                        placeholder="Waiting for extraction..."
                        onClick={() => !capturedHash && toast('Please use Extract Hash below')}
                        className="input-primary w-full font-mono text-sm border-emerald-200 bg-emerald-50/50 cursor-not-allowed text-slate-500"
                    />

                    {(capturedHash || (manualHash && manualHash.length >= 64)) && (
                        <div className="mt-2 text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                            <CheckIcon className="w-3 h-3" /> Identity Fingerprint Prepared
                        </div>
                    )}
                </div>

                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                    <label className="label text-slate-600 uppercase">Public Repository (Optional)</label>
                    <p className="text-[11px] text-slate-400 mb-3">Link your source code to increase agent trust via transparency.</p>
                    <div className="flex gap-2">
                        <input
                            value={repoUrl} onChange={e => setRepoUrl(e.target.value)}
                            placeholder="https://github.com/user/project"
                            className="input-primary flex-1 text-sm bg-white"
                        />
                        {!capturedHash && (
                            <button
                                onClick={handleVerifyRepo}
                                disabled={isVerifyingRepo || !repoUrl}
                                className="px-4 py-2 text-[11px] font-black uppercase tracking-wider bg-white border border-slate-200 rounded-xl hover:bg-slate-100 disabled:opacity-30 transition-all font-sans"
                            >
                                {isVerifyingRepo ? 'Extracting...' : 'Extract Hash'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    const renderCapabilitiesStep = () => (
        <div className="space-y-6 animate-fade-in h-[500px] overflow-y-auto pr-2">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold">Endpoints</h2>
                    <p className="text-sm text-slate-500">Define the capabilities your agent service exposes.</p>
                </div>
                <button
                    onClick={() => setEndpoints([...endpoints, { path: '', description: '', input_template: '{\n  "param": "value"\n}' }])}
                    className="text-xs font-bold bg-purple-50 text-purple-600 px-3 py-1.5 rounded-lg border border-purple-100 hover:bg-purple-100 transition-colors"
                >
                    + Add Endpoint
                </button>
            </div>

            {endpoints.length === 0 && (
                <div className="text-center py-20 border-2 border-dashed border-slate-100 rounded-xl text-slate-400 text-sm">
                    No custom endpoints. Root path logic will be used.
                </div>
            )}

            {endpoints.map((ep, idx) => (
                <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200 relative group transition-all hover:border-purple-200" >
                    <button
                        onClick={() => setEndpoints(endpoints.filter((_, i) => i !== idx))}
                        className="absolute top-2 right-2 p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all font-mono"
                    >
                        ×
                    </button>
                    <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                            <label className="text-[10px] font-bold uppercase text-slate-400">Path</label>
                            <input
                                value={ep.path}
                                onChange={e => {
                                    const copy = [...endpoints];
                                    copy[idx].path = e.target.value;
                                    setEndpoints(copy);
                                }}
                                className="input-sm w-full font-mono mt-1"
                                placeholder="endpoint-name"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold uppercase text-slate-400">Description</label>
                            <input
                                value={ep.description}
                                onChange={e => {
                                    const copy = [...endpoints];
                                    copy[idx].description = e.target.value;
                                    setEndpoints(copy);
                                }}
                                className="input-sm w-full mt-1"
                                placeholder="What does it do?"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold uppercase text-slate-400">Input JSON Model</label>
                        <textarea
                            value={ep.input_template}
                            onChange={e => {
                                const copy = [...endpoints];
                                copy[idx].input_template = e.target.value;
                                setEndpoints(copy);
                            }}
                            className="input-sm w-full mt-1 font-mono text-[11px] h-20 resize-none"
                        />
                    </div>
                </div>
            ))}
        </div>
    );

    const renderNetworkStep = () => (
        <>
            <div className="mb-8">
                <h2 className="text-xl font-black tracking-tight text-slate-900 mb-2">Network & Integrity Audit</h2>
                <p className="text-sm text-slate-500 mb-6">
                    Verify connectivity and confirm the runtime matches your registered source code (Truth vs Live).
                </p>
            </div>

            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                <label className="label text-slate-600">Upstream URL (Provider Target)</label>
                <div className="flex gap-2">
                    <input
                        value={upstreamUrl} onChange={e => setUpstreamUrl(e.target.value)}
                        placeholder="https://api.yourdomain.com"
                        className="input-primary flex-1 font-mono text-sm"
                    />
                    <button
                        onClick={handleTestConnection}
                        disabled={isTestingConnection}
                        className={`px-5 font-bold text-sm rounded-xl border transition-all flex items-center gap-2 ${connectionStatus === 'success'
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                            }`}
                    >
                        {isTestingConnection ? <ActivityIcon className="w-4 h-4 animate-spin" /> : connectionStatus === 'success' ? 'Verified' : 'Test Connection'}
                    </button>
                </div>

                {connectionStatus === 'success' && (
                    <div className="mt-4 animate-slide-up">
                        <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Live Probe Active</span>
                            </div>
                            <div className="text-[10px] font-mono text-slate-400">Latency: {latency}ms</div>
                        </div>

                        {/* Integrity Validation Result */}
                        <div className={`mt-3 p-4 rounded-xl border-2 flex items-center gap-3 transition-all ${liveIntegrity === 'verified' ? 'bg-emerald-50 border-emerald-500/30 text-emerald-800' :
                            liveIntegrity === 'mismatch' ? 'bg-red-50 border-red-500/30 text-red-800' :
                                'bg-blue-50 border-blue-500/30 text-blue-800'
                            }`}>
                            <div className={`p-2 rounded-full ${liveIntegrity === 'verified' ? 'bg-emerald-100' :
                                liveIntegrity === 'mismatch' ? 'bg-red-100' : 'bg-blue-100'
                                }`}>
                                {liveIntegrity === 'verified' ? <ShieldCheckIcon className="w-4 h-4" /> :
                                    liveIntegrity === 'mismatch' ? <AlertCircleIcon className="w-4 h-4" /> :
                                        <InfoIcon className="w-4 h-4" />}
                            </div>
                            <div>
                                <div className="text-xs font-bold uppercase tracking-tight">
                                    {liveIntegrity === 'verified' ? 'Live Integrity Verified' :
                                        liveIntegrity === 'mismatch' ? 'Integrity Mismatch Detected' :
                                            'Waiting for OpenSeal Probe'}
                                </div>
                                <div className="text-[10px] opacity-70 leading-tight mt-0.5">
                                    {liveIntegrity === 'verified' ? 'The upstream service is running the code matching your A-Hash.' :
                                        liveIntegrity === 'mismatch' ? 'The provider returned a DIFFERENT A-Hash. Please verify your deployment.' :
                                            'We successfully pinged the target, but no OpenSeal identity was detected in the response.'}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );

    const renderEconomicsStep = () => (
        <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-2 gap-8">
                <div>
                    <h2 className="text-xl font-bold mb-4">Pricing</h2>
                    <label className="label">Price per Request (USD)</label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                        <input
                            type="number" step="0.01"
                            value={priceUsdt} onChange={e => setPriceUsdt(e.target.value)}
                            className="input-primary w-full text-2xl font-black pl-8"
                        />
                    </div>
                    <p className="text-xs text-emerald-600 font-medium mt-2">
                        ≈ {(parseFloat(priceUsdt || '0') / 2500).toFixed(6)} ETH
                    </p>
                </div>

                <div>
                    <h2 className="text-xl font-bold mb-4">Agent Access</h2>
                    <label className="label">Min. Trust Grade</label>
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        {['F', 'C', 'B', 'A'].map(g => (
                            <button
                                key={g}
                                onClick={() => setMinGrade(g)}
                                className={`flex-1 py-3 rounded-lg text-sm font-black transition-all ${minGrade === g ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400'
                                    }`}
                            >
                                {g}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 mt-8">
                <h3 className="font-bold text-slate-900 mb-4">Deployment Summary</h3>
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-slate-500">Service</span>
                        <span className="font-bold">{name}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Full URL</span>
                        <span className="font-mono text-xs bg-white px-2 py-0.5 rounded border">highstation.net/{slug}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Upstream</span>
                        <span className="font-mono text-emerald-600">Verified</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Integrity Check</span>
                        <span className="font-mono text-emerald-600">OpenSeal v2.0 (Active)</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Root Hash</span>
                        <span className="font-mono text-[10px] text-emerald-700">{(manualHash || capturedHash || '').slice(0, 12)}...</span>
                    </div>
                    <div className="h-px bg-slate-200 my-2"></div>
                    <div className="flex justify-between text-base">
                        <span className="font-bold text-slate-700">Estimated Revenue</span>
                        <span className="font-black text-emerald-600">${priceUsdt} / call</span>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto pb-20 animate-fade-in relative">

            {/* Header & Step Bar */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Register New Service</h1>
                        <p className="text-slate-500 mt-1">Deploy high-integrity AI agent endpoints.</p>
                    </div>
                    <button
                        onClick={handleFillDemoData}
                        className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors"
                    >
                        Auto-fill Demo
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="flex items-center justify-between relative px-4">
                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -z-10" />
                    <div
                        className="absolute top-1/2 left-0 h-0.5 bg-emerald-500 -z-10 transition-all duration-500 ease-out"
                        style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
                    />

                    {STEPS.map((step) => {
                        const isCompleted = completedSteps.includes(step.id) || currentStep > step.id;
                        const isCurrent = currentStep === step.id;
                        const Icon = step.icon;

                        return (
                            <div key={step.id} className="flex flex-col items-center gap-2 bg-white px-2">
                                <div
                                    className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all duration-300 ${isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' :
                                        isCurrent ? 'bg-white border-emerald-500 text-emerald-600 shadow-lg shadow-emerald-500/20' :
                                            'bg-slate-50 border-slate-200 text-slate-300'
                                        }`}
                                >
                                    {isCompleted ? <CheckIcon className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                                </div>
                                <span className={`text-[10px] uppercase font-bold tracking-wider ${isCurrent ? 'text-emerald-700' : 'text-slate-400'
                                    }`}>
                                    {step.title}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Step Content */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm min-h-[450px] mb-8 relative overflow-hidden">
                <div
                    className="flex transition-transform duration-500 ease-out h-full"
                    style={{ transform: `translateX(-${(currentStep - 1) * 20}%)`, width: '500%' }}
                >
                    <div className="w-1/5 flex-shrink-0 p-8">
                        {renderIdentityStep()}
                    </div>
                    <div className="w-1/5 flex-shrink-0 p-8">
                        {renderSecurityStep()}
                    </div>
                    <div className="w-1/5 flex-shrink-0 p-8">
                        {renderCapabilitiesStep()}
                    </div>
                    <div className="w-1/5 flex-shrink-0 p-8">
                        {renderNetworkStep()}
                    </div>
                    <div className="w-1/5 flex-shrink-0 p-8">
                        {renderEconomicsStep()}
                    </div>
                </div>
            </div>

            {/* Navigation Footer */}
            <div className="flex justify-between items-center pt-6 border-t border-slate-100">
                <button
                    onClick={handleBack}
                    disabled={currentStep === 1}
                    className="px-6 py-3 font-bold text-slate-500 disabled:opacity-30 hover:text-slate-800 transition-colors"
                >
                    Back
                </button>
                <div className="flex gap-4">
                    <button
                        onClick={() => navigate('/services')}
                        className="px-6 py-3 font-bold text-slate-400 hover:text-red-500 transition-colors text-sm"
                    >
                        Cancel
                    </button>
                    {currentStep === 5 ? (
                        <button
                            onClick={handleSubmit}
                            className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold shadow-xl hover:bg-slate-800 active:scale-95 transition-all flex items-center gap-2"
                        >
                            <span>Deploy Service</span>
                            <ArrowUpRightIcon className="w-4 h-4" />
                        </button>
                    ) : (
                        <button
                            onClick={handleNext}
                            className="bg-emerald-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 active:scale-95 transition-all"
                        >
                            Continue
                        </button>
                    )}
                </div>
            </div>

            {/* Global Styles for Inputs */}
            <style>{`
                .label { display: block; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 0.5rem; }
                .input-primary { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 0.75rem 1rem; transition: all 0.2s; outline: none; }
                .input-primary:focus { border-color: #10b981; box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.1); background: white; }
                .input-sm { background: white; border: 1px solid #e2e8f0; border-radius: 0.5rem; padding: 0.5rem 0.75rem; font-size: 0.875rem; outline: none; transition: all 0.2s; }
                .input-sm:focus { border-color: #10b981; }

                /* Hide scrollbar for the slider container but allow vertical scrolling inside steps if needed */
                .wizard-container::-webkit-scrollbar { display: none; }
            `}</style>
        </div>
    );
}
