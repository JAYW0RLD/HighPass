import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RealTimeChart } from './RealTimeChart';
import type { Service, ChartDataPoint } from '../types';
import { API_CONFIG } from '../config';
import clsx from 'clsx';

interface ServiceCardProps {
    service: Service;
    isFlipped: boolean;
    onFlip: () => void;
    onUpdate: (updatedService: Service) => Promise<boolean>;
    onDelete: (service: Service) => void;
    chartData: ChartDataPoint[];
}

export function ServiceCard({
    service,
    isFlipped,
    onFlip,
    onUpdate,
    onDelete,
    chartData
}: ServiceCardProps) {
    const [editForm, setEditForm] = useState<Service>({ ...service });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setEditForm(service);
    }, [service]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const success = await onUpdate(editForm);
            if (success) {
                // Success feedback handled by parent or toast
            }
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="relative aspect-[3/4] group perspective-1000">
            <motion.div
                className="w-full h-full relative preserve-3d"
                initial={false}
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.4, ease: "backOut" }}
                style={{ transformStyle: "preserve-3d" }}
            >
                {/* --- FRONT FACE --- */}
                <div
                    className={clsx(
                        "absolute inset-0 backface-hidden rounded-2xl bg-card border border-border-base overflow-hidden hover:border-accent/50 transition-all shadow-card",
                        isFlipped ? "pointer-events-none" : "pointer-events-auto"
                    )}
                    style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                >
                    {/* Minimal Header */}
                    <div className="absolute top-5 left-5 right-5 z-20 flex justify-between items-start pointer-events-none">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold border ${service.upstream_url.includes('/api/demo')
                            ? 'bg-success/10 border-success/20 text-success'
                            : 'bg-warning/10 border-warning/20 text-warning'
                            }`}>
                            {service.name.substring(0, 1)}
                        </div>
                        <div className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider border ${service.upstream_url.includes('/api/demo')
                            ? 'bg-success/10 border-success/20 text-success'
                            : 'bg-card-hover border-border-subtle text-tertiary'
                            }`}>
                            {service.upstream_url.includes('/api/demo') ? 'ACTIVE' : 'READY'}
                        </div>
                    </div>

                    {/* Chart Visual - Subtle */}
                    <div className="absolute inset-x-0 top-20 bottom-24 z-10 opacity-60">
                        <RealTimeChart
                            data={chartData.slice(0, 30)}
                            height={120}
                            color={service.upstream_url.includes('/api/demo') ? '#10b981' : '#f59e0b'}
                        />
                    </div>

                    {/* Bottom Info & Action */}
                    <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black/80 to-transparent z-20 space-y-4">
                        <div>
                            <h3 className="font-bold text-primary text-lg leading-tight mb-1">
                                {service.name}
                            </h3>
                            <div className="flex items-center gap-2 text-[10px] text-secondary font-mono tracking-tight overflow-hidden truncate">
                                <span className={`w-1.5 h-1.5 rounded-full ${service.upstream_url.includes('/api/demo') ? 'bg-success' : 'bg-warning'} transition-colors shrink-0`} />
                                <span className="truncate opacity-80">
                                    {API_CONFIG.GATEWAY_ROUTE}{service.slug}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-4 border-t border-border-base/50">
                            <div>
                                <div className="text-[9px] text-tertiary uppercase tracking-widest mb-0.5">Price</div>
                                <div className="text-sm font-mono text-primary">{(Number(service.price_wei) / 1e18).toFixed(2)}<span className="text-[10px] text-tertiary ml-1.5">CRO</span></div>
                            </div>
                            <div className="text-right">
                                <div className="text-[9px] text-tertiary uppercase tracking-widest mb-0.5">Grade</div>
                                <div className="text-sm font-bold text-primary">{service.access_requirements?.min_grade || 'F'}</div>
                            </div>
                        </div>

                        <button
                            onClick={(e) => { e.stopPropagation(); onFlip(); }}
                            className="w-full mt-2 py-3 rounded-lg text-xs font-bold uppercase tracking-widest transition-all opacity-0 group-hover:opacity-100 bg-accent text-white shadow-glow hover:bg-accent-hover cursor-pointer pointer-events-auto"
                        >
                            Manage
                        </button>
                    </div>
                </div>

                {/* --- BACK FACE (Form) --- */}
                <div
                    className={clsx(
                        "absolute inset-0 backface-hidden rounded-2xl bg-card border border-border-base overflow-hidden flex flex-col",
                        !isFlipped ? "pointer-events-none" : "pointer-events-auto"
                    )}
                    style={{
                        transform: 'rotateY(180deg)',
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden'
                    }}
                >
                    <div className="relative z-20 flex flex-col h-full p-5">
                        <div className="flex justify-between items-center mb-4 pb-2 border-b border-border-base">
                            <h3 className="text-sm font-bold text-primary">Edit Service</h3>
                            <button
                                onClick={onFlip}
                                className="text-tertiary hover:text-primary transition-colors cursor-pointer"
                                type="button"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col gap-3 flex-1 overflow-y-auto pr-1">
                            <div className="space-y-1">
                                <label className="text-[10px] font-semibold text-tertiary uppercase">Name</label>
                                <input
                                    type="text"
                                    value={editForm.name}
                                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                    className="w-full bg-page border border-border-subtle rounded-md px-2 py-1.5 text-xs text-primary focus:border-accent outline-none"
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-semibold text-tertiary uppercase">Upstream URL</label>
                                <input
                                    type="text"
                                    value={editForm.upstream_url}
                                    onChange={e => setEditForm({ ...editForm, upstream_url: e.target.value })}
                                    className="w-full bg-page border border-border-subtle rounded-md px-2 py-1.5 text-xs text-primary focus:border-accent outline-none font-mono"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-semibold text-tertiary uppercase">Price</label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={(Number(editForm.price_wei) / 1e18).toString()}
                                        onChange={e => setEditForm({ ...editForm, price_wei: (parseFloat(e.target.value || '0') * 1e18).toLocaleString('fullwide', { useGrouping: false }) })}
                                        className="w-full bg-page border border-border-subtle rounded-md px-2 py-1.5 text-xs text-primary focus:border-accent outline-none font-mono"
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-semibold text-tertiary uppercase">Grade</label>
                                    <select
                                        value={editForm.access_requirements?.min_grade || 'F'}
                                        onChange={e => setEditForm({
                                            ...editForm,
                                            access_requirements: {
                                                ...(editForm.access_requirements || {}),
                                                min_grade: e.target.value
                                            }
                                        })}
                                        className="w-full bg-page border border-border-subtle rounded-md px-2 py-1.5 text-xs text-primary focus:border-accent outline-none"
                                    >
                                        <option value="F">F (All)</option>
                                        <option value="C">C (Std)</option>
                                        <option value="A">A (Ver)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="mt-auto pt-4 flex flex-col gap-2">
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="w-full py-2.5 text-xs font-bold rounded-md transition-colors disabled:opacity-50 bg-accent text-white hover:bg-accent-hover"
                                >
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onDelete(service)}
                                    className="w-full py-2 text-xs text-danger font-medium hover:bg-danger/10 rounded-md transition-colors"
                                >
                                    Delete Service
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
