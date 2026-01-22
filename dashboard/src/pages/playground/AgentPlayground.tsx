import XTerminal from '../../components/XTerminal';
import { ZapIcon, LinkIcon, ActivityIcon } from '../../components/Icons';

export default function AgentPlayground() {
    const agentRepoUrl = "https://github.com/Gnomone/easy-ai-agent";
    const faucetUrl = "https://faucet.cronos.org/";

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Agent Lab</h1>
                    <p className="text-slate-500 mt-1">Real terminal connected to Easy AI Agent CLI</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Sidebar */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
                        <h3 className="text-sm font-bold text-emerald-900 flex items-center gap-2 mb-4">
                            <ZapIcon className="w-4 h-4" />
                            Session Active
                        </h3>
                        <div className="space-y-3 text-[11px] text-emerald-800 leading-relaxed">
                            <div className="bg-white/60 p-3 rounded-lg border border-emerald-200">
                                <div className="font-bold mb-1">🚀 Automated Startup</div>
                                <div className="text-[10px] text-emerald-700">
                                    The HighStation Agent launches automatically upon connection.
                                </div>
                            </div>
                            <div className="bg-white/60 p-3 rounded-lg border border-emerald-200">
                                <div className="font-bold mb-1">💳 Demo Wallet Pre-funded</div>
                                <div className="text-[10px] text-emerald-700">
                                    A persistent identity has been assigned for seamless payments.
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                        <LinkIcon className="absolute -right-4 -bottom-4 w-20 h-20 text-slate-300/20" />
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
                            <ActivityIcon className="w-4 h-4" />
                            Resources
                        </h3>
                        <div className="space-y-2">
                            <a
                                href={faucetUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-full p-2 bg-white border border-slate-300 rounded-xl text-[10px] font-black text-slate-700 hover:bg-slate-100 transition-all text-center"
                            >
                                💰 CRONOS FAUCET
                            </a>
                            <a
                                href={agentRepoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-full p-2 bg-white border border-slate-300 rounded-xl text-[10px] font-black text-slate-700 hover:bg-slate-100 transition-all text-center"
                            >
                                🐙 AGENT GITHUB
                            </a>
                        </div>
                    </div>

                    <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                        <h3 className="text-sm font-bold text-blue-900 mb-2">💡 About This Terminal</h3>
                        <p className="text-[11px] text-blue-800 leading-relaxed mb-3">
                            This is a <strong>sandboxed environment</strong> running in an isolated Docker container.
                            Only the easy-ai-agent is accessible for security.
                        </p>
                        <div className="bg-blue-100/50 p-3 rounded-lg border border-blue-200">
                            <div className="text-[10px] font-bold text-blue-900 mb-1">Want to run locally?</div>
                            <div className="text-[10px] text-blue-700">
                                Clone the agent from GitHub and run it on your own machine with full control!
                            </div>
                        </div>
                    </div>
                </div>

                {/* Terminal */}
                <div className="lg:col-span-3 flex flex-col h-[650px] bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden relative">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 z-20" />

                    <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                        <div className="flex gap-2 items-center">
                            <div className="flex gap-1.5 mr-4">
                                <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                                <div className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/50" />
                                <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/50" />
                            </div>
                            <div className="h-4 w-px bg-slate-800" />
                            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 px-2 py-0.5 bg-slate-950 rounded border border-slate-800 uppercase tracking-tighter">
                                HighStation Agent Terminal
                            </div>
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest hidden md:block">
                            PTY Session • Live
                        </div>
                    </div>

                    <XTerminal className="flex-1" />
                </div>
            </div>
        </div>
    );
}
