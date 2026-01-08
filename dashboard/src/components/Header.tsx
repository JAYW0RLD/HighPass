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
                    <svg height="32" aria-hidden="true" viewBox="0 0 16 16" version="1.1" width="32" data-view-component="true" className="octicon octicon-mark-github v-align-middle" fill="white">
                        <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.12-1.62.51-2.31-.72-.25-.47-.64-.67-.97-.67-.55-.06-.55.33-.03.55.56.12.92.51 1.34 1.15.42.64 1.17.88 1.96.68.04.53.03 1.57.03 1.84 0 .21-.15.46-.55.38A8.012 8.012 0 0 1 0 8c0-4.42 3.58-8 8-8Z"></path>
                    </svg>
                    <h1>{title || 'x402 Gatekeeper'}</h1>
                </div>
            </div>

            <div className="app-header-nav">
                {location.pathname !== '/settings' && location.pathname !== '/admin' && (
                    <button
                        onClick={() => navigate('/settings')}
                        className="header-link"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                        <span>Select scope</span>
                        <span style={{ opacity: 0.5 }}>▼</span>
                    </button>
                    /* Simplified for now, just to show integration */
                )}

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
