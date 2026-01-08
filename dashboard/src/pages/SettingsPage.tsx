import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Header from '../components/Header';
import { useNavigate } from 'react-router-dom';

const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface Settings {
    withdrawal_address: string;
    auto_withdraw_enabled: boolean;
    min_withdrawal_amount: string;
}

export default function SettingsPage() {
    const [settings, setSettings] = useState<Settings>({
        withdrawal_address: '',
        auto_withdraw_enabled: false,
        min_withdrawal_amount: '1000000000000000000'
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const navigate = useNavigate();

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

    return (
        <div className="dashboard">
            <Header title="Settings" />

            <div className="settings-layout" style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '2rem' }}>
                {/* Sidebar */}
                <aside className="settings-sidebar">
                    <nav className="settings-nav">
                        <div className="nav-group">
                            <div className="nav-header">Account settings</div>
                            <a href="#" className="nav-item">General</a>
                            <a href="#" className="nav-item active">Billing & Payouts</a>
                            <a href="#" className="nav-item">API Keys</a>
                        </div>
                    </nav>
                </aside>

                {/* Main Content */}
                <main className="settings-content">
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 400, marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Billing & Payouts</h2>

                    <div className="boxed-group">
                        <div className="boxed-header">
                            <h3>Payout Settings</h3>
                        </div>
                        <div className="boxed-body">
                            <form onSubmit={handleSubmit}>
                                <div className="form-group">
                                    <label htmlFor="address">Wallet Address</label>
                                    <input
                                        type="text"
                                        id="address"
                                        className="form-control"
                                        placeholder="0x..."
                                        value={settings.withdrawal_address}
                                        onChange={e => setSettings({ ...settings, withdrawal_address: e.target.value })}
                                    />
                                    <p className="help-text">
                                        The EVM wallet address where you want to receive your payouts.
                                    </p>
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

                    <div style={{ marginTop: '1rem' }}>
                        <button onClick={() => navigate('/portal')} className="btn btn-secondary">
                            ← Back to Portal
                        </button>
                    </div>

                </main>
            </div>
        </div>
    );
}
