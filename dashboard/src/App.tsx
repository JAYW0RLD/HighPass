import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from './components/DashboardLayout';
import ProviderPortal from './pages/provider/ProviderPortal';
import ServiceDashboard from './pages/services/ServiceDashboard';
import ServicesManager from './pages/provider/ServicesManager';
import CreateService from './pages/services/CreateService';
import TransactionLog from './pages/admin/TransactionLog';
import QuickStart from './pages/support/QuickStart';
import HowToUse from './pages/support/HowToUse';
import SecuritySpecs from './pages/support/SecuritySpecs';
import ServiceInfo from './pages/services/ServiceInfo';
import LogIn from './pages/auth/Login';
import Settings from './pages/account/Settings';
import Support from './pages/support/Support';
import AgentPlayground from './pages/playground/AgentPlayground';
import { ToastProvider } from './components/ToastProvider';
import { SettingsProvider } from './contexts/SettingsContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';


// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-zinc-500 text-xs font-mono">Verifying Cipher...</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LogIn />} />

            {/* Protected Provider Routes */}
            <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              <Route path="/" element={<Navigate to="/account" replace />} />
              <Route path="/account" element={<ProviderPortal />} />
              <Route path="/services" element={<ServicesManager />} />
              <Route path="/services/new" element={<CreateService />} />
              <Route path="/services/:serviceId" element={<ServiceDashboard />} />
              <Route path="/transactions" element={<TransactionLog />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/playground" element={<AgentPlayground />} />
              <Route path="/help" element={<Support />} />
              <Route path="/guide/quickstart" element={<QuickStart />} />
              <Route path="/guide/howto" element={<HowToUse />} />
              <Route path="/guide/security" element={<SecuritySpecs />} />
              <Route path="/guide/info" element={<ServiceInfo />} />
            </Route>

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/account" replace />} />
          </Routes>
          <ToastProvider />
        </Router>
      </AuthProvider>
    </SettingsProvider>
  );
}

export default App;
