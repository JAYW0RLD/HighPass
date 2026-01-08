import { useNavigate, useLocation } from 'react-router-dom';
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

    return (
        <header className="app-header">
            <div className="app-header-nav">
                <div onClick={() => navigate('/portal')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                        width: '32px',
                        height: '32px',
                        background: 'var(--accent-blue)',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '18px'
                    }}>X</div>
                    <h1>{title || 'x402 Gatekeeper'}</h1>
                </div>
            </div>

            <div className="app-header-nav">

                {/* Show Settings link if not on settings page */}
                {location.pathname !== '/settings' && location.pathname !== '/admin' && (
                    <button
                        onClick={() => navigate('/settings')}
                        className="header-link"
                        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                        Settings
                    </button>
                )}

                <button
                    onClick={() => supabase.auth.signOut()}
                    className="header-link"
                    style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                >
                    Sign out
                </button>
            </div>
        </header>
    );
}
