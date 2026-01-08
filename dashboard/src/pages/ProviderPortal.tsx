import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import '../App.css';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

interface Service {
    id: string;
    slug: string;
    name: string;
    upstream_url: string;
    price_wei: string;
    min_grade: string;
}

function ProviderPortal() {
    const [activeTab, setActiveTab] = useState<'services' | 'integration' | 'revenue'>('services');
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [newService, setNewService] = useState({
        name: '',
        slug: '',
        upstream_url: '',
        price_wei: '0',
        min_grade: 'F'
    });

    useEffect(() => {
        fetchServices();
    }, []);

    const fetchServices = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('services')
                .select('*')
                .eq('provider_id', user.id);

            if (error) throw error;
            setServices(data || []);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching services:', err);
            setLoading(false);
        }
    };

    const handleCreateService = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase.from('services').insert({
                provider_id: user.id,
                ...newService
            });

            if (error) throw error;

            alert('Service Created!');
            setNewService({ name: '', slug: '', upstream_url: '', price_wei: '0', min_grade: 'F' });
            fetchServices();
        } catch (err: any) {
            alert(`Error: ${err.message}`);
        }
    };

    // --- Components for Tabs ---

    const ServicesTab = () => (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
            {/* CREATE SERVICE FORM */}
            <div className="card" style={{ background: '#131429', padding: '1.5rem', borderRadius: '12px', border: '1px solid #2d2f45' }}>
                <h2 style={{ marginTop: 0 }}>Register New Service</h2>
                <form onSubmit={handleCreateService} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>Service Name</label>
                        <input
                            type="text"
                            value={newService.name}
                            onChange={e => setNewService({ ...newService, name: e.target.value })}
                            placeholder="My Weather API"
                            required
                            style={inputStyle}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>URL Slug</label>
                        <input
                            type="text"
                            value={newService.slug}
                            onChange={e => setNewService({ ...newService, slug: e.target.value })}
                            placeholder="weather-api"
                            required
                            style={inputStyle}
                        />
                        <small style={{ color: '#555' }}>Endpoint: /gatekeeper/{newService.slug || '...'}/resource</small>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>Upstream Target</label>
                        <input
                            type="text"
                            value={newService.upstream_url}
                            onChange={e => setNewService({ ...newService, upstream_url: e.target.value })}
                            placeholder="https://api.myapp.com"
                            required
                            style={inputStyle}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>Price (Wei)</label>
                            <input
                                type="number"
                                value={newService.price_wei}
                                onChange={e => setNewService({ ...newService, price_wei: e.target.value })}
                                required
                                style={inputStyle}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>Min Grade</label>
                            <select
                                value={newService.min_grade}
                                onChange={e => setNewService({ ...newService, min_grade: e.target.value })}
                                style={inputStyle}
                            >
                                <option value="A">A (Verified Only)</option>
                                <option value="B">B (Trusted)</option>
                                <option value="C">C (Standard)</option>
                                <option value="F">F (Allow All)</option>
                            </select>
                        </div>
                    </div>
                    <button type="submit" style={buttonStyle}>
                        REGISTER SERVICE
                    </button>
                </form>
            </div>

            {/* SERVICE LIST */}
            <div className="card" style={{ background: '#131429', padding: '1.5rem', borderRadius: '12px', border: '1px solid #2d2f45' }}>
                <h2 style={{ marginTop: 0 }}>My Services</h2>
                {loading ? <p>Loading...</p> : (
                    <div className="service-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {services.map(svc => (
                            <div key={svc.id} style={{ background: '#0a0b1e', padding: '1rem', borderRadius: '8px', border: '1px solid #333' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <h3 style={{ margin: 0, color: 'white' }}>{svc.name}</h3>
                                    <span style={{ background: '#333', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>{svc.min_grade}+ Only</span>
                                </div>
                                <code style={{ display: 'block', color: '#00f7ff', marginBottom: '0.5rem' }}>/gatekeeper/{svc.slug}/resource</code>
                                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem', color: '#888' }}>
                                    <span>Target: {svc.upstream_url}</span>
                                    <span>•</span>
                                    <span>Price: {svc.price_wei} wei</span>
                                </div>
                            </div>
                        ))}
                        {services.length === 0 && <p style={{ color: '#555' }}>No services registered yet.</p>}
                    </div>
                )}
            </div>
        </div>
    );

    const IntegrationTab = () => {
        const [selectedService, setSelectedService] = useState<Service | null>(services[0] || null);

        if (services.length === 0) return <p>Please register a service first.</p>;

        const apiOrigin = import.meta.env.VITE_API_ORIGIN || 'http://localhost:3000';
        const endpoint = `${apiOrigin}/gatekeeper/${selectedService?.slug || 'service-slug'}/resource`;

        const codeSnippet = `
import { createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { cronosTestnet } from 'viem/chains'

const client = createWalletClient({
  account: privateKeyToAccount('YOUR_PRIVATE_KEY'),
  chain: cronosTestnet,
  transport: http()
})

async function callService() {
  const serviceUrl = "${endpoint}";
  
  // 1. Initial Request (Check Price/Debt)
  const res = await fetch(serviceUrl, {
    headers: { 'X-Agent-ID': 'my-agent' }
  });

  if (res.status === 402) {
    // 2. Handle Payment logic here
    console.log("Payment Required:", await res.json());
  } else {
    // 3. Success (Optimistic Access)
    console.log("Success:", await res.json());
  }
}

callService();
    `.trim();

        return (
            <div className="card" style={{ background: '#131429', padding: '1.5rem', borderRadius: '12px', border: '1px solid #2d2f45' }}>
                <h2>Agent Integration Guide</h2>
                <p style={{ color: '#aaa', marginBottom: '1rem' }}>Select a service to generate the connection code.</p>

                <select
                    onChange={(e) => setSelectedService(services.find(s => s.id === e.target.value) || null)}
                    style={{ ...inputStyle, maxWidth: '300px', marginBottom: '1rem' }}
                >
                    {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>

                <div style={{ background: '#0a0b1e', padding: '1rem', borderRadius: '8px', border: '1px solid #333' }}>
                    <pre style={{ margin: 0, overflowX: 'auto', color: '#00f7ff', fontFamily: 'monospace' }}>
                        {codeSnippet}
                    </pre>
                </div>
            </div>
        );
    };

    const RevenueTab = () => {
        // Mock Revenue Data (In prod, fetch from DB aggregation)
        const totalCalls = services.length * 125; // Dummy data
        const grossRevenue = services.length * 0.05 * 1000;
        const protocolFee = grossRevenue * 0.005;
        const netEarnings = grossRevenue - protocolFee;

        return (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div className="card" style={{ background: '#131429', padding: '1.5rem', borderRadius: '12px', border: '1px solid #2d2f45', gridColumn: '1 / -1' }}>
                    <h2>Financial Overview</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginTop: '1rem' }}>
                        <StatBox label="Total Calls" value={totalCalls.toString()} />
                        <StatBox label="Gross Revenue (CRO)" value={grossRevenue.toFixed(2)} color="#00ff00" />
                        <StatBox label="Protocol Fee (0.5%)" value={`-${protocolFee.toFixed(2)}`} color="#ff4444" />
                        <StatBox label="Net Earnings (CRO)" value={netEarnings.toFixed(2)} color="#00f7ff" size="large" />
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="dashboard provider-portal" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ color: '#00f7ff', margin: 0 }}>PROVIDER PORTAL</h1>
                    <p style={{ color: '#888', margin: '5px 0' }}>Manage your Agent Services</p>
                </div>
                <button onClick={() => supabase.auth.signOut()} className="btn-secondary">Sign Out</button>
            </header>

            {/* TABS */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
                <TabButton label="My Services" active={activeTab === 'services'} onClick={() => setActiveTab('services')} />
                <TabButton label="Integration Guide" active={activeTab === 'integration'} onClick={() => setActiveTab('integration')} />
                <TabButton label="Revenue & Analytics" active={activeTab === 'revenue'} onClick={() => setActiveTab('revenue')} />
            </div>

            {activeTab === 'services' && <ServicesTab />}
            {activeTab === 'integration' && <IntegrationTab />}
            {activeTab === 'revenue' && <RevenueTab />}

        </div>
    );
}

// Styling Helpers
const inputStyle = { width: '100%', padding: '0.8rem', background: '#0a0b1e', border: '1px solid #444', color: 'white', borderRadius: '6px' };
const buttonStyle = { padding: '1rem', background: '#00ccff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', marginTop: '1rem' };

const TabButton = ({ label, active, onClick }: any) => (
    <button
        onClick={onClick}
        style={{
            background: 'none',
            border: 'none',
            color: active ? '#00f7ff' : '#888',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            padding: '0.5rem 1rem',
            borderBottom: active ? '2px solid #00f7ff' : 'none'
        }}
    >
        {label}
    </button>
);

const StatBox = ({ label, value, color = 'white', size = 'normal' }: any) => (
    <div style={{ background: '#0a0b1e', padding: '1rem', borderRadius: '8px', border: '1px solid #333' }}>
        <div style={{ color: '#888', fontSize: '0.9rem', marginBottom: '0.5rem' }}>{label}</div>
        <div style={{ color, fontSize: size === 'large' ? '2rem' : '1.5rem', fontWeight: 'bold' }}>{value}</div>
    </div>
);

export default ProviderPortal;
