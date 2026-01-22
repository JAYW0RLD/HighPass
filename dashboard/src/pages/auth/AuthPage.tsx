import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/apiClient';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';

function AuthPage() {
    const navigate = useNavigate();
    // email, password, loading are currently not used since only Third Party Providers are enabled
    // Only keeping state if they are going to be used, but for now removing to satisfy strict lints
    // const [email, setEmail] = useState('');
    // const [password, setPassword] = useState('');
    // const [loading, setLoading] = useState(false);

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
            if (session) {
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
            background: 'radial-gradient(circle at top right, #1a1d21, #0f0f0f)',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Ambient Background Effects */}
            <div style={{
                position: 'absolute',
                top: '-20%',
                right: '-10%',
                width: '600px',
                height: '600px',
                background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(0, 0, 0, 0) 70%)',
                borderRadius: '50%',
                pointerEvents: 'none'
            }} />
            <div style={{
                position: 'absolute',
                bottom: '-20%',
                left: '-10%',
                width: '500px',
                height: '500px',
                background: 'radial-gradient(circle, rgba(6, 182, 212, 0.1) 0%, rgba(0, 0, 0, 0) 70%)',
                borderRadius: '50%',
                pointerEvents: 'none'
            }} />

            <div className="card p-2" style={{
                width: '100%',
                maxWidth: '420px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}>
                <div className="text-center mb-2">
                    <div style={{
                        width: '48px',
                        height: '48px',
                        background: '#000000',
                        borderRadius: '50%',
                        margin: '0 auto 1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '24px',
                        border: '2px solid rgba(255, 255, 255, 0.1)'
                    }}>
                        H
                    </div>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', marginBottom: '0.5rem' }}>
                        Welcome to HighStation
                    </h1>
                    <p style={{ color: '#9ca3af', fontSize: '14px' }}>
                        The Agent-First Crypto API Gateway
                    </p>
                </div>

                <div style={{ padding: '0 1rem' }}>
                    <Auth
                        supabaseClient={supabase}
                        appearance={{
                            theme: ThemeSupa,
                            variables: {
                                default: {
                                    colors: {
                                        brand: '#6366f1',
                                        brandAccent: '#4f46e5',
                                        inputBackground: 'rgba(0, 0, 0, 0.2)',
                                        inputText: 'white',
                                        inputBorder: 'rgba(255, 255, 255, 0.1)',
                                        inputBorderFocus: '#6366f1',
                                        inputLabelText: '#9ca3af',
                                    },
                                    radii: {
                                        borderRadiusButton: '12px',
                                        buttonBorderRadius: '12px',
                                        inputBorderRadius: '12px',
                                    },
                                    space: {
                                        inputPadding: '12px 16px',
                                        buttonPadding: '12px 16px',
                                    }
                                }
                            },
                            style: {
                                button: {
                                    fontSize: '15px',
                                    fontWeight: '600',
                                    color: '#1a1d21', // Dark text for visibility on light/white buttons
                                    border: '1px solid rgba(255, 255, 255, 0.1)'
                                },
                                anchor: {
                                    color: '#9ca3af',
                                    fontSize: '14px'
                                },
                                divider: {
                                    background: 'rgba(255, 255, 255, 0.1)'
                                }
                            }
                        }}
                        providers={['github']}
                        redirectTo={window.location.origin}
                        onlyThirdPartyProviders
                    />
                </div>
            </div>

            <p style={{ marginTop: '2rem', color: '#6b7280', fontSize: '13px' }}>
                Powered by HighPass Protocol
            </p>
        </div>
    );
}

export default AuthPage;
