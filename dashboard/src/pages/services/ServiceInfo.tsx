import GuideLayout from '../../components/GuideLayout';
import { serviceInfoContent } from '../../content/serviceinfo';

export default function ServiceInfo() {
    const { title, subtitle, vision, fees, networks, techStack, api, roadmap, support, license } = serviceInfoContent;

    return (
        <GuideLayout title={title} subtitle={subtitle}>
            {/* Vision */}
            <section className="bg-gradient-to-br from-emerald-50 to-white rounded-2xl border border-emerald-200 p-8 shadow-sm">
                <h2 className="text-2xl font-black text-slate-900 mb-3">{vision.title}</h2>
                <p className="text-lg text-emerald-700 font-medium mb-6">{vision.tagline}</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {vision.values.map((value, idx) => (
                        <div key={idx} className="bg-white rounded-xl border border-emerald-100 p-4 text-center">
                            <div className="text-3xl mb-2">{value.icon}</div>
                            <h3 className="text-sm font-bold text-slate-800 mb-1">{value.title}</h3>
                            <p className="text-xs text-slate-600">{value.description}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Fees */}
            <section className="mt-12">
                <h2 className="text-2xl font-black text-slate-900 mb-6">{fees.title}</h2>
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="text-left py-3 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider">항목</th>
                                <th className="text-left py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider">요금</th>
                                <th className="text-left py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider">비고</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {fees.table.map((row, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                    <td className="py-4 px-6 text-sm font-medium text-slate-800">{row.item}</td>
                                    <td className="py-4 px-4 text-sm font-bold text-emerald-600">{row.fee}</td>
                                    <td className="py-4 px-4 text-sm text-slate-600">{row.note}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Networks */}
            <section className="mt-12">
                <h2 className="text-2xl font-black text-slate-900 mb-6">{networks.title}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Mainnet */}
                    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Mainnet</h3>
                        <ul className="space-y-2 text-sm">
                            <li><span className="font-bold text-slate-600">Network:</span> {networks.mainnet.name}</li>
                            <li><span className="font-bold text-slate-600">Chain ID:</span> {networks.mainnet.chainId}</li>
                            <li><span className="font-bold text-slate-600">RPC:</span> <code className="bg-slate-100 px-2 py-0.5 rounded">{networks.mainnet.rpc}</code></li>
                            <li>
                                <span className="font-bold text-slate-600">Explorer:</span>{' '}
                                <a href={networks.mainnet.explorer} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">
                                    Cronoscan
                                </a>
                            </li>
                        </ul>
                    </div>

                    {/* Testnet */}
                    <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Testnet</h3>
                        <ul className="space-y-2 text-sm">
                            <li><span className="font-bold text-slate-600">Network:</span> {networks.testnet.name}</li>
                            <li><span className="font-bold text-slate-600">Chain ID:</span> {networks.testnet.chainId}</li>
                            <li><span className="font-bold text-slate-600">RPC:</span> <code className="bg-white px-2 py-0.5 rounded border border-slate-200">{networks.testnet.rpc}</code></li>
                            <li>
                                <span className="font-bold text-slate-600">Faucet:</span>{' '}
                                <a href={networks.testnet.faucet} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">
                                    Get Test CRO
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>
            </section>

            {/* Tech Stack */}
            <section className="mt-12">
                <h2 className="text-2xl font-black text-slate-900 mb-6">{techStack.title}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {techStack.categories.map((cat: any, idx: number) => (
                        <div key={idx} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-emerald-200 transition-colors">
                            <h3 className="text-sm font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2">
                                {cat.name}
                            </h3>
                            <ul className="space-y-1.5">
                                {cat.items.map((item: string, itemIdx: number) => (
                                    <li key={itemIdx} className="text-xs text-slate-600 flex items-center gap-2">
                                        <div className="w-1 h-1 rounded-full bg-emerald-400" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </section>

            {/* API */}
            <section className="mt-12">
                <h2 className="text-2xl font-black text-slate-900 mb-6">{api.title}</h2>
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                    <div className="mb-6">
                        <h3 className="text-sm font-bold text-slate-700 mb-3">Base URLs</h3>
                        <ul className="space-y-2 text-sm">
                            <li><span className="font-bold text-slate-600">Production:</span> <code className="bg-slate-100 px-2 py-0.5 rounded">{api.baseUrls.production}</code></li>
                            <li><span className="font-bold text-slate-600">Development:</span> <code className="bg-slate-100 px-2 py-0.5 rounded">{api.baseUrls.development}</code></li>
                        </ul>
                    </div>

                    <h3 className="text-sm font-bold text-slate-700 mb-3">Core Endpoints</h3>
                    <div className="space-y-2">
                        {api.endpoints.map((endpoint, idx) => (
                            <div key={idx} className="flex items-start gap-3 text-sm">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${endpoint.method === 'GET' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                                    }`}>
                                    {endpoint.method}
                                </span>
                                <code className="font-mono text-slate-700">{endpoint.path}</code>
                                <span className="text-slate-500">- {endpoint.description}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Roadmap */}
            <section className="mt-10">
                <h2 className="text-2xl font-black text-slate-900 mb-4">{roadmap.title}</h2>
                <div className="space-y-3">
                    {roadmap.quarters.map((quarter, idx) => (
                        <div key={idx} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-base font-bold text-slate-800">{quarter.period}</h3>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${quarter.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                    quarter.status === 'inProgress' ? 'bg-blue-100 text-blue-700' :
                                        'bg-slate-100 text-slate-600'
                                    }`}>
                                    {quarter.status === 'completed' ? '✅ 완료' : quarter.status === 'inProgress' ? '🚧 진행중' : '📋 계획'}
                                </span>
                            </div>
                            <ul className="space-y-1.5 text-sm text-slate-600">
                                {quarter.items.map((item, itemIdx) => (
                                    <li key={itemIdx} className="flex items-center gap-2">
                                        <span className={quarter.status === 'completed' ? 'text-emerald-500' : 'text-slate-400'}>
                                            {quarter.status === 'completed' ? '✓' : '○'}
                                        </span>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </section>

            {/* Support */}
            <section className="mt-12">
                <h2 className="text-2xl font-black text-slate-900 mb-6">{support.title}</h2>
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-700 mb-4">문의 채널</h3>
                    <div className="space-y-3 mb-6">
                        {support.channels.map((channel, idx) => (
                            <div key={idx} className="flex items-center gap-3">
                                <span className="text-2xl">{channel.icon}</span>
                                <div>
                                    <div className="text-xs font-bold text-slate-600">{channel.label}</div>
                                    {channel.link ? (
                                        <a href={channel.link} target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-600 hover:underline">
                                            {channel.value}
                                        </a>
                                    ) : (
                                        <div className="text-sm text-slate-800">{channel.value}</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <h3 className="text-sm font-bold text-slate-700 mb-2">응답 시간</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-slate-600">
                        {support.responseTime.map((time, idx) => (
                            <li key={idx}>{time}</li>
                        ))}
                    </ul>
                </div>
            </section>

            {/* License */}
            <section className="mt-12 pt-12 border-t border-slate-200">
                <h2 className="text-2xl font-black text-slate-900 mb-4">{license.title}</h2>
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
                    <p className="text-sm text-slate-600 mb-2">
                        <span className="font-bold">Repository:</span>{' '}
                        <a href={`https://${license.repo}`} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline font-mono">
                            {license.repo}
                        </a>
                    </p>
                    <p className="text-sm text-slate-600">
                        <span className="font-bold">License:</span> {license.license}
                    </p>
                </div>
            </section>
        </GuideLayout>
    );
}
