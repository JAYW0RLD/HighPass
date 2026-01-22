interface SystemStatusCardProps {
    gasBalance: string;
    nodeCount: number;
    latency: number;
}

export default function SystemStatusCard({ gasBalance, nodeCount, latency }: SystemStatusCardProps) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ background: '#0a0a0c', border: '1px solid #1a1a1c', borderRadius: '12px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#888', fontWeight: 'bold' }}>PLATFORM GAS</span>
                    <span className="status-indicator active"></span>
                </div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff' }}>
                    {gasBalance} <span style={{ fontSize: '10px', color: '#888' }}>CRO</span>
                </div>
                <div style={{ fontSize: '10px', color: '#10b981', marginTop: '4px' }}>Optimal Balance</div>
            </div>

            <div style={{ background: '#0a0a0c', border: '1px solid #1a1a1c', borderRadius: '12px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#888', fontWeight: 'bold' }}>NETWORK LATENCY</span>
                    <span style={{ display: 'inline-block', width: '6px', height: '6px', background: latency < 100 ? '#10b981' : latency < 500 ? '#f59e0b' : '#ef4444', borderRadius: '50%' }}></span>
                </div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff' }}>
                    {latency} <span style={{ fontSize: '10px', color: '#888' }}>ms</span>
                </div>
                <div style={{ fontSize: '10px', color: '#3b82f6', marginTop: '4px' }}>Cronos L1 Mainnet</div>
            </div>

            <div style={{ background: '#0a0a0c', border: '1px solid #1a1a1c', borderRadius: '12px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#888', fontWeight: 'bold' }}>ACTIVE NODES</span>
                    <span style={{ display: 'inline-block', width: '6px', height: '6px', background: '#f59e0b', borderRadius: '50%' }}></span>
                </div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff' }}>{nodeCount}</div>
                <div style={{ fontSize: '10px', color: '#f59e0b', marginTop: '4px' }}>Registered Providers</div>
            </div>
        </div>
    );
}
