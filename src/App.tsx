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
import { OnboardingTour } from './components/OnboardingTour';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Sparkles, LogIn, Heart } from 'lucide-react';

import { LandingPage } from './components/Landing/LandingPage';
import { Mail, Clock, RefreshCw, LogOut } from 'lucide-react';

function AppContent() {
  const { profile, loading, user, logout, sendVerification, checkVerification } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [verifying, setVerifying] = useState(false);
  const [checkingVerification, setCheckingVerification] = useState(false);
  const [verificationFeedback, setVerificationFeedback] = useState<string | null>(null);

  React.useEffect(() => {
    const handleNavChange = (e: any) => {
      if (e.detail === 'admin') setActiveTab('admin');
      if (e.detail === 'warriors' || e.detail === 'patients') setActiveTab('patients');
      if (e.detail === 'settings' || e.detail === 'profile') setActiveTab('settings');
      if (e.detail === 'ledger') setActiveTab('settings');
      if (e.detail === 'transparency') setActiveTab('transparency');
      if (e.detail === 'auctions') setActiveTab('auctions');
      if (e.detail === 'notifications') setActiveTab('notifications');
      if (e.detail === 'dashboard') setActiveTab('dashboard');
    };
    window.addEventListener('nav-change', handleNavChange);
    return () => window.removeEventListener('nav-change', handleNavChange);
  }, []);

  // Guarantee that switching tabs scrolls the screen back to the top level
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeTab]);

  // Auto-poll verification status every 4 seconds when on the verification screen
  React.useEffect(() => {
    if (user && profile && !profile.emailVerified) {
      const interval = setInterval(async () => {
        await checkVerification();
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [user, profile, checkVerification]);

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
        <div className="glass-card max-w-md w-full p-8 md:p-10 text-center space-y-8">
          <div className="relative mx-auto w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center text-teal-800 shadow-inner">
            <Mail className="w-10 h-10" />
            <div className="absolute top-0 right-0 w-4 h-4 bg-teal-500 rounded-full animate-ping" />
            <div className="absolute top-0 right-0 w-4 h-4 bg-teal-500 rounded-full border-2 border-white" />
          </div>
          
          <div className="space-y-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-800">Verify your identity</h1>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">
              We've sent a verification link to <span className="text-teal-950 font-bold underline decoration-teal-500/30">{user.email}</span>.
            </p>
            <p className="text-xs text-slate-400">
              Please click the link inside that email to unlock your verified Donor account.
            </p>
          </div>

          {/* Real-time status badge */}
          <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 flex flex-col items-center gap-2">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
              </span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Auto-checking in background...
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">
              Once you click the link, this screen will transition automatically.
            </p>
          </div>

          {verificationFeedback && (
            <motion.p 
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`text-xs font-semibold p-3 rounded-lg border ${
                verificationFeedback.includes("Successfully") 
                  ? "bg-teal-50 text-teal-800 border-teal-100" 
                  : "bg-amber-50 text-amber-800 border-amber-100"
              }`}
            >
              {verificationFeedback}
            </motion.p>
          )}

          <div className="space-y-3">
            <button 
              onClick={async () => {
                setCheckingVerification(true);
                setVerificationFeedback(null);
                const isVerified = await checkVerification();
                setCheckingVerification(false);
                if (isVerified) {
                  setVerificationFeedback("Successfully verified! Redirecting you now...");
                } else {
                  setVerificationFeedback("Still waiting for verification. Check your spam folder or try resending.");
                }
              }}
              disabled={checkingVerification || verifying}
              className="w-full py-3.5 bg-teal-800 hover:bg-teal-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition-all uppercase text-xs tracking-widest disabled:opacity-50"
            >
              {checkingVerification ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Verifying...
                </>
              ) : "I've Verified - Let Me In"}
            </button>

            <div className="grid grid-cols-2 gap-3 flex-wrap">
              <button 
                onClick={async () => {
                  setVerifying(true);
                  setVerificationFeedback(null);
                  try {
                    await sendVerification();
                    setVerificationFeedback("Verification link successfully resent to your email.");
                  } catch (e: any) {
                    setVerificationFeedback(e.message || "Failed to resend. Please wait before retrying.");
                  }
                  setVerifying(false);
                }}
                disabled={verifying || checkingVerification}
                className="py-3 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-all uppercase text-[10px] tracking-wider disabled:opacity-50"
              >
                {verifying ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Resend Link'}
              </button>

              <button 
                onClick={logout}
                className="py-3 bg-white text-rose-600 border border-slate-200 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-rose-50/50 hover:border-rose-200 transition-all uppercase text-[10px] tracking-wider"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-center gap-2 text-[9px] font-bold text-slate-300 uppercase tracking-widest italic">
            <Clock className="w-3.5 h-3.5" />
            Verification prevents spam & protects medical privacy
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
      <OnboardingTour />
      
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
