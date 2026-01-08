import { useNavigate, useLocation } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface HeaderProps {
    title?: string;
    subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div onClick={() => navigate('/portal')} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column' }}>
                    <h1 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                        {title || 'x402 Gatekeeper'}
                    </h1>
                    {subtitle && <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{subtitle}</p>}
                </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                {location.pathname !== '/settings' && location.pathname !== '/admin' && (
                    <button
                        onClick={() => navigate('/settings')}
                        style={{
                            background: 'transparent',
                            border: '1px solid var(--border)',
                            color: 'var(--text-primary)',
                            padding: '0.4rem 0.8rem',
                            borderRadius: '6px',
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        ⚙️ Settings
                    </button>
                )}

                <button
                    onClick={() => supabase.auth.signOut()}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--accent-red)',
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        fontWeight: 500
                    }}
                >
                    Sign Out
                </button>
            </div>
        </header>
    );
}
