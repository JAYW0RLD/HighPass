import React, { useState } from 'react';
import { DashboardCard } from '../DashboardCard';
import type { Service } from '../../types';

interface RegisterServiceFormProps {
    onCreate: (service: Omit<Service, 'id'>) => Promise<boolean>;
    onDeployDemo: () => Promise<boolean>;
}

export const RegisterServiceForm: React.FC<RegisterServiceFormProps> = ({ onCreate, onDeployDemo }) => {
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [upstreamUrl, setUpstreamUrl] = useState('');
    const [priceWei, setPriceWei] = useState('100000000000000000'); // 0.1 CRO default
    const [minGrade, setMinGrade] = useState('F');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        const success = await onCreate({
            name,
            slug,
            upstream_url: upstreamUrl,
            price_wei: priceWei,
            access_requirements: {
                min_grade: minGrade,
                requires_openseal: false,
                requires_zk_proof: false
            },
            status: 'pending',
            provider_id: '' // Managed by backend
        } as any);

        if (success) {
            setName('');
            setSlug('');
            setUpstreamUrl('');
        }
        setIsSubmitting(false);
    };

    return (
        <DashboardCard
            title="Terminal Deployment"
            subtitle="Register a new API node to the Gatekeeper grid"
        >
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Node Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. DeepSeek-Llama-70B"
                        className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-emerald-500/50 transition-all font-bold"
                        required
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">System Slug</label>
                    <input
                        type="text"
                        value={slug}
                        onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                        placeholder="e.g. deepseek-llama-v1"
                        className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-emerald-500/50 transition-all font-mono"
                        required
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Upstream Endpoint</label>
                    <input
                        type="url"
                        value={upstreamUrl}
                        onChange={(e) => setUpstreamUrl(e.target.value)}
                        placeholder="https://your-api.com"
                        className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-emerald-500/50 transition-all"
                        required
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Price (Cro/Req)</label>
                        <input
                            type="text"
                            value={(Number(priceWei) / 1e18).toString()}
                            onChange={(e) => setPriceWei((Number(e.target.value) * 1e18).toString())}
                            className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-emerald-500/50 transition-all font-mono"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Min. Reputation</label>
                        <select
                            value={minGrade}
                            onChange={(e) => setMinGrade(e.target.value)}
                            className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-emerald-500/50 transition-all appearance-none"
                        >
                            <option value="A">Grade A+</option>
                            <option value="B">Grade B</option>
                            <option value="C">Grade C</option>
                            <option value="D">Grade D</option>
                            <option value="F">No Limit</option>
                        </select>
                    </div>
                </div>

                <div className="pt-4 space-y-3">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-4 bg-white text-black rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-emerald-400 hover:text-black transition-all disabled:opacity-50"
                    >
                        {isSubmitting ? 'Deploying...' : 'Initialize Node'}
                    </button>
                    <button
                        type="button"
                        onClick={() => onDeployDemo()}
                        className="w-full py-4 bg-transparent border border-white/5 text-zinc-500 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] hover:bg-white/5 transition-all"
                    >
                        Launch Infrastructure Demo
                    </button>
                </div>
            </form>
        </DashboardCard>
    );
};
