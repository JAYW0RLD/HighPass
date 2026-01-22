import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, Tooltip, YAxis } from 'recharts';

export const RevenueAreaChart = ({ data }: { data: any[] }) => {
    // Determine min/max for dynamic domain, or use 0-100 default if empty
    // const min = Math.min(...data.map(d => d.value));

    return (
        <div style={{ width: '100%', height: '100%' }}>
            <ResponsiveContainer>
                <AreaChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
                    <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <Tooltip cursor={{ stroke: '#ffffff20' }} content={<CustomTooltip color="#10b981" unit="CRO" />} />
                    <YAxis domain={[-25, 100]} hide />
                    <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#10b981"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorValue)"
                        isAnimationActive={false}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export const CallsBarChart = ({ data }: { data: any[] }) => {
    // Check if all values are 0 to avoid "blue line" artifact
    console.log('CallsBarChart Data Check:', JSON.stringify(data, null, 2));
    const isAllZero = data.every(d => d.value === 0);

    if (isAllZero) {
        return (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'end', paddingBottom: 5 }}>
                {/* Visual line at the bottom to show "0" state clearly */}
                <div style={{ width: '100%', height: '2px', background: '#3b82f6', opacity: 0.5 }} />
            </div>
        );
    }

    return (
        <div style={{ width: '100%', height: '100%' }}>
            <ResponsiveContainer>
                <BarChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
                    <Tooltip cursor={{ fill: '#ffffff10' }} content={<CustomTooltip color="#3b82f6" unit="Calls" />} />
                    <YAxis domain={[0, 100]} hide />
                    <Bar
                        dataKey="value"
                        fill="#3b82f6"
                        barSize={20}
                        opacity={0.8}
                        isAnimationActive={false}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

const CustomTooltip = ({ active, payload, label, color, unit }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-[#0A0A0B] border border-white/10 p-2 rounded shadow-xl text-xs">
                <p className="text-zinc-500 mb-1">{new Date(label * 1000).toLocaleTimeString()}</p>
                <p style={{ color: color }} className="font-bold">
                    {payload[0].value.toFixed(0)} {unit}
                </p>
            </div>
        );
    }
    return null;
};
