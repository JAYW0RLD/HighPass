import { Link } from 'react-router-dom';
import {
    ZapIcon,
    FileTextIcon,
    LockIcon,
    InfoIcon,
    GithubIcon,
    HelpCircleIcon,
    ArrowUpRightIcon
} from '../../components/Icons';

export default function Support() {
    const guideLinks = [
        {
            title: "Quick Start",
            description: "Get up and running in 5 minutes with our step-by-step guide.",
            icon: ZapIcon,
            to: "/guide/quickstart",
            color: "text-amber-500",
            bg: "bg-amber-50"
        },
        {
            title: "How to Use",
            description: "Learn about OpenSeal, Trust Scores, and revenue withdrawals.",
            icon: FileTextIcon,
            to: "/guide/howto",
            color: "text-blue-500",
            bg: "bg-blue-50"
        },
        {
            title: "Security Specs",
            description: "Deep dive into HighStation's 3-layer security mechanism.",
            icon: LockIcon,
            to: "/guide/security",
            color: "text-emerald-500",
            bg: "bg-emerald-50"
        },
        {
            title: "Service Info",
            description: "Platform vision, fee policies, and supported networks.",
            icon: InfoIcon,
            to: "/guide/info",
            color: "text-purple-500",
            bg: "bg-purple-50"
        }
    ];

    return (
        <div className="max-w-5xl space-y-12 animate-fade-in">
            <header className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 mb-2">
                    <HelpCircleIcon className="w-8 h-8" />
                </div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">Help & Support Hub</h1>
                <p className="text-lg text-slate-500 max-w-2xl mx-auto">
                    Everything you need to know about providing reliable and verifiable AI infrastructure on HighStation.
                </p>
            </header>

            {/* Guide Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {guideLinks.map((guide, idx) => (
                    <Link
                        key={idx}
                        to={guide.to}
                        className="group bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-emerald-300 transition-all flex flex-col items-start gap-4"
                    >
                        <div className={`p-3 rounded-xl \${guide.bg} \${guide.color} group-hover:scale-110 transition-transform`}>
                            <guide.icon className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 mb-2 group-hover:text-emerald-600 transition-colors">{guide.title}</h3>
                            <p className="text-slate-500 leading-relaxed text-sm">{guide.description}</p>
                        </div>
                        <div className="mt-2 flex items-center gap-1 text-xs font-bold text-emerald-600 opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-10px] group-hover:translate-x-0">
                            Read Guide <ArrowUpRightIcon className="w-4 h-4" />
                        </div>
                    </Link>
                ))}
            </div>

            {/* External Links */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-slate-200">
                <a
                    href="https://github.com/highstation"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-6 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors group"
                >
                    <div className="flex items-center gap-3">
                        <GithubIcon className="w-5 h-5" />
                        <span className="font-bold text-sm">GitHub Repo</span>
                    </div>
                    <ArrowUpRightIcon className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                </a>

                <a
                    href="https://discord.gg/highstation"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-6 bg-[#5865F2] text-white rounded-xl hover:opacity-90 transition-opacity group"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-5 h-5 flex items-center justify-center font-bold text-[10px]">D</div>
                        <span className="font-bold text-sm">Join Discord</span>
                    </div>
                    <ArrowUpRightIcon className="w-4 h-4 text-white/50 group-hover:text-white transition-colors" />
                </a>

                <div className="flex items-center justify-between p-6 bg-white border border-slate-200 rounded-xl">
                    <div className="flex items-center gap-3">
                        <div className="w-5 h-5 flex items-center justify-center font-bold text-slate-400">@</div>
                        <span className="font-bold text-sm text-slate-700">support@highstation.net</span>
                    </div>
                </div>
            </div>

            <footer className="text-center pt-8">
                <p className="text-xs text-slate-400">
                    HighStation Documentation v1.0.0 • Last updated {new Date().toLocaleDateString('en-GB')}
                </p>
            </footer>
        </div>
    );
}
