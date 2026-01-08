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

            <div className="boxed-group" style={{ width: '100%', maxWidth: '340px', padding: '20px', backgroundColor: 'var(--bg-primary)', boxShadow: 'var(--shadow-card)' }}>
                <Auth
                    supabaseClient={supabase}
                    appearance={{
                        theme: ThemeSupa,
                        variables: {
                            default: {
                                colors: {
                                    brand: '#2da44e',
                                    brandAccent: '#2c974b',
                                    inputBackground: 'var(--bg-primary)',
                                    inputText: 'var(--text-primary)',
                                    inputBorder: 'var(--border)',
                                    inputBorderFocus: '#0969da',
                                    inputLabelText: 'var(--text-primary)',
                                },
                                radii: {
                                    borderRadiusButton: '6px',
                                    buttonBorderRadius: '6px',
                                    inputBorderRadius: '6px',
                                },
                                space: {
                                    inputPadding: '5px 12px',
                                    buttonPadding: '5px 16px',
                                },
                                fontSizes: {
                                    baseBodySize: '14px',
                                    baseInputSize: '14px',
                                    baseLabelSize: '14px',
                                    baseButtonSize: '14px',
                                }
                            }
                        },
                        style: {
                            button: {
                                fontWeight: '500',
                                border: '1px solid rgba(27,31,36,0.15)',
                                boxShadow: '0 1px 0 rgba(27,31,36,0.1)'
                            },
                        }
                    }}
                    providers={[]}
                />
            </div>
        </div>
    );
}

export default AuthPage;
