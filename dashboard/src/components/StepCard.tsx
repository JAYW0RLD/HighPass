import type { ReactNode } from 'react';

interface StepCardProps {
    number: number;
    title: string;
    children: ReactNode;
}

export default function StepCard({ number, title, children }: StepCardProps) {
    return (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:border-emerald-300 transition-colors">
            <div className="flex items-start gap-4">
                {/* Step Number Badge */}
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-black text-lg shadow-lg shadow-emerald-500/20">
                    {number}
                </div>

                {/* Content */}
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-800 mb-3">{title}</h3>
                    <div className="text-slate-600 leading-relaxed space-y-3">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
