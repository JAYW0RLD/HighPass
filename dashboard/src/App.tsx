import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import AuthPage from './pages/AuthPage';
import AdminDashboard from './pages/AdminDashboard';
import ProviderPortal from './pages/ProviderPortal';
import './App.css';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Protected Route Component
function ProtectedRoute({ children, requiredRole }: { children: JSX.Element, requiredRole?: 'admin' | 'provider' }) {
  const [session, setSession] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        // Fetch role from profiles table
        supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            setRole(data?.role || 'provider'); // Default to provider if missing
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && role !== requiredRole) {
    // Redirect logic: Admin attempting portal -> Allow? Provider attempting Admin -> Block.
    // For strict RBAC:
    if (requiredRole === 'admin' && role !== 'admin') {
      return <div className="error-screen"><p>Access Denied: Admins Only</p></div>;
    }
  }

  return children;
}

function RoleBasedRedirect() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
          .then(({ data }) => {
            setRole(data?.role || 'provider');
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    });
  }, []);

  if (loading) return <div className="loading"><div className="spinner"></div></div>;
  if (!role) return <Navigate to="/login" replace />;

  return role === 'admin' ? <Navigate to="/admin" replace /> : <Navigate to="/portal" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<AuthPage />} />

        <Route path="/admin" element={
          <ProtectedRoute requiredRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        } />

        <Route path="/portal" element={
          <ProtectedRoute requiredRole="provider">
            <ProviderPortal />
          </ProtectedRoute>
        } />

        <Route path="/" element={<RoleBasedRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
