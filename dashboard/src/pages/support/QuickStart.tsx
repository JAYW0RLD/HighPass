import GuideLayout from '../../components/GuideLayout';
import { quickStartContent } from '../../content/quickstart';
import { Link } from 'react-router-dom';
import { ArrowUpRightIcon, CheckIcon } from '../../components/Icons';

export default function QuickStart() {
    const { title, subtitle, steps, nextSteps } = quickStartContent;

    return (
        <GuideLayout title={title} subtitle={subtitle}>
            {/* Timeline Steps */}
            <div className="relative">
                {/* Vertical Line */}
                <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-emerald-500 via-emerald-300 to-slate-200"></div>

                {/* Steps */}
                <div className="space-y-8">
                    {steps.map(step => (
                        <div key={step.number} className="relative pl-14">
                            {/* Step Number Circle */}
                            <div className="absolute left-0 top-0 w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black text-lg shadow-lg shadow-emerald-500/30 ring-4 ring-white z-10">
                                {step.number}
                            </div>

                            {/* Step Content Card */}
                            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                                <h3 className="text-lg font-bold text-slate-900 mb-2">{step.title}</h3>
                                <p className="text-sm text-slate-600 leading-relaxed mb-3">{step.description}</p>

                                {step.bullets && (
                                    <ul className="space-y-2 mb-4">
                                        {step.bullets.map((bullet, idx) => (
                                            <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                                                <CheckIcon className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                                                <span>{bullet}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Completion Badge */}
                <div className="relative pl-14 mt-8">
                    <div className="absolute left-0 top-0 w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 ring-4 ring-white z-10">
                        <CheckIcon className="w-6 h-6 text-white" />
                    </div>
                    <div className="bg-gradient-to-br from-emerald-50 to-white rounded-2xl border-2 border-emerald-200 p-6">
                        <h3 className="text-lg font-black text-emerald-900 mb-2">🎉 You're All Set!</h3>
                        <p className="text-sm text-emerald-700">
                            Your HighStation provider account is ready. Start earning by serving AI agents worldwide.
                        </p>
                    </div>
                </div>
            </div>

            {/* Next Steps */}
            <div className="mt-16 pt-12 border-t border-slate-200">
                <h2 className="text-2xl font-black text-slate-900 mb-6">Next Steps</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {nextSteps.map((item, idx) => (
                        <Link
                            key={idx}
                            to={item.link}
                            className="bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl p-6 transition-all group"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <h3 className="text-sm font-bold text-slate-800 group-hover:text-emerald-600 transition-colors">
                                    {item.title}
                                </h3>
                                <ArrowUpRightIcon className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                            </div>
                            <p className="text-xs text-slate-600">{item.description}</p>
                        </Link>
                    ))}
                </div>
            </div>
        </GuideLayout>
    );
}
