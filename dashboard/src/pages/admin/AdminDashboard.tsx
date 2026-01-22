import { useState, useEffect } from 'react';
import { supabase } from '../../utils/apiClient';
import Header from '../../components/Header';
import '../App.css';

interface RequestLog {
    id: number;
    agentId: string | null;
    timestamp: string;
    status: number;
    amount: string;
    txHash: string | null;
    endpoint: string;
    error: string | null;
    creditGrade: string | null;
}

interface StatsData {
    recent: RequestLog[];
    totalRequests: number;
    totalRevenueWei: number;
    pendingDebtWei?: string;
    adminBalanceWei?: string;
}

interface Notification {
    id: number;
    message: string;
    type: 'success' | 'warning' | 'info';
}

function AdminDashboard() {
    const [stats, setStats] = useState<StatsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [notifications, setNotifications] = useState<Notification[]>([]);

    useEffect(() => {
        // Initial fetch
        const fetchStats = async () => {
            try {
                const apiOrigin = import.meta.env.VITE_API_ORIGIN || 'http://localhost:3000';
                const res = await fetch(`${apiOrigin} /api/stats`);
                if (!res.ok) throw new Error(`HTTP ${res.status} `);
                const data = await res.json();
                setStats(data);
                setError(null);
                setLoading(false);
            } catch (error) {
                console.error('Failed to fetch stats:', error);
                setError('Connection Lost');
                setLoading(false);
            }
        };

        fetchStats();

        // Supabase Realtime Subscription


        if (supabase) {
            const channel = supabase
                .channel('table-db-changes')
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'requests',
                    },
                    (payload: any) => {
                        console.log('Realtime update:', payload);
                        const newLog = payload.new;

                        // Transform snake_case to camelCase
                        const mappedLog = {
                            id: newLog.id,
                            agentId: newLog.agent_id,
                            timestamp: newLog.timestamp,
                            status: newLog.status,
                            amount: newLog.amount,
                            txHash: newLog.tx_hash,
                            endpoint: newLog.endpoint,
                            error: newLog.error,
                            creditGrade: newLog.credit_grade
                        };

                        // Notification Logic
                        if (mappedLog.status === 200 && mappedLog.endpoint.includes('/resource') && !mappedLog.txHash) {
                            addNotification('Identity Verified: Instant Access Granted', 'success');
                        } else if (mappedLog.status === 402) {
                            addNotification('Payment Required: Access Restricted', 'warning');
                        } else if (mappedLog.status === 403) {
                            addNotification('Access Denied: High Risk Agent', 'warning');
                        }

                        // Update stats locally
                        setStats(prev => {
                            if (!prev) return prev;
                            const newRecent = [mappedLog, ...prev.recent].slice(0, 100);
                            return {
                                ...prev,
                                totalRequests: prev.totalRequests + 1,
                                recent: newRecent,
                            };
                        });

                        // Optional: Refetch full stats to get updated aggregates
                        fetchStats();
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        } else {
            // Fallback to polling if Supabase not configured
            const interval = setInterval(fetchStats, 2000);
            return () => clearInterval(interval);
        }
    }, []);

    const addNotification = (message: string, type: 'success' | 'warning' | 'info') => {
        const id = Date.now();
        setNotifications(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, 4000);
    };

    if (loading) {
        return <div className="loading">
            <div className="spinner"></div>
            <p>Initializing System</p>
        </div>;
    }

    if (error) {
        return <div className="error-screen">
            <div className="error-icon">⚠</div>
            <p>{error}</p>
        </div>;
    }

    const revenueInCRO = stats ? (stats.totalRevenueWei / 1e18).toFixed(6) : '0.000000';
    const pendingDebtInCRO = stats?.pendingDebtWei ? (Number(stats.pendingDebtWei) / 1e18).toFixed(6) : '0.000000';
    const adminBalanceInCRO = stats?.adminBalanceWei ? (Number(stats.adminBalanceWei) / 1e18).toFixed(4) : '0.0000';
    const successfulRequests = stats?.recent.filter(r => r.status === 200).length || 0;
    const hasPendingDebt = Number(pendingDebtInCRO) > 0;

    // Get unique agents and their status
    const agentStatuses = new Map<string, 'TRUSTED' | 'PENDING_DEBT' | 'BLOCKED'>();
    stats?.recent.forEach(log => {
        if (log.agentId && !agentStatuses.has(log.agentId)) {
            if (log.status === 200 && !log.txHash) {
                agentStatuses.set(log.agentId, 'PENDING_DEBT');
            } else if (log.status === 200) {
                agentStatuses.set(log.agentId, 'TRUSTED');
            } else if (log.status === 403) {
                agentStatuses.set(log.agentId, 'BLOCKED');
            }
        }
    });

    const getStatusBadge = (status: number, txHash: string | null) => {
        if (status === 200 && !txHash) return <span className="status-badge optimistic">OPTIMISTIC</span>;
        if (status === 200) return <span className="status-badge verified">VERIFIED</span>;
        if (status === 402) return <span className="status-badge pending">DEBT DUE</span>;
        if (status === 403) return <span className="status-badge blocked">BLOCKED</span>;
        return <span className="status-badge neutral">{status}</span>;
    };

    const getGradeBadge = (grade: string | null) => {
        if (!grade) return <span className="grade-badge unknown">—</span>;
        const gradeClass = grade.toLowerCase();
        return <span className={`grade - badge grade - ${gradeClass} `}>{grade}</span>;
    };

    return (
        <div className="dashboard">
            <Header title="HighStation" />

            {/* Notifications */}
            <div className="notifications">
                {notifications.map(notif => (
                    <div key={notif.id} className={`notification ${notif.type} `}>
                        <span className="notif-icon">
                            {notif.type === 'success' && '✓'}
                            {notif.type === 'warning' && '⚠'}
                            {notif.type === 'info' && 'ℹ'}
                        </span>
                        {notif.message}
                    </div>
                ))}
            </div>

            <div className="sub-header" style={{ marginBottom: '2.5rem', marginTop: '1rem' }}>
                <div className="header-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: '400', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>Gatekeeper Admin</h2>
                    <div className="system-status" style={{ background: '#f2f2f2', padding: '6px 12px', borderRadius: 'var(--radius-pill)', fontSize: '12px' }}>
                        <div className="status-indicator active"></div>
                        <span style={{ fontWeight: '600' }}>OPERATIONAL</span>
                    </div>
                </div>
                <p className="header-subtitle" style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Global Infrastructure & Revenue Overview</p>
            </div>

            <div className="metrics-grid">
                <div className="metric-card primary">
                    <div className="metric-label">TOTAL REQUESTS</div>
                    <div className="metric-value">{stats?.totalRequests || 0}</div>
                </div>
                <div className="metric-card">
                    <div className="metric-label">VERIFIED ACCESS</div>
                    <div className="metric-value">{successfulRequests}</div>
                </div>
                <div className="metric-card success">
                    <div className="metric-label">PROTOCOL FEES</div>
                    <div className="metric-value">{adminBalanceInCRO}</div>
                    <div className="metric-unit">CRO</div>
                </div>
                <div className="metric-card success">
                    <div className="metric-label">GLOBAL REVENUE</div>
                    <div className="metric-value">{revenueInCRO}</div>
                    <div className="metric-unit">CRO</div>
                </div>
                <div className={`metric - card ${hasPendingDebt ? 'warning' : ''} `}>
                    <div className="metric-label">GLOBAL DEBT</div>
                    <div className="metric-value">{pendingDebtInCRO}</div>
                    <div className="metric-unit">CRO</div>
                </div>
            </div>

            <div className="data-section">
                <div className="section-header">
                    <h2>ACTIVITY LOG</h2>
                    <div className="legend">
                        <span className="legend-item"><div className="dot verified"></div>Verified</span>
                        <span className="legend-item"><div className="dot optimistic"></div>Optimistic</span>
                        <span className="legend-item"><div className="dot pending"></div>Debt Due</span>
                        <span className="legend-item"><div className="dot blocked"></div>Blocked</span>
                    </div>
                </div>

                <div className="data-table">
                    <div className="table-header">
                        <span>TIMESTAMP</span>
                        <span>GRADE</span>
                        <span>AGENT</span>
                        <span>STATUS</span>
                        <span>ENDPOINT</span>
                        <span>TRANSACTION</span>
                    </div>
                    <div className="table-body">
                        {stats?.recent.slice(0, 12).map(log => (
                            <div key={log.id} className="table-row">
                                <span className="cell-time">{new Date(log.timestamp).toLocaleTimeString('en-US', { hour12: false })}</span>
                                <span className="cell-grade">{getGradeBadge(log.creditGrade)}</span>
                                <span className="cell-agent">{log.agentId || '—'}</span>
                                <span className="cell-status">{getStatusBadge(log.status, log.txHash)}</span>
                                <span className="cell-endpoint">{log.endpoint}</span>
                                <span className="cell-tx">
                                    {log.txHash ? (
                                        <a
                                            href={`https://explorer.zkevm.cronos.org/tx/${log.txHash}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="tx-link"
                                        >
                                            {log.txHash.slice(0, 10)}...
                                        </a >
                                    ) : '—'}
                                </span >
                            </div >
                        ))}
                    </div >
                </div >
            </div >

            <footer className="footer">
                <span>Admin View</span>
                <span>•</span>
                <span>Role: Administrator</span>
            </footer>
        </div >
    );
}

export default AdminDashboard;
