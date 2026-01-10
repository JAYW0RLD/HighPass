import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import toast from 'react-hot-toast';
import Header from '../components/Header';
import { NoWalletsState } from '../components/EmptyState';
import { FuelGauge } from '../components/FuelGauge';
import { DashboardCard } from '../components/DashboardCard';
import '../App.css';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

interface DeveloperProfile {
    id: string;
    github_id: string;
    global_debt_limit: number;
    total_reputation: string;
}

interface Wallet {
    address: string;
    current_debt: number;
    status: string;
}

function DeveloperPortal() {
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<DeveloperProfile | null>(null);
    const [wallets, setWallets] = useState<Wallet[]>([]);
    const [newWallet, setNewWallet] = useState('');
    const [githubIdInput, setGithubIdInput] = useState('');

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Auto-detect GitHub ID from metadata
            const detectedGithub = user.user_metadata.preferred_username || user.user_metadata.user_name;
            if (detectedGithub) {
                setGithubIdInput(detectedGithub);
            }

            // Fetch Developer Profile linked to this user
            const { data: devAuthData, error: devAuthError } = await supabase
                .from('developers')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (devAuthError && devAuthError.code !== 'PGRST116') {
                console.error('Error fetching profile:', devAuthError);
            }

            if (devAuthData) {
                setProfile(devAuthData);
                fetchWallets(devAuthData.id);
            } else {
                setLoading(false);
            }
        } catch (err) {
            console.error('Error:', err);
            setLoading(false);
        }
    };

    const fetchWallets = async (developerId: string) => {
        const { data, error } = await supabase
            .from('wallets')
            .select('*')
            .eq('developer_id', developerId);

        if (error) console.error('Error fetching wallets:', error);
        setWallets(data || []);
        setLoading(false);
    };

    const handleCreateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('developers')
                .insert({
                    user_id: user.id,
                    github_id: githubIdInput,
                    total_reputation: 'Grade C'
                })
                .select()
                .single();

            if (error) throw error;
            setProfile(data);
            fetchWallets(data.id);
            toast.success('Profile created successfully! Welcome! 🎉');
        } catch (err: any) {
            toast.error('Failed to create profile: ' + err.message);
        }
    };

    const handleAddWallet = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile) return;
        try {
            const { error } = await supabase
                .from('wallets')
                .insert({
                    address: newWallet,
                    developer_id: profile.id,
                    current_debt: 0
                });

            if (error) throw error;
            setNewWallet('');
            fetchWallets(profile.id);
            toast.success('Wallet linked successfully! 💳');
        } catch (err: any) {
            toast.error('Failed to add wallet: ' + err.message);
        }
    };

    if (loading) return <div className="loading"><div className="spinner"></div></div>;

    // Fuel Gauge Mock Calculation (Debt vs Limit)
    // Assuming debt limit is around $10 for demo, calculate usage
    // const creditUsage = 15; // Example: 15% used
    const creditAvailable = 0.08; // $0.08 available credit mock

    return (
        <div className="dashboard consumer-dashboard">
            <Header title="Consumer Dashboard" />

            {!profile ? (
                <div className="flex items-center justify-center min-h-[50vh]">
                    <DashboardCard title="Become a Verified Consumer" className="max-w-md w-full text-center">
                        <p className="text-secondary mb-6">Link your GitHub account to access Track 2 (Optimistic Payments) and higher rate limits.</p>
                        {githubIdInput ? (
                            <div className="bg-gradient-dark p-6 rounded-xl border border-border">
                                <div className="text-sm text-secondary mb-2">Detected GitHub Identity</div>
                                <div className="text-2xl font-bold text-white mb-6">@{githubIdInput}</div>
                                <button
                                    onClick={handleCreateProfile}
                                    className="btn btn-primary w-full justify-center py-3 font-bold"
                                    disabled={loading}
                                >
                                    {loading ? 'Verifying...' : 'Confirm & Link Identity'}
                                </button>
                            </div>
                        ) : (
                            <div className="text-orange-400 p-4 border border-orange-500/20 bg-orange-500/10 rounded-xl">
                                Could not detect GitHub account. Please sign in with GitHub.
                            </div>
                        )}
                    </DashboardCard>
                </div>
            ) : (
                <div className="dashboard-grid mt-2">
                    {/* Top Row: Trust Seed & Savings */}
                    <div className="col-span-8">
                        <DashboardCard title="Trust Seed Fuel Gauge">
                            <div className="py-2">
                                <FuelGauge
                                    value={85}
                                    label="Available Credit"
                                    subLabel={`$${creditAvailable.toFixed(2)} / $0.10`}
                                    color="#00ff94"
                                />
                                <div className="mt-4 text-3xl font-mono text-green-400 font-bold">
                                    ${creditAvailable}
                                    <span className="text-sm text-secondary ml-2 font-sans font-normal">/ $0.10 Limit</span>
                                </div>
                            </div>
                        </DashboardCard>
                    </div>
                    <div className="col-span-4">
                        <DashboardCard className="bg-gradient-to-br from-green-900/20 to-black h-full relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl transform translate-x-10 -translate-y-10"></div>
                            <div className="relative z-10">
                                <h3 className="text-secondary font-bold text-sm uppercase mb-4">Gas Savings</h3>
                                <div className="text-secondary text-xs mb-1">You saved</div>
                                <div className="text-4xl font-bold text-white mb-4">$1,763</div>
                                <div className="inline-flex items-center px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-bold border border-green-500/30">
                                    42% Fees Saved
                                </div>
                            </div>
                            <div className="absolute bottom-4 right-4 text-6xl text-green-500/10 font-bold">
                                %
                            </div>
                        </DashboardCard>
                    </div>

                    {/* Middle Row: Verified Marketplace */}
                    <div className="col-span-12 mt-4">
                        <div className="flex justify-between items-center mb-4 px-2">
                            <h3 className="text-lg font-semibold text-white">Verified API Marketplace</h3>
                            <button className="text-sm text-blue-400 hover:text-white transition-colors">View All &rarr;</button>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            {/* Card 1 */}
                            <DashboardCard className="relative overflow-hidden group hover:border-blue-500/50 transition-all cursor-pointer">
                                <div className="absolute top-0 right-0 bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl">S-Grade</div>
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xl">C</div>
                                    <div>
                                        <h4 className="text-white font-bold">Cronos Pulse</h4>
                                        <div className="text-xs text-secondary">9-Grade Reliability</div>
                                    </div>
                                </div>
                                <p className="text-sm text-secondary mb-4 line-clamp-2">
                                    Real-time Cronos Pulse assets and market data API. High frequency updates.
                                </p>
                                <div className="flex justify-between items-center border-t border-white/5 pt-3">
                                    <span className="font-mono text-white text-sm">$15.00/mo</span>
                                    <span className="text-xs text-secondary">Reputation 98</span>
                                </div>
                            </DashboardCard>

                            {/* Card 2 */}
                            <DashboardCard className="relative overflow-hidden group hover:border-green-500/50 transition-all cursor-pointer">
                                <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl">A-Grade</div>
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 font-bold text-xl">H</div>
                                    <div>
                                        <h4 className="text-white font-bold">Honeypot Radar</h4>
                                        <div className="text-xs text-secondary">Security Scanning</div>
                                    </div>
                                </div>
                                <p className="text-sm text-secondary mb-4 line-clamp-2">
                                    Advanced honeypot detection for smart contracts on Cronos zkEVM.
                                </p>
                                <div className="flex justify-between items-center border-t border-white/5 pt-3">
                                    <span className="font-mono text-white text-sm">$7.00/call</span>
                                    <span className="text-xs text-secondary">Reputation 89</span>
                                </div>
                            </DashboardCard>

                            {/* Card 3 */}
                            <DashboardCard className="relative overflow-hidden group hover:border-red-500/50 transition-all cursor-pointer">
                                <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl">S-Grade</div>
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 font-bold text-xl">S</div>
                                    <div>
                                        <h4 className="text-white font-bold">Security Guard</h4>
                                        <div className="text-xs text-secondary">Threat Prevention</div>
                                    </div>
                                </div>
                                <p className="text-sm text-secondary mb-4 line-clamp-2">
                                    Active threat neutralizer and pre-transaction simulation guard.
                                </p>
                                <div className="flex justify-between items-center border-t border-white/5 pt-3">
                                    <span className="font-mono text-white text-sm">$10.00/mo</span>
                                    <span className="text-xs text-secondary">Reputation 99</span>
                                </div>
                            </DashboardCard>
                        </div>
                    </div>

                    {/* Linked Wallets (Moved to bottom) */}
                    <div className="col-span-12 mt-6">
                        <DashboardCard title="Linked Wallets" subtitle="Manage your track 2 identities">
                            <div className="flex flex-col gap-2">
                                {wallets.map(w => (
                                    <div key={w.address} className="flex justify-between items-center p-3 bg-secondary rounded border border-border">
                                        <code className="text-blue-400">{w.address}</code>
                                        <div className="text-right">
                                            <div className="text-white font-mono">{(Number(w.current_debt) / 1e18).toFixed(6)} CRO</div>
                                            <div className="text-[10px] text-secondary">DEBT</div>
                                        </div>
                                    </div>
                                ))}
                                {wallets.length === 0 && <NoWalletsState />}
                                <form onSubmit={handleAddWallet} className="flex gap-2 mt-2">
                                    <input type="text" placeholder="0x..." value={newWallet} onChange={e => setNewWallet(e.target.value)} className="form-control bg-input border-border flex-1" required />
                                    <button type="submit" className="btn btn-secondary">Link New Wallet</button>
                                </form>
                            </div>
                        </DashboardCard>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DeveloperPortal;
