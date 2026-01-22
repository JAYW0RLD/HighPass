import GuideLayout from '../../components/GuideLayout';
import CodeBlock from '../../components/CodeBlock';
import { securityContent } from '../../content/security';

export default function SecuritySpecs() {
    const { title, subtitle, layers, additional } = securityContent;

    return (
        <GuideLayout title={title} subtitle={subtitle}>
            {/* Security Layers */}
            <div className="space-y-6">
                {layers.map((layer, idx) => (
                    <div key={idx} className="bg-gradient-to-br from-white to-slate-50 rounded-xl border border-slate-200 p-6 shadow-sm">
                        {/* Layer Header */}
                        <div className="flex items-center gap-3 mb-4">
                            <span className="text-2xl">{layer.icon}</span>
                            <div>
                                <h2 className="text-lg font-black text-slate-900">{layer.title}</h2>
                                <p className="text-xs text-slate-600 mt-1">{layer.description}</p>
                            </div>
                        </div>

                        {/* Layer Details */}
                        <div className="space-y-6">
                            {layer.details.map((detail: any, detailIdx: number) => (
                                <div key={detailIdx} className="bg-white rounded-xl border border-slate-100 p-6">
                                    {detail.subtitle && (
                                        <h3 className="text-base font-bold text-slate-800 mb-3">{detail.subtitle}</h3>
                                    )}

                                    {detail.content && (
                                        <div className={`p-4 rounded-lg ${detail.alert === 'warning'
                                            ? 'bg-yellow-50 border border-yellow-200'
                                            : 'bg-slate-50'
                                            }`}>
                                            <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                                                {detail.content}
                                            </p>
                                        </div>
                                    )}

                                    {detail.bullets && (
                                        <ul className="list-disc list-inside space-y-2 text-slate-600">
                                            {detail.bullets.map((bullet: string, bulletIdx: number) => (
                                                <li key={bulletIdx} className="leading-relaxed">{bullet}</li>
                                            ))}
                                        </ul>
                                    )}

                                    {detail.code && (
                                        <div className="mt-4">
                                            <CodeBlock code={detail.code} />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Additional Security */}
            <div className="mt-12 pt-12 border-t border-slate-200">
                <h2 className="text-2xl font-black text-slate-900 mb-6">{additional.title}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {additional.items.map((item, idx) => (
                        <div key={idx} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                            <h3 className="text-lg font-bold text-slate-800 mb-2">{item.title}</h3>
                            <p className="text-sm text-slate-600 mb-4">{item.description}</p>
                            <ul className="list-disc list-inside space-y-1.5 text-sm text-slate-600">
                                {item.bullets.map((bullet, bulletIdx) => (
                                    <li key={bulletIdx}>{bullet}</li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>
        </GuideLayout>
    );
}
