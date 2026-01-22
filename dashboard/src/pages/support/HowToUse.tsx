import GuideLayout from '../../components/GuideLayout';
import CodeBlock from '../../components/CodeBlock';
import { howToUseContent } from '../../content/howto';

export default function HowToUse() {
    const { title, subtitle, sections } = howToUseContent;

    return (
        <GuideLayout title={title} subtitle={subtitle}>
            <div className="space-y-8">
                {sections.map((section, idx) => (
                    <section key={idx} className="scroll-mt-8" id={section.id}>
                        {/* Section Title */}
                        <h2 className="text-xl font-black text-slate-900 mb-4 pb-2 border-b border-slate-200">
                            {section.title}
                        </h2>

                        {/* Section Items */}
                        <div className="space-y-4">
                            {section.items.map((item, itemIdx) => (
                                <div key={itemIdx} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">{item.subtitle && (
                                    <h3 className="text-lg font-bold text-slate-800 mb-3">{item.subtitle}</h3>
                                )}

                                    {item.content && (
                                        <p className="text-slate-600 leading-relaxed mb-4">{item.content}</p>
                                    )}

                                    {item.bullets && (
                                        <ul className="list-disc list-inside space-y-2 text-slate-600">
                                            {item.bullets.map((bullet, bulletIdx) => (
                                                <li key={bulletIdx} className="leading-relaxed">{bullet}</li>
                                            ))}
                                        </ul>
                                    )}

                                    {item.code && (
                                        <div className="mt-4">
                                            <CodeBlock code={item.code} />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                ))}
            </div>
        </GuideLayout>
    );
}
