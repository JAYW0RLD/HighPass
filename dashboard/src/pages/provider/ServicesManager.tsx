import { useNavigate } from 'react-router-dom';
import { useServices } from '../../hooks/useServices';
import {
    GlobeIcon,
    PlusIcon,
    ZapIcon,
    ArrowUpRightIcon
} from '../../components/Icons';

export default function ServicesManager() {
    const navigate = useNavigate();
    const { services } = useServices();

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <ZapIcon className="w-6 h-6 text-emerald-500" />
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">My API Services</h1>
                    </div>
                    <p className="text-slate-500 font-medium">Manage your deployed endpoints and monitor their status.</p>
                </div>
                <button
                    onClick={() => navigate('/services/new')}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-sm font-black uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
                >
                    <PlusIcon className="w-4 h-4" />
                    Provision New Service
                </button>
            </div>

            {/* Services List */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50/50 text-[10px] font-bold text-slate-400 border-b border-slate-100 uppercase tracking-wider">
                            <th className="py-4 pl-8">Service Name</th>
                            <th className="py-4">Type</th>
                            <th className="py-4">Status</th>
                            <th className="py-4">External Endpoint</th>
                            <th className="py-4 pr-8 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {services.length === 0 && (
                            <tr>
                                <td colSpan={5} className="py-16 text-center">
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                                            <GlobeIcon className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <p className="text-slate-900 font-bold mb-1">No active services found</p>
                                            <p className="text-slate-500 text-sm max-w-sm">
                                                You haven't deployed any API services yet.
                                                Provision your first endpoint to start earning.
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => navigate('/services/new')}
                                            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors"
                                        >
                                            Create Service
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )}
                        {services.map((service, idx) => (
                            <tr key={service.id || idx} className="group hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => navigate(`/services/${service.id}`)}>
                                <td className="py-5 pl-8">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500 font-bold border border-emerald-100 shadow-sm group-hover:scale-105 transition-transform">
                                            <GlobeIcon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-slate-800">{service.name}</div>
                                            <div className="text-[10px] text-slate-400 font-medium">ID: {service.id?.substring(0, 8)}...</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="py-5">
                                    <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-md text-[10px] font-bold text-slate-600 uppercase tracking-wide">
                                        REST API
                                    </span>
                                </td>
                                <td className="py-5">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-emerald-100 text-emerald-700`}>
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                        Running
                                    </span>
                                </td>
                                <td className="py-5">
                                    <div className="text-xs font-bold text-slate-500 font-mono flex items-center gap-2 group-hover:text-emerald-600 transition-colors">
                                        https://highstation.net/{service.slug}
                                    </div>
                                </td>
                                <td className="py-5 pr-8 text-right">
                                    <button className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all">
                                        <ArrowUpRightIcon className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Quick Stats or Tips Footer */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Total Deployed</h3>
                    <p className="text-2xl font-black text-slate-900">{services.length}</p>
                </div>
                {/* Can add more if needed */}
            </div>
        </div>
    );
}
