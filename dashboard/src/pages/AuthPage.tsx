import { useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { useNavigate } from 'react-router-dom';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function AuthPage() {
    const navigate = useNavigate();

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session) {
                // Redirect logic will be handled by the protected route wrapper or initial check
                // But for direct login, let's wait a bit or just redirect to home and let router decide
                navigate('/');
            }
        });

        return () => subscription.unsubscribe();
    }, [navigate]);

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 16px',
            backgroundColor: 'var(--bg-secondary)'
        }}>
            <div style={{ marginBottom: '24px', textAlign: 'center' }}>
                <h1 style={{ fontSize: '24px', fontWeight: '300', letterSpacing: '-0.5px' }}>Sign in to X402</h1>
            </div>

            <div className="data-section" style={{ width: '100%', maxWidth: '340px', padding: '24px', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)', border: 'none' }}>
                <Auth
                    supabaseClient={supabase}
                    appearance={{
                        theme: ThemeSupa,
                        variables: {
                            default: {
                                colors: {
                                    brand: '#0f0f0f',
                                    brandAccent: '#272727',
                                    inputBackground: 'var(--bg-primary)',
                                    inputText: 'var(--text-primary)',
                                    inputBorder: 'var(--border)',
                                    inputBorderFocus: '#065fd4',
                                    inputLabelText: 'var(--text-primary)',
                                },
                                radii: {
                                    borderRadiusButton: '20px',
                                    buttonBorderRadius: '20px',
                                    inputBorderRadius: '12px',
                                },
                            }
                        }
                    }}
                    providers={[]}
                />
            </div>
        </div>
    );
}

export default AuthPage;
