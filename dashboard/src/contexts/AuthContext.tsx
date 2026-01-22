import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../utils/apiClient';
import type { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // [SECURITY] 프로덕션 빌드에서는 절대 우회 불가능하도록 강제 차단
        const isProd = import.meta.env.PROD;
        const bypassAuth = !isProd && import.meta.env.VITE_BYPASS_AUTH === 'true';

        // 1. Check active session
        const initSession = async () => {
            if (bypassAuth) {
                console.log('[AuthContext] Sandbox Mode: Bypassing real login');
                const mockSession: any = {
                    access_token: 'sandbox-bypass-token',
                    user: {
                        id: '00000000-0000-0000-0000-000000000000',
                        email: 'admin@highstation.local',
                        user_metadata: { role: 'admin' }
                    }
                };
                setSession(mockSession);
                setUser(mockSession.user);
                setLoading(false);
                return;
            }

            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) {
                    console.error('[AuthContext] Error checking session:', error);
                }
                setSession(session);
                setUser(session?.user ?? null);
            } catch (err) {
                console.error('[AuthContext] Unexpected error during session init:', err);
            } finally {
                setLoading(false);
            }
        };

        initSession();

        // 2. Listen for changes (Skip if bypassing)
        if (!bypassAuth) {
            const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
                console.log(`[AuthContext] Auth State Change: ${_event}`, session?.user?.email);
                setSession(session);
                setUser(session?.user ?? null);
                setLoading(false);
            });

            return () => {
                subscription.unsubscribe();
            };
        }
    }, []);

    const value = {
        session,
        user,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
