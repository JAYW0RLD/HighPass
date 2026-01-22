import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../utils/apiClient';
import { useAuth } from '../contexts/AuthContext';

interface HeaderProps {
    title?: string;
}

export default function Header({ title = 'HighStation' }: HeaderProps) {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [balance, setBalance] = useState<string>('0.00');
    const [networkStatus] = useState<'connected' | 'disconnected'>('connected');

    useEffect(() => {
        // [RESTORED] Mock Balance & Network (Future: Real Web3 Integration)
        setBalance('1,240.50');
    }, []);

    useEffect(() => {
        // Listen for auth changes
        const { data: authListener } = supabase.auth.onAuthStateChange((event: string) => {
            if (event === 'SIGNED_OUT') {
                navigate('/auth');
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, [navigate]);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        navigate('/auth');
    };

    return (
        <motion.header
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between px-8 py-4 border-b border-border-base bg-page/80 backdrop-blur-xl sticky top-0 z-50 transition-all duration-300"
        >
            {/* Logo Section */}
            <div className="flex items-center gap-4 group cursor-pointer" onClick={() => navigate('/')}>
                <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shadow-glow group-hover:scale-105 transition-all duration-300">
                    <span className="text-white font-black text-sm tracking-tighter">HS</span>
                </div>
                <div className="flex flex-col">
                    <h1 className="text-sm font-bold text-primary tracking-widest uppercase group-hover:text-accent transition-colors">{title}</h1>
                    <span className="text-[10px] text-tertiary font-mono tracking-wider">ENTERPRISE GATEWAY</span>
                </div>
            </div>

            {/* Right Section: Status & User */}
            <div className="flex items-center gap-6">

                {/* Network Status Pill */}
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border-base backdrop-blur-sm">
                    <div className={`w-2 h-2 rounded-full ${networkStatus === 'connected' ? 'bg-success animate-pulse' : 'bg-danger'}`} />
                    <span className="text-xs text-secondary font-medium">Cronos Testnet</span>
                </div>

                {/* Balance Display (Mock) */}
                <div className="hidden md:flex flex-col items-end mr-2">
                    <span className="text-[10px] text-tertiary font-medium uppercase tracking-wider">Balance</span>
                    <span className="text-sm text-primary font-bold font-mono">{balance} <span className="text-accent">CRO</span></span>
                </div>

                <div className="h-8 w-px bg-border-base hidden md:block" />

                {/* User Profile & Logout */}
                {user?.email ? (
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3 pl-2 pr-4 py-1.5 rounded-full bg-card border border-border-base hover:bg-card-hover transition-colors cursor-pointer group">
                            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-xs font-bold text-white shadow-glow group-hover:scale-110 transition-transform">
                                {user.email[0].toUpperCase()}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs text-primary font-medium group-hover:text-accent transition-colors">
                                    {user.email.split('@')[0]}
                                </span>
                                <span className="text-[10px] text-tertiary">Administrator</span>
                            </div>
                        </div>

                        <button
                            onClick={handleSignOut}
                            className="p-2 rounded-full hover:bg-danger/10 hover:text-danger text-tertiary transition-all duration-200"
                            title="Sign Out"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => navigate('/auth')}
                        className="px-6 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-bold shadow-glow transition-all hover:-translate-y-0.5"
                    >
                        Connect Wallet
                    </button>
                )}
            </div>
        </motion.header>
    );
}
