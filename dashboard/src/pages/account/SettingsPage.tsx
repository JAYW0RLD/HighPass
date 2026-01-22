import { useState, useEffect } from 'react';
import { supabase } from '../../utils/apiClient';
import Header from '../../components/Header';
import { useNavigate } from 'react-router-dom';
import '../App.css';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useSignMessage } from 'wagmi';
import { useAuth } from '../../contexts/AuthContext';

interface Settings {
    withdrawal_address: string;
    auto_withdraw_enabled: boolean;
    min_withdrawal_amount: string;
}

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState<'general' | 'billing'>('billing');
    const [settings, setSettings] = useState<Settings>({
        withdrawal_address: '',
        auto_withdraw_enabled: false,
        min_withdrawal_amount: '1000000000000000000'
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const { user } = useAuth();
    const navigate = useNavigate();

    // Wagmi Hooks
    const { address, isConnected } = useAccount();
    const { signMessageAsync, isPending } = useSignMessage();

    const handleBindWallet = async () => {
        if (!address || !user?.id) return;

        try {
            const messageToSign = `Bind Wallet ${address} to HighStation Account ${user.id}`;
            const signature = await signMessageAsync({ message: messageToSign });

            // In a real implementation, we would send the signature to the backend for verification.
            // For now, we trust the client-side signature and update the settings.
            // TODO: Implement backend signature verification (Phase 3)

            console.log('Wallet Signature:', signature);
            setSettings(prev => ({ ...prev, withdrawal_address: address }));

            // Auto-save
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            await fetch('/api/settings', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': session.user.id
                },
                body: JSON.stringify({ ...settings, withdrawal_address: address })
            });

            setMessage({ type: 'success', text: 'Wallet successfully bound!' });
        } catch (error) {
            console.error('Wallet binding failed:', error);
            setMessage({ type: 'error', text: 'Failed to bind wallet. Please try again.' });
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const response = await fetch('/api/settings', {
                headers: {
                    'x-user-id': session.user.id
                }
            });

            if (response.ok) {
                const data = await response.json();
                setSettings(data);
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const response = await fetch('/api/settings', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': session.user.id
                },
                body: JSON.stringify(settings)
            });

            if (!response.ok) throw new Error('Failed to update');

            setMessage({ type: 'success', text: 'Settings saved successfully.' });
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to save settings.' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="loading"><div className="spinner"></div></div>;

    const renderTabContent = () => {
        switch (activeTab) {
            case 'general':
                return (
                    <>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 400, marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>General Settings</h2>
                        <div className="boxed-group">
                            <div className="boxed-header">
                                <h3>Profile</h3>
                            </div>
                            <div className="boxed-body">
                                <div className="form-group">
                                    <label>Email Address</label>
                                    <input type="text" className="form-control" value={user?.email || ''} disabled />
                                    <p className="help-text">Your email address is managed via Supabase Auth.</p>
                                </div>
                                <div className="form-group">
                                    <label>Provider ID</label>
                                    <input type="text" className="form-control" value={user?.id || ''} disabled />
                                    <p className="help-text">Unique identifier for your provider account.</p>
                                </div>
                            </div>
                        </div>
                    </>
                );
            case 'billing':
                return (
                    <>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 400, marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Billing & Payouts</h2>

                        <div className="boxed-group">
                            <div className="boxed-header">
                                <h3>Payout Settings</h3>
                            </div>
                            <div className="boxed-body">
                                <form onSubmit={handleSubmit}>
                                    <div className="form-group">
                                        <label htmlFor="address">Settlement Wallet</label>
                                        <div className="flex flex-col gap-4">
                                            <p className="text-zinc-500 text-xs">
                                                Connect your wallet and sign a message to bind it to your HighStation account.
                                                This address will be used for all future payouts.
                                            </p>

                                            <div className="flex items-center gap-4 p-4 bg-zinc-900 rounded-xl border border-white/5">
                                                <ConnectButton
                                                    showBalance={false}
                                                    chainStatus="icon"
                                                    accountStatus={{
                                                        smallScreen: 'avatar',
                                                        largeScreen: 'full',
                                                    }}
                                                />

                                                {isConnected && address && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleBindWallet()}
                                                        disabled={isPending || settings.withdrawal_address === address}
                                                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all ${settings.withdrawal_address === address
                                                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 cursor-default'
                                                            : 'bg-emerald-500 text-black hover:bg-emerald-400'
                                                            }`}
                                                    >
                                                        {isPending ? 'Signing...' :
                                                            settings.withdrawal_address === address ? '✓ Wallet Linked' : 'Sign & Bind Wallet'}
                                                    </button>
                                                )}
                                            </div>

                                            {settings.withdrawal_address && (
                                                <div className="flex items-center gap-2 text-xs text-zinc-500">
                                                    <span className="font-bold">Active Payout Address:</span>
                                                    <code className="bg-zinc-800 px-2 py-0.5 rounded text-emerald-400">
                                                        {settings.withdrawal_address}
                                                    </code>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label className="checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={settings.auto_withdraw_enabled}
                                                onChange={e => setSettings({ ...settings, auto_withdraw_enabled: e.target.checked })}
                                            />
                                            Enable Automatic Payouts
                                        </label>
                                        <p className="help-text" style={{ marginLeft: '1.7rem' }}>
                                            Automatically withdraw funds when balance exceeds threshold.
                                        </p>
                                    </div>

                                    {settings.auto_withdraw_enabled && (
                                        <div className="form-group">
                                            <label htmlFor="threshold">Minimum Payout Threshold (Wei)</label>
                                            <input
                                                type="text"
                                                id="threshold"
                                                className="form-control"
                                                value={settings.min_withdrawal_amount}
                                                onChange={e => setSettings({ ...settings, min_withdrawal_amount: e.target.value })}
                                            />
                                        </div>
                                    )}

                                    <div className="form-actions">
                                        <button type="submit" className="btn btn-primary" disabled={saving}>
                                            {saving ? 'Saving...' : 'Save settings'}
                                        </button>
                                        {message && <span className={`message ${message.type}`}>{message.text}</span>}
                                    </div>
                                </form>
                            </div>
                        </div>

                        <div className="boxed-group" style={{ marginTop: '2rem' }}>
                            <div className="boxed-header">
                                <h3>Payout History</h3>
                            </div>
                            <div className="boxed-body">
                                <p className="empty-state">No past payouts found.</p>
                            </div>
                        </div>
                    </>
                );
        }
    };

    return (
        <div className="dashboard">
            <Header title="Settings" />

            <div className="settings-layout" style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '2rem' }}>
                {/* Sidebar */}
                <aside className="settings-sidebar">
                    <nav className="settings-nav">
                        <div className="nav-group">
                            <div className="nav-header">Account settings</div>
                            <button
                                onClick={() => setActiveTab('general')}
                                className={`nav-item ${activeTab === 'general' ? 'active' : ''}`}
                                style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: 'inherit' }}
                            >
                                General
                            </button>
                            <button
                                onClick={() => setActiveTab('billing')}
                                className={`nav-item ${activeTab === 'billing' ? 'active' : ''}`}
                                style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: 'inherit' }}
                            >
                                Billing & Payouts
                            </button>
                        </div>
                    </nav>
                </aside>

                {/* Main Content */}
                <main className="settings-content">
                    {renderTabContent()}

                    <div style={{ marginTop: '1rem' }}>
                        <button onClick={() => navigate('/portal')} className="btn btn-secondary">
                            ← Back to Portal
                        </button>
                    </div>
                </main>
            </div>
            <footer className="footer" style={{ marginTop: '4rem' }}>
                <span>Account Settings</span>
                <span>•</span>
                <span>HighStation v2.3</span>
            </footer>
        </div>
    );
}
