import type { ReactNode } from 'react';

interface GuideLayoutProps {
    title: string;
    subtitle?: string;
    children: ReactNode;
}

export default function GuideLayout({ title, subtitle, children }: GuideLayoutProps) {
    return (
        <div className="max-w-6xl mx-auto pb-12 animate-fade-in">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">{title}</h1>
                {subtitle && (
                    <p className="text-base text-slate-500 leading-relaxed">{subtitle}</p>
                )}
            </div>

            {/* Content */}
            <div className="space-y-6 prose prose-slate max-w-none">
                {children}
            </div>
        </div>
    );
}
