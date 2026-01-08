import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Header from '../components/Header';
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

            if (devAuthError && devAuthError.code !== 'PGRST116') { // PGRST116 is "Row not found"
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
                    total_reputation: 'Grade C' // Default start
                })
                .select()
                .single();

            if (error) throw error;
            setProfile(data);
            fetchWallets(data.id);
        } catch (err: any) {
            alert('Error creating profile: ' + err.message);
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
            alert('Wallet Linked Successfully!');
        } catch (err: any) {
            alert('Error adding wallet: ' + err.message);
        }
    };

    if (loading) return <div className="loading"><div className="spinner"></div></div>;

    return (
        <div className="dashboard developer-portal">
            <Header title="Developer Portal" />

            {!profile ? (
                <div className="data-section" style={{ maxWidth: '500px', margin: '2rem auto', textAlign: 'center' }}>
                    <h2>Become a Verified Developer</h2>
                    <p>Link your GitHub account to access Track 2 (Optimistic Payments) and higher rate limits.</p>

                    {githubIdInput ? (
                        <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                            <div style={{ marginBottom: '1rem' }}>
                                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Detected GitHub Identity</span>
                                <div style={{ fontSize: '1.5rem', fontWeight: '600', color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                                    @{githubIdInput}
                                </div>
                            </div>
                            <button
                                onClick={handleCreateProfile}
                                className="btn-primary"
                                disabled={loading}
                                style={{ width: '100%', padding: '1rem' }}
                            >
                                {loading ? 'Verifying...' : 'Confirm & Create Profile'}
                            </button>
                        </div>
                    ) : (
                        <div style={{ marginTop: '2rem', color: 'var(--accent-orange)' }}>
                            <p>Could not detect GitHub account. Please sign in with GitHub.</p>
                        </div>
                    )}
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
                    {/* Status Card */}
                    <div className="data-section" style={{ padding: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h2 style={{ margin: 0 }}>Welcome, {profile.github_id}</h2>
                            <p style={{ color: 'var(--text-secondary)' }}>Verified Developer</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div className="status-badge verified" style={{ fontSize: '1.2rem', padding: '0.5rem 1.5rem' }}>
                                {profile.total_reputation}
                            </div>
                            <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>Global Debt Limit: <strong>${profile.global_debt_limit}</strong></p>
                        </div>
                    </div>

                    {/* Wallets Section */}
                    <div className="data-section" style={{ padding: '1.5rem' }}>
                        <h3>Linked Wallets</h3>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>These wallets are authorized for Track 2 access.</p>

                        <div className="service-list">
                            {wallets.map(w => (
                                <div key={w.address} className="metric-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <code style={{ fontSize: '1rem', color: 'var(--accent-blue)' }}>{w.address}</code>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                            Status: {w.status}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div className="metric-value" style={{ fontSize: '1.2rem' }}>
                                            {/* Show Debt in USD if possible, but currently DB has Wei-ish mix? 
                                                Actually DB stores Numeric for debt. Let's assume it's displayed as is or converted.
                                                Based on Phase 1, it might be Wei. Let's show raw for now or format.
                                            */}
                                            {(Number(w.current_debt) / 1e18).toFixed(6)} CRO
                                        </div>
                                        <div className="metric-label">Current Debt</div>
                                    </div>
                                </div>
                            ))}
                            {wallets.length === 0 && <p>No wallets linked.</p>}
                        </div>

                        <form onSubmit={handleAddWallet} style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
                            <input
                                type="text"
                                placeholder="0x..."
                                value={newWallet}
                                onChange={e => setNewWallet(e.target.value)}
                                className="form-control"
                                style={{ flex: 1 }}
                                required
                            />
                            <button type="submit" className="btn-secondary">Link Wallet</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DeveloperPortal;
