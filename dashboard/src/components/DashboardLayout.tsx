import { useState, useEffect } from 'react';
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../utils/apiClient';
import { useAuth } from '../contexts/AuthContext';
import {
    ActivityIcon,
    SettingsIcon,
    HomeIcon,
    FileTextIcon,
    BoxIcon,
    HelpCircleIcon,
    SearchIcon,
    CalendarIcon,
    ChevronRightIcon,
    LogOutIcon,
    ZapIcon,
    LockIcon,
    InfoIcon,
    TerminalIcon
} from './Icons';

// --- Types ---
type SidebarItemType = {
    label: string;
    icon: any;
    to: string;
    badge?: string;
    expanded?: boolean;
};

// --- Components ---

const SidebarItem = ({ item, active, collapsed }: { item: SidebarItemType; active: boolean; collapsed: boolean }) => (
    <Link
        to={item.to}
        className={`flex items-center ${collapsed ? 'justify-center px-2' : 'justify-between px-3'} py-2 rounded-lg text-sm font-medium transition-all mb-0.5 group ${active
            ? 'bg-slate-100 text-slate-900 border-l-[3px] border-emerald-500 rounded-l-sm'
            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
        title={collapsed ? item.label : undefined}
    >
        <div className="flex items-center gap-3">
            <item.icon className={`w-4 h-4 shrink-0 ${active ? 'text-slate-900' : 'text-slate-400 group-hover:text-slate-600'}`} />
            {!collapsed && <span>{item.label}</span>}
        </div>
        {!collapsed && (
            <div className="flex items-center gap-2">
                {item.badge && (
                    <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
                        {item.badge}
                    </span>
                )}
                {item.expanded && (
                    <ChevronRightIcon className="w-3 h-3 text-slate-400 rotate-90" />
                )}
            </div>
        )}
    </Link>
);

const SidebarSection = ({ title, items, activePath, collapsed }: { title?: string, items: SidebarItemType[], activePath: string, collapsed: boolean }) => (
    <div className="mb-6">
        {title && !collapsed && (
            <h3 className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 animate-fade-in">
                {title}
            </h3>
        )}
        {title && collapsed && (
            <div className="h-px bg-slate-100 w-8 mx-auto mb-3" />
        )}
        <nav className="space-y-0.5">
            {items.map((item) => (
                <SidebarItem key={item.label} item={item} active={activePath === item.to || (item.to !== '#' && activePath.startsWith(item.to))} collapsed={collapsed} />
            ))}
        </nav>
    </div>
);


const Sidebar = ({ collapsed, setCollapsed }: { collapsed: boolean, setCollapsed: (v: boolean) => void }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const path = location.pathname;
    const { user } = useAuth();
    const [userProfile, setUserProfile] = useState<any>(null);

    useEffect(() => {
        if (user) {
            setUserProfile({
                name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Provider',
                email: user.email,
                avatarUrl: user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${user.email}&background=random`
            });
        }
    }, [user]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    const generalItems: SidebarItemType[] = [
        { label: 'Dashboard', icon: HomeIcon, to: '/account' },
        { label: 'API Services', icon: ZapIcon, to: '/services', badge: 'NEW' },
        { label: 'Transaction Logs', icon: ActivityIcon, to: '/transactions' },
    ];

    const labItems: SidebarItemType[] = [
        { label: 'Agent Playground', icon: TerminalIcon, to: '/playground', badge: 'LAB' },
    ];

    const supportItems: SidebarItemType[] = [
        { label: 'Quick Start', icon: ZapIcon, to: '/guide/quickstart' },
        { label: 'How to Use', icon: FileTextIcon, to: '/guide/howto' },
        { label: 'Security Specs', icon: LockIcon, to: '/guide/security' },
        { label: 'Service Info', icon: InfoIcon, to: '/guide/info' },
    ];

    return (
        <aside
            className={`fixed top-0 left-0 bottom-0 bg-white border-r border-slate-200 flex flex-col z-50 font-sans transition-all duration-300 ease-in-out ${collapsed ? 'w-20' : 'w-64'}`}
        >
            {/* Logo */}
            <div className={`h-16 flex items-center ${collapsed ? 'justify-center' : 'px-6'}`}>
                <Link to="/" className="flex items-center gap-2 overflow-hidden">
                    <div className="w-6 h-6 bg-slate-900 rounded-md flex items-center justify-center text-white font-black text-xs shrink-0">S</div>
                    {!collapsed && <span className="font-bold text-slate-800 text-lg tracking-tight whitespace-nowrap">Sequence</span>}
                </Link>
                {!collapsed && (
                    <div className="ml-auto">
                        <button onClick={() => setCollapsed(true)} className="p-1 text-slate-400 hover:text-slate-600 border border-slate-200 rounded">
                            <ChevronRightIcon className="w-3 h-3 rotate-180" />
                        </button>
                    </div>
                )}
            </div>

            {collapsed && (
                <div className="flex justify-center py-2">
                    <button onClick={() => setCollapsed(false)} className="p-1 text-slate-400 hover:text-slate-600 border border-slate-200 rounded bg-slate-50">
                        <ChevronRightIcon className="w-3 h-3" />
                    </button>
                </div>
            )}

            {/* Scrollable Nav Area */}
            <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-hide w-full">
                <SidebarSection title="General" items={generalItems} activePath={path} collapsed={collapsed} />
                <SidebarSection title="Playground" items={labItems} activePath={path} collapsed={collapsed} />
                <SidebarSection title="Support" items={supportItems} activePath={path} collapsed={collapsed} />
            </div>

            {/* Bottom Actions */}
            <div className={`px-4 pb-4 space-y-4 ${collapsed ? 'flex flex-col items-center' : ''}`}>
                <div className="space-y-1 w-full">
                    <Link to="/settings" className={`flex items-center \${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2 text-slate-500 hover:text-slate-900 text-sm font-medium rounded-lg hover:bg-slate-50`} title={collapsed ? "Settings" : undefined}>
                        <SettingsIcon className="w-4 h-4 shrink-0" />
                        {!collapsed && <span>Settings</span>}
                    </Link>
                    <Link to="/help" className={`flex items-center \${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2 text-slate-500 hover:text-slate-900 text-sm font-medium rounded-lg hover:bg-slate-50`} title={collapsed ? "Help & Support" : undefined}>
                        <HelpCircleIcon className="w-4 h-4 shrink-0" />
                        {!collapsed && <span>Help & Support</span>}
                    </Link>
                </div>


                {/* User Profile */}
                <div className={`pt-3 border-t border-slate-100 w-full ${collapsed ? 'border-none pt-0' : ''}`}>
                    {collapsed ? (
                        <div className="flex justify-center cursor-pointer" title={userProfile?.name}>
                            <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden shrink-0">
                                <img src={userProfile?.avatarUrl || 'https://i.pravatar.cc/150'} alt="User" className="w-full h-full object-cover" />
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 px-2 py-2 rounded-xl border border-slate-100 shadow-sm bg-white cursor-pointer hover:border-slate-200 transition-colors">
                            <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden shrink-0">
                                <img src={userProfile?.avatarUrl || 'https://i.pravatar.cc/150'} alt="User" className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-xs font-bold text-slate-900 truncate">{userProfile?.name || 'Loading...'}</div>
                                <div className="text-[10px] text-slate-500 truncate">{userProfile?.email}</div>
                            </div>
                            <button onClick={handleLogout} className="text-slate-400 hover:text-red-500">
                                <LogOutIcon className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
};

const TopBar = ({ collapsed }: { collapsed: boolean }) => {
    return (
        <header className={`h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 fixed top-0 right-0 z-40 transition-all duration-300 ${collapsed ? 'left-20' : 'left-64'}`}>
            {/* Search */}
            <div className="flex items-center gap-3 w-96 group">
                <SearchIcon className="w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                <div className="flex-1 relative">
                    <input
                        type="text"
                        placeholder="Search services..."
                        className="w-full bg-transparent border-none focus:ring-0 text-sm text-slate-700 placeholder-slate-400 p-0"
                    />
                </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-sm cursor-pointer hover:bg-slate-50 transition-colors">
                    <CalendarIcon className="w-4 h-4 text-slate-500" />
                    <span className="text-xs font-bold text-slate-700">{new Date().toLocaleDateString('en-GB')}</span>
                </div>

                <div className="w-px h-6 bg-slate-200 mx-2"></div>

                <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                    <BoxIcon className="w-5 h-5" />
                </button>
            </div>
        </header>
    );
};

export const DashboardLayout = () => {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <div className="min-h-screen bg-slate-50 font-sans selection:bg-emerald-100 selection:text-emerald-900">
            <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
            <div className={`transition-all duration-300 ${collapsed ? 'pl-20' : 'pl-64'}`}>
                <TopBar collapsed={collapsed} />
                {/* Main Content Area */}
                <main className="pt-16 min-h-screen">
                    <div className="p-8 max-w-[1600px] mx-auto w-full animate-fade-in">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};
