import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

interface RealTimeChartProps {
    data: { time: number; value: number; rawValue?: number }[];
    height?: number;
    color?: string;
}

export const RealTimeChart: React.FC<RealTimeChartProps> = ({
    data,
    height = 320,
    color = '#10b981' // Default emerald
}) => {
    // Format time for XAxis
    const formattedData = data.map(d => ({
        ...d,
        displayTime: new Date(d.time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }));

    return (
        <div style={{ width: '100%', height: height }} className="animate-fade-in">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={formattedData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                    <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="rgba(255,255,255,0.03)"
                    />
                    <XAxis
                        dataKey="displayTime"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#52525b', fontSize: 10, fontWeight: 700 }}
                        minTickGap={30}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#52525b', fontSize: 10, fontWeight: 700 }}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#09090b',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)'
                        }}
                        itemStyle={{ color: '#fff' }}
                        labelStyle={{ color: '#71717a', marginBottom: '4px' }}
                        cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
                    />
                    <Area
                        type="monotone"
                        dataKey="value"
                        stroke={color}
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorValue)"
                        animationDuration={1500}
                        activeDot={{
                            r: 6,
                            stroke: '#000',
                            strokeWidth: 2,
                            fill: color,
                            className: "shadow-2xl shadow-emerald-500/50"
                        }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};
