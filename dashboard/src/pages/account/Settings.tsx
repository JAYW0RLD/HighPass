import { useState, useEffect } from 'react';
import { authenticatedFetch } from '../../utils/apiClient';
import { UserIcon, MailIcon, GithubIcon, ShieldCheckIcon, CreditCardIcon, ActivityIcon } from '../../components/Icons';
import { useSettings } from '../../contexts/SettingsContext';
import { useAuth } from '../../contexts/AuthContext';

export default function Settings() {
    const { showDemoData, setShowDemoData } = useSettings();
    const { user } = useAuth();
    const [profileData, setProfileData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUserProfile = async () => {
            if (user) {
                // Fetch extra profile info (settlement address)
                const res = await authenticatedFetch('/api/provider/stats');
                let settlementAddr = 'Assigning...';
                if (res.ok) {
                    const stats = await res.json();
                    settlementAddr = stats.settlementAddress;
                }

                setProfileData({
                    name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Provider',
                    email: user.email,
                    githubId: user.user_metadata?.user_name || 'Not linked',
                    avatarUrl: user.user_metadata?.avatar_url,
                    settlementAddress: settlementAddr
                });
            }
            setLoading(false);
        };
        fetchUserProfile();
    }, [user]);

    if (loading) return <div className="animate-pulse flex space-y-4 flex-col">
        <div className="h-4 bg-slate-200 rounded w-1/4"></div>
        <div className="h-32 bg-slate-200 rounded w-full"></div>
    </div>;

    return (
        <div className="max-w-4xl space-y-8 animate-fade-in">
            <header>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Account Settings</h1>
                <p className="text-slate-500">Manage your profile and platform preferences.</p>
            </header>

            {/* Profile Section */}
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <UserIcon className="w-5 h-5 text-emerald-500" />
                        Profile Information
                    </h2>
                </div>
                <div className="p-8 flex items-start gap-8">
                    <div className="w-24 h-24 rounded-full bg-slate-100 border-4 border-white shadow-md overflow-hidden shrink-0">
                        <img src={profileData?.avatarUrl || 'https://i.pravatar.cc/150'} alt="Avatar" className="w-full h-full object-cover" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Display Name</label>
                            <div className="flex items-center gap-2 text-slate-800 font-medium">
                                <UserIcon className="w-4 h-4 text-slate-400" />
                                {profileData?.name}
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Email Address</label>
                            <div className="flex items-center gap-2 text-slate-800 font-medium font-mono text-sm">
                                <MailIcon className="w-4 h-4 text-slate-400" />
                                {profileData?.email}
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">GitHub ID</label>
                            <div className="flex items-center gap-2 text-slate-800 font-medium">
                                <GithubIcon className="w-4 h-4 text-slate-400" />
                                {profileData?.githubId}
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Role</label>
                            <div className="flex items-center gap-2 text-slate-800 font-medium">
                                <ShieldCheckIcon className="w-4 h-4 text-emerald-500" />
                                API Provider
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Wallet Section (Managed Sub-Wallet Placeholder) */}
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <CreditCardIcon className="w-5 h-5 text-emerald-500" />
                        Automated Settlement Wallet
                    </h2>
                </div>
                <div className="p-8">
                    <div className="flex flex-col items-center justify-center p-8 bg-slate-50 border border-slate-100 border-dashed rounded-xl">
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 border border-slate-100">
                            <CreditCardIcon className="w-6 h-6 text-emerald-500" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-700 mb-1">Managed Settlement Wallet</h3>
                        <p className="text-lg font-mono font-bold text-slate-900 mb-2">
                            {profileData?.settlementAddress || 'Assigning...'}
                        </p>
                        <p className="text-xs text-slate-400 text-center max-w-[400px]">
                            This is your dedicated on-chain address. All revenue from your services flows directly into this wallet.
                        </p>
                    </div>
                    <p className="text-xs text-slate-400 mt-6 leading-relaxed">
                        <b>How it works:</b> HighStation assigns a dedicated on-chain address for your services. You can withdraw your earnings to any destination address without needing to connect a wallet for every transaction.
                    </p>
                </div>
            </section>

            {/* Platform Preferences Section */}
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <ActivityIcon className="w-5 h-5 text-emerald-500" />
                        Platform Preferences
                    </h2>
                </div>
                <div className="p-8">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div>
                            <h3 className="text-sm font-bold text-slate-700 mb-1">Show Demo Data</h3>
                            <p className="text-xs text-slate-400">
                                Display simulation data and mock graphs for demonstration purposes.
                            </p>
                        </div>
                        <button
                            onClick={() => setShowDemoData(!showDemoData)}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${showDemoData ? 'bg-emerald-500' : 'bg-slate-200'
                                }`}
                        >
                            <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${showDemoData ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                            />
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}
