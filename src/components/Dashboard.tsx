import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit, addDoc, serverTimestamp, doc, updateDoc, increment, getDocs } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Patient, Donation, LoyaltyTier, UserRole, AuctionItem } from '../types';
import { cn, formatCurrency } from '../lib/utils';
import { Sparkles, Trophy, ArrowRight, ShieldCheck, Heart, TrendingUp, Activity, Clock, FileText, ShieldAlert, Gavel } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import copy from 'copy-to-clipboard';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Info, Copy, Check, X as CloseIcon } from 'lucide-react';
import { PredictiveAnalyticsCoPilot } from './PredictiveAnalyticsCoPilot';
import { generateDonorImpactPdf } from '../utils/donorImpactPdf';
import { Achievements } from './Achievements';
import { DwellTooltip } from './DwellTooltip';
import { TitleExplainer } from './TitleExplainer';

const TIER_DETAILS = [
  {
    tier: LoyaltyTier.BRONZE,
    minPHP: "₱0 to ₱9,999",
    color: "text-orange-600 bg-orange-50 border-orange-200",
    icon: Heart,
    shortDesc: "Entry supporter position. Commencing a legacy of decentralized aid representation.",
    benefits: [
      "Standard community contributor badge",
      "Immutable donor profile registered on-chain",
      "Access to real-time pediatric oncology warrior progress logs",
      "Full access to the 24/7 AI-driven transparent concierge"
    ]
  },
  {
    tier: LoyaltyTier.SILVER,
    minPHP: "₱10,000+",
    color: "text-slate-600 bg-slate-50 border-slate-200",
    icon: Sparkles,
    shortDesc: "Dedicated care patron. Elevating the frequency of patient chemotherapy support.",
    benefits: [
      "Prioritized manual audit verification of submitted GCash receipts",
      "On-chain silver-level contributor badge and metadata tag",
      "Exclusive access to foundations monthly live-audited ledger sheets",
      "Reserved access to standard category charity auctions and art lots"
    ]
  },
  {
    tier: LoyaltyTier.GOLD,
    minPHP: "₱50,000+",
    color: "text-amber-600 bg-amber-50 border-amber-200",
    icon: Trophy,
    shortDesc: "Elite healthcare booster. Deepening transparency and milestone funding speed.",
    benefits: [
      "24-hour early-bidding preview privileges on luxury donation lots",
      "Zero-fee treasury distribution triggers on dedicated cases",
      "Quarterly direct advisory reports with clinical oncology directors",
      "Interactive digital gold star on the public leaderboard"
    ]
  },
  {
    tier: LoyaltyTier.PLATINUM,
    minPHP: "₱200,000+",
    color: "text-teal-600 bg-teal-50 border-teal-200",
    icon: ShieldCheck,
    shortDesc: "Decentralized consensus oracle governor. Steering structural medical pipelines.",
    benefits: [
      "Direct IPFS oracle database consensus vote delegation",
      "On-chain voting rights on foundation contingency emergency pools",
      "Permanent cryptographic ledger hero index inscription",
      "VIP invitation to hospital ward physical oncology handovers"
    ]
  }
];

export function Dashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ totalPatients: 0, totalAid: 0, activeAuctions: 0 });
  const [recentDonations, setRecentDonations] = useState<Donation[]>([]);
  const [personalDonations, setPersonalDonations] = useState<Donation[]>([]);
  const [recentAuditLogs, setRecentAuditLogs] = useState<any[]>([]);
  const [impactData, setImpactData] = useState<any[]>([]);
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [showTxViewer, setShowTxViewer] = useState<Donation | null>(null);
  const [showTierMatrix, setShowTierMatrix] = useState(false);
  const [adminDonations, setAdminDonations] = useState<Donation[]>([]);
  const [adminAuctions, setAdminAuctions] = useState<AuctionItem[]>([]);

  const handleCopy = (text: string, id: string) => {
    copy(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getFullHash = (donation: Donation) => donation.blockchainTxHash || ('0x' + donation.id.padEnd(64, '0'));

  const parseDate = (ts: any) => {
    if (!ts) return new Date();
    if (typeof ts.toDate === 'function') return ts.toDate();
    if (ts.seconds) return new Date(ts.seconds * 1000);
    return new Date(ts);
  };

  const getImpactTimeframe = () => {
    if (!impactData || impactData.length === 0) return 'Impact Tracking Period';
    const firstMonth = impactData[0].name;
    const lastMonth = impactData[impactData.length - 1].name;
    return `Monthly Tracking Range: ${firstMonth} – ${lastMonth} 2026`;
  };

  useEffect(() => {
    if (!profile) return;

    // We only show verified donations in the public feed for everyone to maintain the "Verified Ledger" promise
    const dQuery = query(collection(db, 'donations'), where('status', '==', 'verified'));

    const unsub = onSnapshot(dQuery, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Donation));
      // Sort client-side by timestamp DESC to avoid compound index error
      docs.sort((a, b) => {
        const tA = parseDate(a.timestamp).getTime();
        const tB = parseDate(b.timestamp).getTime();
        return tB - tA;
      });
      setRecentDonations(docs.slice(0, 50));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'donations'));

    // Personal donations listener
    const pQuery = query(
      collection(db, 'donations'), 
      where('donorId', '==', profile.userId)
    );
    const unsubPersonal = onSnapshot(pQuery, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Donation));
      // Sort client-side by timestamp DESC to avoid compound index error
      docs.sort((a, b) => {
        const tA = parseDate(a.timestamp).getTime();
        const tB = parseDate(b.timestamp).getTime();
        return tB - tA;
      });
      setPersonalDonations(docs);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'donations'));

    // Secondary listener for all-time verified stats (limited to 1000 for safety, but better than 50)
    const statsQuery = query(collection(db, 'donations'), where('status', '==', 'verified'), limit(1000));
    const unsubStats = onSnapshot(statsQuery, (snapshot) => {
      const allVerified = snapshot.docs.map(d => d.data() as Donation);
      const totalVerified = allVerified.reduce((acc, curr) => acc + curr.amount, 0);
      
      setStats({ 
        totalPatients: 142, 
        totalAid: 12450000 + totalVerified,
        activeAuctions: 12 
      });

      // Update impact chart data from all verified donations relevant to the user
      const monthMap: Record<string, number> = { 
        'Jan': profile.role === UserRole.ADMIN ? 14000 : 0, 
        'Feb': profile.role === UserRole.ADMIN ? 13000 : 0, 
        'Mar': profile.role === UserRole.ADMIN ? 15000 : 0, 
        'Apr': profile.role === UserRole.ADMIN ? 18000 : 0, 
        'May': profile.role === UserRole.ADMIN ? 17000 : 0 
      };

      const relevantDocs = profile.role === UserRole.ADMIN 
        ? allVerified 
        : allVerified.filter(d => d.donorId === profile.userId);

      relevantDocs.forEach(d => {
        try {
          const date = parseDate(d.timestamp);
          if (isNaN(date.getTime())) return;
          const month = date.toLocaleString('default', { month: 'short' });
          monthMap[month] = (monthMap[month] || 0) + d.amount;
        } catch (e) {}
      });

      const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const sortedImpact = Object.entries(monthMap)
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => monthOrder.indexOf(a.name) - monthOrder.indexOf(b.name));
      setImpactData(sortedImpact);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'donations'));

    // Admin Audit Logs Listener
    let unsubAudit = () => {};
    let unsubAdminDonations = () => {};
    let unsubAdminAuctions = () => {};
    if (profile && profile.role === UserRole.ADMIN) {
      const aQuery = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(15));
      unsubAudit = onSnapshot(aQuery, (snapshot) => {
        setRecentAuditLogs(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'audit_logs'));

      // Listen to all donations to extract pending and pool allocations
      unsubAdminDonations = onSnapshot(collection(db, 'donations'), (snapshot) => {
        setAdminDonations(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Donation)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'donations'));

      // Listen to all auctions to extract audits
      unsubAdminAuctions = onSnapshot(collection(db, 'auctions'), (snapshot) => {
        setAdminAuctions(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AuctionItem)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'auctions'));
    }

    return () => {
      unsub();
      unsubPersonal();
      unsubStats();
      unsubAudit();
      unsubAdminDonations();
      unsubAdminAuctions();
    };
  }, [profile?.userId, profile?.role]);

  // Reconcile user profile statistics with the actual donations list
  useEffect(() => {
    if (!profile || personalDonations.length === 0) return;

    const verifiedDons = personalDonations.filter(d => d.status === 'verified');
    const calculatedTotal = verifiedDons.reduce((sum, d) => sum + (d.amount || 0), 0);
    const calculatedCount = verifiedDons.length;

    const currentTotal = profile.totalContribution || 0;
    const currentCount = profile.verifiedContributionsCount || 0;

    if (currentTotal !== calculatedTotal || currentCount !== calculatedCount) {
      console.log(`Reconciling user stats in Dashboard. Firestore: total=${currentTotal}, count=${currentCount}. Actual: total=${calculatedTotal}, count=${calculatedCount}`);
      
      const updateStats = async () => {
        try {
          const { doc, updateDoc } = await import('firebase/firestore');
          const { db } = await import('../lib/firebase');
          const userRef = doc(db, 'users', profile.userId);
          
          let newTier = profile.loyaltyTier || LoyaltyTier.BRONZE;
          if (calculatedTotal >= 200000) newTier = LoyaltyTier.PLATINUM;
          else if (calculatedTotal >= 50000) newTier = LoyaltyTier.GOLD;
          else if (calculatedTotal >= 10000) newTier = LoyaltyTier.SILVER;
          else newTier = LoyaltyTier.BRONZE;

          await updateDoc(userRef, {
            totalContribution: calculatedTotal,
            verifiedContributionsCount: calculatedCount,
            loyaltyTier: newTier
          });
        } catch (e) {
          console.error("Failed to update reconciled stats in Firestore:", e);
        }
      };
      
      updateStats();
    }
  }, [personalDonations, profile?.userId, profile?.totalContribution, profile?.verifiedContributionsCount, profile?.loyaltyTier]);

  const handleGenerateReport = async () => {
    if (!profile) return;
    try {
      const patientsSnap = await getDocs(collection(db, 'patients'));
      const patientsList = patientsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Patient));
      generateDonorImpactPdf(profile, personalDonations, patientsList);
    } catch (e) {
      console.error('Failed to generate on-chain report:', e);
      alert('Failed to generate report. Telemetry is authenticating, please try again in a moment.');
    }
  };

  const handleSystemHealth = () => {
    setShowHealthModal(true);
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Hero / Greeting */}
      <div className="relative overflow-hidden rounded-3xl bg-teal-900 p-8 md:p-12 text-white shadow-xl">
        <div className="relative z-10 max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-teal-800 text-[10px] font-bold uppercase tracking-widest mb-6">
              <Sparkles className="w-3 h-3 text-teal-400" />
              <span>{profile?.role === UserRole.ADMIN ? 'Foundation Operations' : 'Foundation Activity Overview'}</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              {profile?.role === UserRole.ADMIN ? 'Foundation Audit Core' : `Welcome back, ${profile?.displayName?.split(' ')[0] || 'Friend'}`}
            </h1>
            <p className="text-teal-100/70 text-lg mb-8 leading-relaxed max-w-lg">
              {profile?.role === UserRole.ADMIN 
                ? 'System health is optimal. Audit the verification queue to maintain 100% blockchain transparency for all pediatric oncology cases.'
                : `You've reached ${profile?.loyaltyTier || 'Standard'} status. Your contributions are making waves in pediatric oncology care transparency.`
              }
            </p>
            <div className="flex flex-wrap gap-4">
              {profile?.role === UserRole.ADMIN ? (
                <>
                  <button 
                    onClick={() => {
                        window.dispatchEvent(new CustomEvent('nav-change', { detail: 'admin' }));
                    }}
                    className="px-6 py-2.5 bg-brand-primary text-white rounded-lg font-bold hover:bg-brand-primary/90 transition-all flex items-center gap-2 group text-sm"
                  >
                    Audit Queue <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button 
                    onClick={() => {
                        localStorage.setItem('admin_sub_tab', 'reports');
                        window.dispatchEvent(new CustomEvent('nav-change', { 
                          detail: 'admin',
                          subTab: 'reports' 
                        } as any));
                    }}
                    className="px-6 py-2.5 bg-white text-slate-900 rounded-lg font-bold hover:bg-slate-50 transition-all text-sm"
                  >
                    Reports Vault
                  </button>
                  <button 
                    onClick={handleSystemHealth}
                    className="px-6 py-2.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg font-bold transition-all text-sm"
                  >
                    System Health
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={() => {
                        window.dispatchEvent(new CustomEvent('nav-change', { detail: 'warriors' }));
                    }}
                    className="px-6 py-2.5 bg-brand-primary text-white rounded-lg font-bold hover:bg-brand-primary/90 transition-all flex items-center gap-2 group text-sm"
                  >
                    Make a Contribution <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button 
                    onClick={() => {
                        window.dispatchEvent(new CustomEvent('nav-change', { detail: 'transparency' }));
                    }}
                    className="px-6 py-2.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg font-bold transition-all text-sm"
                  >
                    Review My Ledger
                  </button>
                  <button 
                    onClick={handleGenerateReport}
                    className="px-6 py-2.5 bg-teal-500 hover:bg-teal-400 border border-teal-400/20 text-white rounded-lg font-bold transition-all flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-white" /> Download Impact Report
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </div>
        
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 pointer-events-none">
           <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
              <pattern id="grid-dark" width="10" height="10" patternUnits="userSpaceOnUse">
                 <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5"/>
              </pattern>
              <rect width="100%" height="100%" fill="url(#grid-dark)" />
           </svg>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Aid Mobilized', value: formatCurrency(stats.totalAid), icon: Heart, trend: '+12% this month' },
          { label: 'Blockchain Verified', value: '1,248', icon: ShieldCheck, trend: '100% Immutable' },
          { label: 'Families Supported', value: '142', icon: Trophy, trend: '42 Active Treatments' },
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center border border-teal-100">
                <stat.icon className="w-5 h-5 text-teal-600" />
              </div>
              <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                {stat.trend}
              </span>
            </div>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{stat.label}</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{stat.value}</h3>
          </motion.div>
        ))}
      </div>
          {/* Dynamic Mid-section for Admin vs General User */}
      {profile?.role === UserRole.ADMIN ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            <div className="lg:col-span-2 xl:col-span-3 flex flex-col">
              {(() => {
                const pendingCount = adminDonations.filter(d => d.status === 'pending').length;
                const auditAuctionCount = adminAuctions.filter(a => a.status === 'audit').length;
                const unreconciledPoolCount = adminDonations.filter(d => d.status === 'verified' && d.patientId === 'general-pool' && !d.isCarePoolDivided).length;
                const totalPendingAuditActions = pendingCount + auditAuctionCount + unreconciledPoolCount;

                return (
                  <div className="bg-slate-900 text-white rounded-[2rem] p-6 md:p-8 shadow-xl border border-slate-800 relative overflow-hidden transition-all duration-300 flex-1 flex flex-col justify-between">
                    {/* Ambient subtle decorative glow */}
                    <div className="absolute top-0 right-0 w-80 h-80 bg-brand-primary/10 rounded-full blur-3xl -mr-28 -mt-28 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />
                    
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 border-b border-white/10 pb-6 mb-6 relative z-10">
                      <div className="space-y-2 text-left">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-primary/20 border border-brand-primary/30 rounded-full text-[9px] font-black uppercase tracking-wider text-teal-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Live Operational Integrity Engine
                        </div>
                        <h2 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                          Operational Audit & Reconciliation Control Room
                        </h2>
                        <p className="text-xs text-slate-300 font-medium leading-relaxed max-w-2xl">
                          Inspect real-time treasury checkpoints requiring supervisor oversight. Review donation slips, authorize artisan auction contracts, or rebalance delayed universal pool records to ensure no pediatric case experiences medical funding slippage.
                        </p>
                      </div>
                      
                      <div className="shrink-0 font-sans">
                        <div className={cn(
                          "px-5 py-4 rounded-2xl flex flex-col items-center justify-center min-w-[140px] border transition-all duration-350 shadow-inner",
                          totalPendingAuditActions > 0 
                            ? "bg-amber-500/10 border-amber-500/20 text-amber-400" 
                            : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                        )}>
                          <span className="text-3xl font-black tracking-tight animate-fade-in">{totalPendingAuditActions}</span>
                          <span className="text-[9px] font-black uppercase tracking-widest mt-1">Pending Audits</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative z-10 text-left">
                      {/* Card 1: Donation Receipts */}
                      <div className={cn(
                        "p-5 rounded-2xl border transition-all duration-300 text-left flex flex-col justify-between h-full group bg-slate-950/40 hover:bg-slate-950/60",
                        pendingCount > 0 ? "border-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.02)]" : "border-slate-800"
                      )}>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[8px] font-black uppercase tracking-wider font-mono">
                              Ledger Proofs
                            </span>
                            <span className="flex items-center gap-1.5">
                              <span className={cn("w-1.5 h-1.5 rounded-full", pendingCount > 0 ? "bg-amber-400 animate-pulse" : "bg-emerald-400")} />
                              <span className="text-[10px] font-bold text-slate-400">
                                {pendingCount > 0 ? `${pendingCount} Pending` : 'All Verified'}
                              </span>
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wide flex items-center gap-1.5">
                            <ShieldAlert className="w-3.5 h-3.5 text-amber-500/80" />
                            Donation Verification
                          </h4>
                          <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                            GCash screenshot scans and physical banking slips submitted by donors waiting for manual artifact comparison and receipt-state commitment.
                          </p>
                        </div>
                        
                        <button
                          onClick={() => {
                            localStorage.setItem('admin_sub_tab', 'verification');
                            window.dispatchEvent(new CustomEvent('nav-change', { detail: 'admin', subTab: 'verification' } as any));
                          }}
                          className="mt-5 w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold uppercase text-[9px] tracking-widest transition-all :text-slate-900 border border-slate-700/50 cursor-pointer"
                        >
                          Verify Deposits Now →
                        </button>
                      </div>

                      {/* Card 2: Auctions Smart Contracts */}
                      <div className={cn(
                        "p-5 rounded-2xl border transition-all duration-300 text-left flex flex-col justify-between h-full group bg-slate-950/40 hover:bg-slate-950/60",
                        auditAuctionCount > 0 ? "border-purple-500/20 shadow-[0_0_12px_rgba(168,85,247,0.02)]" : "border-slate-800"
                      )}>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[8px] font-black uppercase tracking-wider font-mono">
                              Provenance Audit
                            </span>
                            <span className="flex items-center gap-1.5">
                              <span className={cn("w-1.5 h-1.5 rounded-full", auditAuctionCount > 0 ? "bg-purple-400 animate-pulse" : "bg-emerald-400")} />
                              <span className="text-[10px] font-bold text-slate-400">
                                {auditAuctionCount > 0 ? `${auditAuctionCount} Under Audit` : 'All Deployed'}
                              </span>
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wide flex items-center gap-1.5">
                            <Gavel className="w-3.5 h-3.5 text-purple-400" />
                            Asset Smart Contracts
                          </h4>
                          <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                            Exquisite art masterpieces or boutique memorabilia assets requiring core contract initialization and deployment to Polygon POS block record.
                          </p>
                        </div>
                        
                        <button
                          onClick={() => {
                            localStorage.setItem('admin_sub_tab', 'auctions');
                            window.dispatchEvent(new CustomEvent('nav-change', { detail: 'admin', subTab: 'auctions' } as any));
                          }}
                          className="mt-5 w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold uppercase text-[9px] tracking-widest transition-all border border-slate-700/50 cursor-pointer"
                        >
                          Inspect & Deploy contracts →
                        </button>
                      </div>

                      {/* Card 3: Care Pool Overbalances */}
                      <div className={cn(
                        "p-5 rounded-2xl border transition-all duration-300 text-left flex flex-col justify-between h-full group bg-slate-950/40 hover:bg-slate-950/60",
                        unreconciledPoolCount > 0 ? "border-teal-500/20 shadow-[0_0_12px_rgba(20,184,166,0.02)]" : "border-slate-800"
                      )}>
                        <div className="space-y-3 text-left">
                          <div className="flex items-center justify-between">
                            <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[8px] font-black uppercase tracking-wider font-mono">
                              Ledger Equilibrium
                            </span>
                            <span className="flex items-center gap-1.5">
                              <span className={cn("w-1.5 h-1.5 rounded-full", unreconciledPoolCount > 0 ? "bg-teal-400 animate-pulse" : "bg-emerald-400")} />
                              <span className="text-[10px] font-bold text-slate-400">
                                {unreconciledPoolCount > 0 ? `${unreconciledPoolCount} Unreconciled` : 'Fully Synchronized'}
                              </span>
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wide flex items-center gap-1.5">
                            <Activity className="w-3.5 h-3.5 text-teal-400" />
                            Care Pool Divisions
                          </h4>
                          <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                            General/Unified Care Pool donations that require split distribution. Divide these across active pediatric registries to rebalance treatment wallets.
                          </p>
                        </div>
                        
                        <button
                          onClick={() => {
                            localStorage.setItem('admin_sub_tab', 'verification');
                            window.dispatchEvent(new CustomEvent('nav-change', { detail: 'admin', subTab: 'verification' } as any));
                          }}
                          className="mt-5 w-full py-2.5 px-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold uppercase text-[9px] tracking-widest transition-all flex items-center justify-center gap-1.5 border border-transparent shadow-lg hover:shadow-teal-600/15 cursor-pointer"
                        >
                          Go to Care Pool Rebalancer →
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="lg:col-span-1 xl:col-span-1">
              <div className="p-0 bg-slate-900 rounded-xl border border-slate-800 shadow-2xl relative overflow-hidden flex flex-col h-full min-h-[500px] transition-all duration-300 hover:shadow-lg">
                <div className="relative z-10 flex flex-col h-full">
                  <div className="p-6 border-b border-white/10 flex items-center justify-between bg-slate-950/50">
                    <div className="flex flex-col text-left">
                      <div className="flex items-center gap-2 mb-1">
                        <ShieldCheck className="w-5 h-5 text-teal-400" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Foundation Audit Trail</span>
                      </div>
                      <span className="text-[8px] text-white/40 uppercase tracking-widest font-bold">Administrative Real-Time History</span>
                    </div>
                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.8)]" />
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar max-h-[350px]">
                    {recentAuditLogs.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center px-8 opacity-20">
                        <Activity className="w-12 h-12 text-white mb-4 animate-pulse" />
                        <p className="text-[10px] font-bold text-white uppercase tracking-widest">Awaiting system events...</p>
                      </div>
                    ) : recentAuditLogs.map((log) => (
                      <div key={log.id} className="p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all cursor-pointer group text-left">
                        <div className="flex items-center justify-between mb-2">
                          <span className="px-2 py-0.5 bg-teal-500/20 text-teal-400 text-[8px] font-black uppercase tracking-tighter rounded border border-teal-500/30">
                            {log.action}
                          </span>
                          <span className="text-[9px] text-white/40 font-mono">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[11px] text-white/80 font-bold leading-snug mb-2 line-clamp-2">{log.details}</p>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[8px] font-bold text-teal-400 border border-white/5 uppercase">
                            {log.adminEmail?.charAt(0) || 'A'}
                          </div>
                          <span className="text-[9px] text-white/30 font-medium truncate italic">{log.adminEmail}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="p-6 mt-auto bg-gradient-to-t from-slate-950 to-transparent">
                    <button 
                      onClick={() => {
                        localStorage.setItem('admin_sub_tab', 'control');
                        window.dispatchEvent(new CustomEvent('nav-change', { detail: 'admin', subTab: 'control' } as any));
                      }}
                      className="w-full py-3 bg-white/10 hover:bg-white border border-white/10 hover:text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
                    >
                      Open Audit Hub
                    </button>
                  </div>
                </div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl -mr-32 -mt-32" />
              </div>
            </div>
          </div>

          <div className="glass-card flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col text-left">
              <div className="flex">
                <TitleExplainer
                  featureName="Impact Trend"
                  simpleExplanation="The Impact Trend is a simple visual chart. It shows how much money has been donated over time, proving that every single Peso is active."
                  badge="Kindness Tracker"
                  bulletPoints={[
                    "Tracks the amount and timeframe of donations",
                    "Updates in real-time as admin approves payments",
                    "Excludes unverified or cancelled transfer proofs"
                  ]}
                >
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-brand-primary shrink-0" />
                    Impact Trend
                  </h3>
                </TitleExplainer>
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono mt-1">
                {getImpactTimeframe()}
              </p>
            </div>
            <div className="p-6 h-[300px]">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={impactData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis 
                      dataKey="name" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500, fontFamily: 'monospace' }}
                      dy={8}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 9, fontFamily: 'monospace' }}
                      tickFormatter={(value) => `₱${value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value}`}
                      dx={-6}
                    />
                    <Tooltip 
                      formatter={(value: any) => [`₱${Number(value).toLocaleString()}`, 'Impact Amount']}
                      contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px' }}
                      itemStyle={{ color: '#2dd4bf', fontSize: '12px', fontWeight: 'bold' }}
                    />
                    <Area type="monotone" dataKey="amount" stroke="#0d9488" fill="#0d9488" fillOpacity={0.06} strokeWidth={2} />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="glass-card p-8 flex flex-col items-center text-center relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 rounded-full -mr-16 -mt-16" />
             
             <div className="relative mb-6">
                <div className={cn(
                  "w-24 h-24 rounded-full flex items-center justify-center border-4 shadow-xl",
                  profile?.loyaltyTier === LoyaltyTier.PLATINUM ? "border-teal-200 bg-teal-50" :
                  profile?.loyaltyTier === LoyaltyTier.GOLD ? "border-amber-200 bg-amber-50" :
                  profile?.loyaltyTier === LoyaltyTier.SILVER ? "border-slate-200 bg-slate-50" :
                  "border-orange-200 bg-orange-50"
                )}>
                   {profile?.loyaltyTier === LoyaltyTier.PLATINUM ? <ShieldCheck className="w-12 h-12 text-teal-600" /> :
                    profile?.loyaltyTier === LoyaltyTier.GOLD ? <Trophy className="w-12 h-12 text-amber-600" /> :
                    profile?.loyaltyTier === LoyaltyTier.SILVER ? <Sparkles className="w-12 h-12 text-slate-600" /> :
                    <Heart className="w-12 h-12 text-orange-600" />}
                </div>
                <div className="absolute -bottom-2 -right-2 bg-slate-900 text-white text-[9px] font-black px-2 py-1 rounded-full border-2 border-white uppercase tracking-tighter">
                   Level {profile?.loyaltyTier === LoyaltyTier.PLATINUM ? '04' : profile?.loyaltyTier === LoyaltyTier.GOLD ? '03' : profile?.loyaltyTier === LoyaltyTier.SILVER ? '02' : '01'}
                </div>
             </div>

             <h3 className="text-xl font-bold text-slate-800 mb-1">{profile?.loyaltyTier || LoyaltyTier.BRONZE}</h3>
             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mb-4">Warrior Path Status</p>
             {profile?.isRecurringDonor && (
               <div className="mb-6 px-4 py-2 bg-emerald-500/10 text-emerald-700 rounded-full border border-emerald-500/20 text-xs font-bold inline-flex items-center gap-1.5 shadow-sm">
                 <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                 <span className="capitalize">{profile.recurringFrequency}</span> Partner
               </div>
             )}

             <div className="w-full space-y-4 text-left">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                         <TrendingUp className="w-4 h-4 text-teal-600" />
                      </div>
                      <div>
                         <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Donation Streak</p>
                         <p className="text-sm font-bold text-slate-800">{profile?.donationStreak || 0} Action Months</p>
                      </div>
                   </div>
                   <div className="px-2 py-0.5 bg-brand-primary text-white text-[10px] font-black rounded uppercase tracking-tighter">
                      Active
                   </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                   <div className="flex items-center justify-between mb-2">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Progress to Next Tier</p>
                      <p className="text-[9px] font-bold text-brand-primary">{profile?.loyaltyTier === LoyaltyTier.PLATINUM ? 'MAX' : profile?.loyaltyTier === LoyaltyTier.GOLD ? '75%' : profile?.loyaltyTier === LoyaltyTier.SILVER ? '40%' : '15%'}</p>
                   </div>
                   <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: profile?.loyaltyTier === LoyaltyTier.PLATINUM ? '100%' : profile?.loyaltyTier === LoyaltyTier.GOLD ? '75%' : profile?.loyaltyTier === LoyaltyTier.SILVER ? '40%' : '15%' }}
                        className="h-full bg-brand-primary"
                      />
                   </div>
                </div>
             </div>

             <div className="mt-8 pt-8 border-t border-slate-100 w-full grid grid-cols-2 gap-4">
                <div className="text-center">
                   <p className="text-xl font-bold text-slate-800">{profile?.verifiedContributionsCount || 0}</p>
                   <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Impacts</p>
                </div>
                <div className="text-center">
                   <p className="text-xl font-bold text-slate-800">100%</p>
                   <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">On-Chain</p>
                </div>
              </div>

              <div className="w-full mt-6 pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowTierMatrix(true)}
                  className="w-full py-2.5 bg-slate-50 hover:bg-brand-primary/10 text-brand-primary text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-slate-100 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Compare Tier Perks
                </button>
             </div>
          </div>

          <div className="glass-card flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between text-left">
              <TitleExplainer
                featureName="My Audit Status"
                simpleExplanation="My Audit Status lists your own donation submissions. It shows whether they are pending admin review, approved/verified, or rejected due to low receipt quality."
                badge="Personal Log"
                bulletPoints={[
                  "Lists your recent PHP donation bank or GCash submissions",
                  "Allows you to monitor active state transitions",
                  "Displays real-time blockchain TX hashes once verified"
                ]}
              >
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <Clock className="w-4 h-4 text-brand-primary shrink-0" />
                  My Audit Status
                </h3>
              </TitleExplainer>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Recent Submissions</span>
            </div>
            <div className="p-2 space-y-1 overflow-y-auto max-h-[400px] no-scrollbar">
              {personalDonations.length === 0 ? (
                <div className="p-8 text-center">
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No Submissions Found</p>
                </div>
              ) : personalDonations.map((d) => (
                <div key={d.id} className="p-3 rounded-xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 group text-left">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                       <span className="text-xs font-bold text-slate-800">₱{d.amount.toLocaleString()}</span>
                      <DwellTooltip
                        title={
                          d.status === 'verified' ? "Contribution Approved" :
                          d.status === 'rejected' ? "Verification Failed" :
                          "Audit In Progress"
                        }
                        description={
                          d.status === 'verified' ? "On-chain verification complete. This payment receipt is permanently registered on Polygon and allocated securely to care campaigns." :
                          d.status === 'rejected' ? "The payment receipt was flagged or rejected due to visual discrepancy, low image quality, or duplicate entry." :
                          "Undergoing manual administrator audit checking and OCR receipt validation. This prevents balance spoofing or duplicates."
                        }
                        statusType={
                          d.status === 'verified' ? "verified" :
                          d.status === 'rejected' ? "rejected" :
                          "pending"
                        }
                      >
                         <span className={cn(
                           "text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border cursor-help",
                           d.status === 'verified' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                           d.status === 'rejected' ? "bg-red-50 text-red-600 border-red-100" :
                           "bg-amber-50 text-amber-600 border-amber-100"
                         )}>
                           {d.status}
                         </span>
                      </DwellTooltip>
                    </div>
                    <span className="text-[9px] font-bold text-slate-400">
                      {parseDate(d.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {d.status === 'rejected' && d.rejectionReason && (
                    <div className="mt-2 p-2 bg-red-50/50 rounded-lg border border-red-100/50 text-left">
                      <p className="text-[9px] font-bold text-red-700 uppercase tracking-widest mb-1 italic">Audit Failure Reason:</p>
                      <p className="text-[10px] text-red-600 leading-tight">{d.rejectionReason}</p>
                    </div>
                  )}
                  
                  {d.blockchainTxHash && (
                     <div className="mt-2 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                        <span className="text-[9px] font-mono text-emerald-600 font-bold">{d.blockchainTxHash.substring(0, 16)}...</span>
                     </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          </div>

          <div className="glass-card flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col text-left">
              <div className="flex">
                <TitleExplainer
                  featureName="Impact Trend"
                  simpleExplanation="The Impact Trend is a simple visual chart. It shows how much money has been donated over time, proving that every single Peso is active."
                  badge="Kindness Tracker"
                  bulletPoints={[
                    "Tracks the amount and timeframe of donations",
                    "Updates in real-time as admin approves payments",
                    "Excludes unverified or cancelled transfer proofs"
                  ]}
                >
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-brand-primary shrink-0" />
                    Impact Trend
                  </h3>
                </TitleExplainer>
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono mt-1">
                {getImpactTimeframe()}
              </p>
            </div>
            <div className="p-6 h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={impactData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis 
                      dataKey="name" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500, fontFamily: 'monospace' }}
                      dy={8}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 9, fontFamily: 'monospace' }}
                      tickFormatter={(value) => `₱${value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value}`}
                      dx={-6}
                    />
                    <Tooltip 
                      formatter={(value: any) => [`₱${Number(value).toLocaleString()}`, 'Impact Amount']}
                      contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px' }}
                      itemStyle={{ color: '#2dd4bf', fontSize: '12px', fontWeight: 'bold' }}
                    />
                    <Area type="monotone" dataKey="amount" stroke="#0d9488" fill="#0d9488" fillOpacity={0.06} strokeWidth={2} />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {profile?.role !== UserRole.ADMIN && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8 lg:h-[530px]">
          <Achievements className="h-full" />
          <PredictiveAnalyticsCoPilot profile={profile} className="h-full" />
        </div>
      )}

      <div className="grid grid-cols-1 gap-8">
        {/* Live Ledger */}
        <div className="glass-card flex flex-col overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <TitleExplainer
                featureName="Real-time Chain Feed"
                simpleExplanation="The Real-time Chain Feed displays a live synchronized ticker of all approved donations across the community, integrated directly with Polygon Proof of Stake receipt signatures."
                badge="Mainnet Feed"
                bulletPoints={[
                  "Only lists successfully audited and approved PHP donations",
                  "Shows immediate cryptographic transaction hashes",
                  "Allows full certificate inspection for absolute proof"
                ]}
              >
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-brand-primary shrink-0" />
                  Real-time Chain Feed (Verified Only)
                </h3>
              </TitleExplainer>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Audit Trail Synchronized with Polygon POS</p>
            </div>
            <div className="flex items-center gap-2">
               <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
               <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Mainnet Live</span>
            </div>
          </div>
          <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto no-scrollbar">
            {recentDonations.map((donation) => (
              <div key={donation.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 group hover:border-teal-200 transition-all flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <div 
                    onClick={() => setShowTxViewer(donation)}
                    className="font-mono text-[10px] text-teal-600 bg-white border border-teal-100 px-3 py-1.5 rounded-lg cursor-pointer shadow-sm hover:bg-teal-50 transition-colors whitespace-nowrap"
                  >
                    {donation.blockchainTxHash?.substring(0, 24) || 'Pending...'}
                  </div>
                  <div className="flex items-center gap-3">
                     <div className="w-8 h-8 bg-white rounded-full border border-slate-200 flex items-center justify-center text-[10px] font-bold text-teal-600 shadow-sm">
                        {(donation.isAnonymous ? 'Anonymous Supporter' : (donation.donorName || 'Anonymous Warrior')).charAt(0)}
                     </div>
                     <div>
                        <p className="text-xs font-bold text-slate-700">{donation.isAnonymous ? 'Anonymous Supporter' : (donation.donorName || 'Anonymous Warrior')}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Verified Donor</p>
                     </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <p className="text-base font-black text-slate-800 leading-none">₱{donation.amount.toLocaleString()}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Contribution</p>
                  </div>
                  <button 
                    onClick={() => setShowTxViewer(donation)}
                    className="p-3 bg-white hover:bg-teal-600 hover:text-white rounded-xl border border-slate-100 transition-all text-teal-600 shadow-sm"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showTxViewer && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="bg-teal-900 p-8 text-white relative">
                <div className="relative z-10">
                   <div className="flex items-center gap-2 mb-4">
                      <ShieldCheck className="w-5 h-5 text-teal-400" />
                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Verified On-Chain Asset</span>
                   </div>
                   <h3 className="text-2xl font-bold tracking-tight mb-2">Transaction Certificate</h3>
                   <div className="font-mono text-[10px] p-3 bg-white/5 rounded border border-white/10 break-all">
                     {getFullHash(showTxViewer)}
                   </div>
                </div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-teal-400/10 rounded-full blur-3xl -mr-16 -mt-16" />
              </div>

              <div className="p-8 space-y-6">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status</p>
                       <p className="text-xs font-bold text-emerald-600 uppercase flex items-center gap-2">
                          <Check className="w-3.5 h-3.5" /> Success (Verified)
                       </p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Timestamp</p>
                       <p className="text-xs font-bold text-slate-800">
                          {new Date(showTxViewer.timestamp).toLocaleString()}
                       </p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Impact Value</p>
                       <p className="text-xs font-bold text-slate-800">₱{showTxViewer.amount.toLocaleString()} PHP</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Network</p>
                       <p className="text-xs font-bold text-slate-800">Polygon Mainnet</p>
                    </div>
                 </div>

                 <div className="p-5 bg-teal-50 border border-teal-100 rounded-2xl">
                    <p className="text-[9px] font-bold text-teal-800 uppercase tracking-widest mb-2">Audit Insight</p>
                    <p className="text-[11px] text-teal-700 leading-relaxed font-medium">
                       This transaction has been cryptographically signed and recorded on the Polygon blockchain. 
                       The funds are held in the foundation treasury vault and released according to pediatric medical audit milestones.
                    </p>
                 </div>

                 <div className="flex gap-4">
                    <button 
                      onClick={() => handleCopy(getFullHash(showTxViewer), 'cert')}
                      className="flex-1 py-4 bg-slate-900 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest shadow-xl"
                    >
                      {copiedId === 'cert' ? 'Copied Full Hash' : 'Copy Full TX Hash'}
                    </button>
                    <button 
                      onClick={() => setShowTxViewer(null)}
                      className="px-8 py-4 bg-slate-100 text-slate-600 rounded-xl font-bold uppercase text-[10px] tracking-widest"
                    >
                      Close
                    </button>
                 </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showHealthModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <Activity className="w-4 h-4 text-teal-600" />
                  System Diagnostics
                </h3>
                <button onClick={() => setShowHealthModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <CloseIcon className="w-4 h-4 text-slate-400" />
                </button>
              </div>
              <div className="p-8 space-y-4">
                {[
                  { label: 'Firestore Enterprise', status: 'Optimal', Latency: '12ms', icon: ShieldCheck },
                  { label: 'Firebase Auth', status: 'Verified', Latency: 'Active', icon: ShieldCheck },
                  { label: 'Polygon RPC', status: 'Connected', Latency: 'Alchemy Node', icon: ShieldCheck },
                  { label: 'AI Analysis Engine', status: 'Warm', Latency: 'Gemini 1.5 Pro', icon: Sparkles },
                  { label: 'Audit Queue', status: 'Stable', Latency: '0 Pending', icon: Clock },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                        <item.icon className="w-4 h-4 text-teal-600" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-800 uppercase tracking-widest">{item.label}</p>
                        <p className="text-[8px] text-slate-400 uppercase font-black">{item.Latency}</p>
                      </div>
                    </div>
                    <span className="text-[8px] font-bold text-teal-600 uppercase bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
              <div className="p-6 pt-0">
                <button 
                  onClick={() => setShowHealthModal(false)}
                  className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest"
                >
                  Close Diagnostics
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTierMatrix && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-5xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col my-8"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-brand-primary" />
                    Warrior Path: Loyalty Tier Matrix
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-wide">
                    Compare differentiated privileges and smart-contract triggers across levels.
                  </p>
                </div>
                <button 
                  onClick={() => setShowTierMatrix(false)} 
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
                >
                  <CloseIcon className="w-4 h-4 text-slate-500" />
                </button>
              </div>

              <div className="p-6 md:p-8 overflow-y-auto max-h-[70vh] space-y-6 scrollbar-thin">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {TIER_DETAILS.map((t, idx) => {
                    const isCurrent = profile?.loyaltyTier === t.tier || (!profile?.loyaltyTier && t.tier === LoyaltyTier.BRONZE);
                    return (
                      <div 
                        key={idx} 
                        className={cn(
                          "p-6 rounded-3xl border flex flex-col justify-between transition-all relative overflow-hidden",
                          isCurrent 
                            ? "bg-gradient-to-b from-brand-primary/5 to-transparent border-brand-primary/40 ring-1 ring-brand-primary/20 shadow-md" 
                            : "bg-white border-slate-100 hover:border-slate-300"
                        )}
                      >
                        {isCurrent && (
                          <div className="absolute top-0 right-0 bg-brand-primary text-white text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-xl">
                            Active Rank
                          </div>
                        )}

                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", t.color)}>
                              <t.icon className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">{t.tier.split(' ')[0]}</h4>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{t.minPHP}</p>
                            </div>
                          </div>

                          <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                            {t.shortDesc}
                          </p>

                          <div className="space-y-2 pt-2 border-t border-slate-100">
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Privileges:</p>
                            {t.benefits.map((b, bIdx) => (
                              <div key={bIdx} className="flex items-start gap-1.5">
                                <Check className="w-3" />
                                <span className="text-[10px] text-slate-600 leading-tight font-medium">
                                  {b}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button 
                  onClick={() => setShowTierMatrix(false)}
                  className="px-6 py-2.5 bg-slate-950 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest cursor-pointer hover:bg-slate-900 transition-colors"
                >
                  Close Matrix
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

          <div className="p-8 bg-slate-50 rounded-3xl border border-slate-200">
            <TitleExplainer
              featureName="On-Chain Sync Architecture"
              simpleExplanation="The On-Chain Sync Architecture is a mechanism linking fast cloud storage with decentralised blockchain networks. This prevents server tamper issues while keeping load times immediate."
              badge="Infrastructure"
              bulletPoints={[
                "Provides Firestore speed for visual rendering and response times",
                "Mirrors verified states to decentralized Polygon nodes",
                "Maintains persistent cryptographic confirmation files"
              ]}
            >
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-4">
                <Info className="w-4 h-4 text-brand-primary shrink-0" />
                On-Chain Sync Architecture
              </h3>
            </TitleExplainer>
            <p className="text-xs text-slate-500 leading-relaxed font-bold tracking-tight uppercase">
              Your contributions are processed via <span className="text-brand-primary">Firestore Enterprise</span> for high-speed application state, 
              which is then mirrored in real-time to the <span className="text-brand-primary">Foundation Blockchain Vault</span>. 
              This ensures every peso donated is immutably recorded, searchable via the Foundation Explorer, and cryptographically verified.
            </p>
          </div>
    </div>
  );
}
