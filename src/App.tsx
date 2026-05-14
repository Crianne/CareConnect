import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { PatientList } from './components/PatientList';
import { AuctionSection } from './components/AuctionSection';
import { Transparency } from './components/Transparency';
import { AdminHub } from './components/AdminHub';
import { Notifications } from './components/Notifications';
import { Settings } from './components/Settings';
import { ChatWidget } from './components/chat/ChatWidget';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Sparkles, LogIn, Heart } from 'lucide-react';

import { LandingPage } from './components/Landing/LandingPage';
import { Mail, Clock, RefreshCw, LogOut } from 'lucide-react';

function AppContent() {
  const { profile, loading, user, logout, sendVerification } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [verifying, setVerifying] = useState(false);

  React.useEffect(() => {
    const handleNavChange = (e: any) => {
      if (e.detail === 'admin') setActiveTab('admin');
      if (e.detail === 'warriors' || e.detail === 'patients') setActiveTab('patients');
      if (e.detail === 'settings' || e.detail === 'profile') setActiveTab('settings');
      if (e.detail === 'ledger') setActiveTab('settings');
      if (e.detail === 'transparency') setActiveTab('transparency');
      if (e.detail === 'notifications') setActiveTab('notifications');
      if (e.detail === 'dashboard') setActiveTab('dashboard');
    };
    window.addEventListener('nav-change', handleNavChange);
    return () => window.removeEventListener('nav-change', handleNavChange);
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-50 flex items-center justify-center">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="w-12 h-12 bg-teal-900 rounded-lg flex items-center justify-center text-white shadow-lg"
        >
          <ShieldCheck className="w-6 h-6" />
        </motion.div>
      </div>
    );
  }

  // Not logged in -> Show Brand Landing Page
  if (!user || !profile) {
    return <LandingPage />;
  }

  // Logged in but not verified -> Show Verification Screen
  if (!profile.emailVerified) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="glass-card max-w-sm w-full p-10 text-center space-y-8">
          <div className="w-16 h-16 bg-brand-primary/10 rounded-full flex items-center justify-center text-brand-primary mx-auto">
            <Mail className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-800">Verify your identity</h1>
            <p className="text-sm text-slate-500 font-medium">
              We've sent a verification link to <span className="text-slate-800 font-bold">{user.email}</span>. Please verify to access the donor portal.
            </p>
          </div>

          <div className="space-y-3">
            <button 
              onClick={async () => {
                setVerifying(true);
                await sendVerification();
                setVerifying(false);
              }}
              disabled={verifying}
              className="w-full py-3 bg-brand-primary text-white rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-brand-primary/90 transition-all shadow-sm uppercase text-xs tracking-widest disabled:opacity-50"
            >
              {verifying ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Resend Link'}
            </button>
            <button 
              onClick={logout}
              className="w-full py-3 bg-white text-slate-500 border border-slate-200 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-all uppercase text-xs tracking-widest"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>

          <div className="pt-4 flex items-center justify-center gap-3 text-[9px] font-bold text-slate-300 uppercase tracking-widest italic">
            <Clock className="w-3 h-3" />
            Verification prevents spam & fraud
          </div>
        </div>
      </div>
    );
  }

  // Authenticated & Verified -> Main Dashboard
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'patients': return <PatientList />;
      case 'auctions': return <AuctionSection />;
      case 'transparency': return <Transparency />;
      case 'admin': return <AdminHub />;
      case 'notifications': return <Notifications />;
      case 'settings': 
      case 'profile': return <Settings />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="max-w-7xl mx-auto px-4 pt-28 pb-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      <ChatWidget />
      
      {/* Global Status */}
      <div className="fixed bottom-20 md:bottom-6 left-6 z-[90]">
        <div className="bg-white px-3 py-1.5 rounded border border-slate-200 shadow-sm flex items-center gap-2">
           <div className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-pulse" />
           <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
             Polygon Node Connected
           </span>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
