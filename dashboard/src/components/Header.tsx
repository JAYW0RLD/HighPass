import { useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface HeaderProps {
    title?: string;
}

export default function Header({ title }: HeaderProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const [showSwitcher, setShowSwitcher] = useState(false);

    const handleSwitch = (path: string) => {
        navigate(path);
        setShowSwitcher(false);
    };

    return (
        <header className="app-header">
            <div className="app-header-nav">
                <div onClick={() => navigate('/portal')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '32px',
                        height: '32px',
                        background: '#000000',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '14px'
                    }}>H</div>
                    <h1 style={{ color: 'var(--text-primary)', fontSize: '18px', letterSpacing: '-0.5px' }}>{title || 'HighStation'}</h1>
                </div>
            </div>

            <div className="app-header-nav">
                {/* Portal Switcher (YouTube Studio Style) */}
                <div style={{ position: 'relative' }}>
                    <button
                        onClick={() => setShowSwitcher(!showSwitcher)}
                        className="header-link"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}
                    >
                        Switch View ▾
                    </button>

                    {showSwitcher && (
                        <div style={{
                            position: 'absolute',
                            top: '100%',
                            right: 0,
                            marginTop: '0.5rem',
                            width: '240px',
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-md)',
                            boxShadow: 'var(--shadow-md)',
                            zIndex: 1000,
                            padding: '0.5rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.25rem'
                        }}>
                            <div className="switcher-header" style={{
                                padding: '0.75rem',
                                fontSize: '0.8rem',
                                color: 'var(--text-secondary)',
                                borderBottom: '1px solid var(--border)',
                                marginBottom: '0.25rem'
                            }}>
                                SWITCH PORTAL
                            </div>
                            <button
                                onClick={() => handleSwitch('/portal')}
                                style={{
                                    textAlign: 'left',
                                    padding: '0.75rem',
                                    background: location.pathname.includes('/portal') ? 'var(--bg-secondary)' : 'transparent',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    fontWeight: location.pathname.includes('/portal') ? 600 : 400,
                                    color: 'var(--text-primary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between'
                                }}
                            >
                                <span>Provider Portal</span>
                                {location.pathname.includes('/portal') && <span style={{ color: 'var(--accent-blue)' }}>●</span>}
                            </button>
                            <button
                                onClick={() => handleSwitch('/developer')}
                                style={{
                                    textAlign: 'left',
                                    padding: '0.75rem',
                                    background: location.pathname.includes('/developer') ? 'var(--bg-secondary)' : 'transparent',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    fontWeight: location.pathname.includes('/developer') ? 600 : 400,
                                    color: 'var(--text-primary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between'
                                }}
                            >
                                <span>Developer Portal</span>
                                {location.pathname.includes('/developer') && <span style={{ color: 'var(--accent-blue)' }}>●</span>}
                            </button>
                        </div>
                    )}
                </div>

                {location.pathname !== '/settings' && location.pathname !== '/admin' && (
                    <button
                        onClick={() => navigate('/settings')}
                        className="header-link"
                        style={{ border: 'none', background: 'none', cursor: 'pointer' }}
                    >
                        Settings
                    </button>
                )}

                <button
                    onClick={() => supabase.auth.signOut()}
                    className="header-link"
                    style={{ border: 'none', background: 'none', cursor: 'pointer' }}
                >
                    Sign out
                </button>
            </div>
        </header>
    );
}
