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
        <div className="auth-container" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            backgroundColor: '#0a0b1e',
            color: 'white'
        }}>
            <div style={{ width: '350px', padding: '2rem', background: '#131429', borderRadius: '12px', border: '1px solid #2d2f45' }}>
                <h2 style={{ textAlign: 'center', marginBottom: '2rem', color: '#00f7ff' }}>X402 LOGIN</h2>
                <Auth
                    supabaseClient={supabase}
                    appearance={{ theme: ThemeSupa }}
                    theme="dark"
                    providers={[]}
                />
            </div>
        </div>
    );
}

export default AuthPage;
