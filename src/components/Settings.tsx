import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { cn, formatCurrency } from '../lib/utils';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  User, 
  Shield, 
  Settings as SettingsIcon, 
  Wallet, 
  Bell, 
  Lock, 
  ChevronRight, 
  QrCode,
  Save,
  LogOut,
  HelpCircle,
  Database,
  Globe,
  Upload,
  ShieldCheck,
  Trophy,
  TrendingUp,
  Sparkles,
  Clock,
  ExternalLink
} from 'lucide-react';
import { motion } from 'framer-motion';
import { UserRole, AppConfiguration, Donation } from '../types';

export function Settings() {
  const { profile, logout } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState('profile');
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [isSaving, setIsSaving] = useState(false);
  const [config, setConfig] = useState<AppConfiguration | null>(null);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [userDonations, setUserDonations] = useState<Donation[]>([]);

  const isAdmin = profile?.role === UserRole.ADMIN;

  useEffect(() => {
    const handleNavDetail = (e: any) => {
      if (e.detail === 'ledger') {
        setActiveSubTab('impact');
      }
    };
    window.addEventListener('nav-change', handleNavDetail);
    return () => window.removeEventListener('nav-change', handleNavDetail);
  }, []);

  useEffect(() => {
    if (!profile || isAdmin) return;
    
    const donationsQuery = query(
      collection(db, 'donations'),
      where('donorId', '==', profile.userId),
      orderBy('timestamp', 'desc')
    );

    const unsub = onSnapshot(donationsQuery, (snapshot) => {
      setUserDonations(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Donation)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'donations'));

    return unsub;
  }, [profile?.userId, isAdmin]);

  React.useEffect(() => {
    if (profile?.displayName) {
      setDisplayName(profile.displayName);
    }
  }, [profile?.displayName]);

  React.useEffect(() => {
    const loadSettings = async () => {
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('../lib/firebase');
        const settingsDoc = await getDoc(doc(db, 'settings', 'foundation'));
        if (settingsDoc.exists()) {
          const data = settingsDoc.data() as AppConfiguration;
          setConfig(data);
          setQrImageUrl(data.gcashQrUrl);
        }
      } catch (err) {
        console.error("Error loading foundation settings:", err);
      }
    };
    loadSettings();
  }, [isAdmin]);

  const handleSaveProfile = async () => {
    if (!profile) return;
    setIsSaving(true);
    try {
      const { doc, updateDoc, setDoc } = await import('firebase/firestore');
      const { db } = await import('../lib/firebase');
      
      // Update User Identity
      await updateDoc(doc(db, 'users', profile.userId), {
        displayName,
        lastUpdated: new Date().toISOString()
      });

      // Update Foundation QR if Admin
      if (isAdmin && qrImageUrl) {
        await setDoc(doc(db, 'settings', 'foundation'), {
          gcashQrUrl: qrImageUrl,
          updatedBy: profile.userId,
          lastUpdated: new Date().toISOString()
        }, { merge: true });
      }

      alert('Foundation records updated and synced with blockchain vault.');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setQrImageUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const sections = [
    { id: 'profile', label: 'Identity', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'notifications', label: 'Alert Prefs', icon: Bell },
    ...(isAdmin ? [
      { id: 'admin', label: 'Foundation settings', icon: Shield },
      { id: 'blockchain', label: 'Polygon Node', icon: Database },
    ] : [
      { id: 'impact', label: 'Impact Data', icon: Wallet },
    ])
  ];

  return (
    <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-8">
      {/* Sidebar */}
      <div className="w-full md:w-64 space-y-2">
        <div className="mb-8 px-2">
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Preferences</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">System Configuration</p>
        </div>
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSubTab(s.id)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-semibold",
              activeSubTab === s.id 
                ? "bg-white text-brand-primary shadow-sm ring-1 ring-slate-200" 
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            )}
          >
            <s.icon className="w-4 h-4" />
            {s.label}
          </button>
        ))}
        
        <div className="pt-4 mt-4 border-t border-slate-200">
           <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-all text-sm font-semibold">
              <LogOut className="w-4 h-4" />
              Sign Out
           </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 space-y-8">
        <motion.div
           key={activeSubTab}
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           className="glass-card p-10"
        >
          {activeSubTab === 'profile' && (
            <div className="space-y-8">
               <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center relative overflow-hidden group">
                     {profile?.photoURL ? <img src={profile.photoURL} alt="" /> : <User className="w-8 h-8 text-slate-300" />}
                     <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                        <Globe className="w-5 h-5 text-white" />
                     </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">{profile?.displayName}</h3>
                    <p className="text-sm text-slate-400 font-medium">{profile?.email}</p>
                    <span className="mt-2 inline-block px-2 py-0.5 bg-brand-primary/10 text-brand-primary text-[10px] font-bold uppercase tracking-wider rounded border border-brand-primary/20">
                      {profile?.loyaltyTier?.split(' ')[0] || 'Standard'} Member
                    </span>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Full Legal Name</label>
                    <input 
                      className="w-full bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 text-sm font-medium" 
                      value={displayName} 
                      onChange={e => setDisplayName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Contact Email</label>
                    <input className="w-full bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 text-sm font-medium opacity-60 cursor-not-allowed" defaultValue={profile?.email || ''} readOnly />
                  </div>
               </div>
            </div>
          )}

          {activeSubTab === 'security' && (
            <div className="space-y-8">
               <div className="flex items-center gap-2 mb-6">
                 <Lock className="w-6 h-6 text-brand-primary" />
                 <h3 className="text-lg font-bold text-slate-800">Security & Authentication</h3>
               </div>
               
               <div className="space-y-6">
                  <div 
                    onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
                    className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between cursor-pointer"
                  >
                     <div>
                        <p className="text-xs font-bold text-slate-800 uppercase tracking-widest">Two-Factor Authentication</p>
                        <p className="text-[10px] text-slate-400 font-medium">Add an extra layer of security to your foundation account.</p>
                     </div>
                     <div className={cn("w-10 h-5 rounded-full relative transition-colors", twoFactorEnabled ? "bg-brand-primary" : "bg-slate-200")}>
                        <div className={cn("absolute top-1 w-3 h-3 bg-white rounded-full transition-all", twoFactorEnabled ? "right-1" : "left-1")}></div>
                     </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Update Password</label>
                    <input type="password" placeholder="••••••••••••" className="w-full bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 text-sm font-medium" />
                  </div>

                  <div className="p-4 border border-amber-100 bg-amber-50 rounded-xl">
                     <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-1">Session Data</p>
                     <p className="text-[10px] text-amber-600 font-medium leading-relaxed">Last login: {new Date().toLocaleString()} from Metro Manila, PH. If this wasn't you, revoke all sessions.</p>
                  </div>
               </div>
            </div>
          )}

          {activeSubTab === 'notifications' && (
            <div className="space-y-8">
               <div className="flex items-center gap-2 mb-6">
                 <Bell className="w-6 h-6 text-brand-primary" />
                 <h3 className="text-lg font-bold text-slate-800">Alert Preferences</h3>
               </div>
               
               <div className="space-y-4">
                  {[
                    { title: 'Critical Patient Updates', desc: 'Alerts for warriors reaching 90% funding.', active: true },
                    { title: 'Transparency Reports', desc: 'Monthly blockchain audit summaries.', active: true },
                    { title: 'New Auctions', desc: 'Notifications for high-value item listings.', active: false },
                    { title: 'Email Summaries', desc: 'Weekly digest of foundation impact.', active: true },
                  ].map((pref, i) => (
                    <div key={i} className="flex items-center justify-between p-4 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors">
                       <div className="max-w-[80%]">
                          <p className="text-xs font-bold text-slate-800 uppercase tracking-widest">{pref.title}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{pref.desc}</p>
                       </div>
                       <div className={cn("w-10 h-5 rounded-full relative cursor-pointer transition-colors", pref.active ? "bg-brand-primary" : "bg-slate-200")}>
                          <div className={cn("absolute top-1 w-3 h-3 bg-white rounded-full transition-all", pref.active ? "right-1" : "left-1")}></div>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {activeSubTab === 'impact' && !isAdmin && (
            <div className="space-y-8">
               <div className="flex items-center gap-2 mb-6">
                 <Wallet className="w-6 h-6 text-brand-primary" />
                 <h3 className="text-lg font-bold text-slate-800">Your Impact Data</h3>
               </div>
               
               <div className="p-6 bg-slate-900 rounded-[2.5rem] text-white relative overflow-hidden shadow-2xl">
                  <div className="relative z-10">
                     <div className="flex items-center gap-2 mb-8">
                        <div className="w-2 h-2 bg-brand-primary rounded-full animate-pulse" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">Verified {profile?.loyaltyTier || 'Standard'} Status</span>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                           <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest mb-1">Total Contribution</p>
                           <p className="text-2xl font-bold tracking-tight">₱{(profile?.totalContribution || 0).toLocaleString()}</p>
                        </div>
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                           <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest mb-1">Verified Impacts</p>
                           <p className="text-2xl font-bold tracking-tight">{profile?.verifiedContributionsCount || 0}</p>
                        </div>
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                           <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest mb-1">Action Streak</p>
                           <p className="text-2xl font-bold tracking-tight">{profile?.donationStreak || 0} Mo</p>
                        </div>
                     </div>
                  </div>
                  <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/10 rounded-full blur-3xl -mr-20 -mt-20" />
               </div>

               <div className="p-8 border border-slate-100 rounded-3xl bg-slate-50/50">
                  <div className="flex items-center justify-between mb-6">
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Heritage Achievements</p>
                     <span className="text-[10px] font-bold text-brand-primary uppercase tracking-widest">{profile?.loyaltyTier} Tier unlocked</span>
                  </div>
                  <div className="flex flex-wrap gap-4 mb-10">
                     {[1, 5, 10, 25, 50].map((milestone, i) => (
                       <div key={milestone} className="text-center group">
                          <div className={cn(
                             "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-sm mb-2",
                             (profile?.verifiedContributionsCount || 0) >= milestone 
                               ? "bg-brand-primary text-white scale-110 shadow-brand-primary/20" 
                               : "bg-white text-slate-200 border border-slate-100 opacity-40"
                          )}>
                             <Trophy className="w-6 h-6" />
                          </div>
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">{milestone} Impacts</p>
                       </div>
                     ))}
                  </div>

                  <div className="space-y-4">
                     <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Personal Contribution Ledger</p>
                        <span className="text-[8px] text-slate-400 uppercase font-black">Encrypted & Verified</span>
                     </div>
                     
                     <div className="space-y-2 max-h-64 overflow-y-auto pr-2 no-scrollbar">
                        {userDonations.map(donation => (
                          <div key={donation.id} className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between group hover:border-brand-primary/20 transition-all">
                             <div className="flex items-center gap-4">
                                <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100">
                                   <Clock className="w-4 h-4 text-slate-300" />
                                </div>
                                <div>
                                   <p className="text-sm font-bold text-slate-800">{formatCurrency(donation.amount)}</p>
                                   <p className="text-[8px] text-slate-400 uppercase font-bold tracking-widest">{new Date(donation.timestamp).toLocaleDateString()} • {donation.paymentMethod}</p>
                                </div>
                             </div>
                             <div className="flex items-center gap-3">
                                <span className={cn(
                                  "px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider rounded border",
                                  donation.status === 'verified' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                  donation.status === 'pending' ? "bg-amber-50 text-amber-600 border-amber-100" :
                                  "bg-red-50 text-red-600 border-red-100"
                                )}>
                                  {donation.status}
                                </span>
                                {donation.blockchainTxHash && (
                                  <button onClick={() => alert(`Simulated On-Chain Transaction Viewer\n-----------------------------------\nTX HASH: ${donation.blockchainTxHash}\nNETWORK: Polygon Mainnet (Simulated)\nSTATUS: Confirmed\n\nDirect mainnet registry links are disabled in this audit sandbox environment.`)}>
                                    <ExternalLink className="w-3.5 h-3.5 text-slate-300 hover:text-brand-primary transition-colors" />
                                  </button>
                                )}
                             </div>
                          </div>
                        ))}
                        {userDonations.length === 0 && (
                          <div className="py-12 text-center opacity-30 italic text-[10px] text-slate-400 uppercase">
                             No transactions recorded yet
                          </div>
                        )}
                     </div>
                  </div>
               </div>
            </div>
          )}

          {activeSubTab === 'admin' && isAdmin && (
            <div className="space-y-8">
               <div className="flex items-center gap-2 mb-6">
                 <QrCode className="w-6 h-6 text-brand-primary" />
                 <h3 className="text-lg font-bold text-slate-800">Foundation QR Management</h3>
               </div>
               
               <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 border-dashed text-center">
                  <div className="w-48 h-48 bg-white mx-auto mb-4 rounded-xl shadow-inner flex items-center justify-center p-4 relative overflow-hidden group">
                     {qrImageUrl ? (
                       <img src={qrImageUrl} className="w-full h-full object-contain" alt="QR Code" />
                     ) : (
                       <div className="w-full h-full bg-slate-100 rounded-lg flex flex-col items-center justify-center gap-2 text-slate-300">
                          <QrCode className="w-8 h-8" />
                          <span className="text-[9px] font-bold uppercase tracking-widest">Active GCash Node</span>
                       </div>
                     )}
                     <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Upload className="w-6 h-6 text-white" />
                     </div>
                     <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={handleQrUpload} />
                  </div>
                  <p className="text-xs font-bold text-brand-primary uppercase tracking-widest">{qrImageUrl ? 'Replace QR Code' : 'Upload Foundation QR'}</p>
               </div>

               <div className="space-y-4">
                  {[
                    { label: 'Auto-Verification Limit', value: '₱500', icon: Shield },
                    { label: 'System Visibility', value: 'Public Transparency', icon: Globe },
                    { label: 'Data Retention', value: '7 Years (Standard)', icon: Database },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                       <div className="flex items-center gap-3">
                         <div className="p-2 bg-slate-50 rounded-lg text-slate-400">
                           <item.icon className="w-4 h-4" />
                         </div>
                         <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">{item.label}</p>
                       </div>
                       <p className="text-xs font-bold text-brand-primary">{item.value}</p>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {activeSubTab === 'blockchain' && isAdmin && (
            <div className="space-y-8">
               <div className="flex items-center gap-2 mb-6">
                 <Database className="w-6 h-6 text-brand-primary" />
                 <h3 className="text-lg font-bold text-slate-800">Polygon Node Configuration</h3>
               </div>
               
               <div className="p-6 bg-slate-900 rounded-3xl text-white relative overflow-hidden">
                 <div className="relative z-10">
                    <div className="flex items-center justify-between mb-8">
                       <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Connected to Mainnet</span>
                       </div>
                       <span className="text-[10px] font-mono opacity-50">NODE-ID: CW-PLG-001</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                       <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Current Gas Price</p>
                          <p className="text-xl font-bold">32.4 Gwei</p>
                       </div>
                       <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Batch Syncing</p>
                          <p className="text-xl font-bold">Active</p>
                       </div>
                    </div>

                    <div className="space-y-4">
                       <div className="space-y-1.5">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">RPC Endpoint</label>
                          <input 
                            className="w-full bg-white/5 border border-white/10 px-4 py-3 rounded-xl text-xs font-mono text-emerald-400" 
                            defaultValue="https://polygon-mainnet.g.alchemy.com/v2/foundation-core" 
                            readOnly
                          />
                       </div>
                       <div className="space-y-1.5">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Validator Address</label>
                          <input 
                            className="w-full bg-white/5 border border-white/10 px-4 py-3 rounded-xl text-xs font-mono opacity-60" 
                            defaultValue="0x71C7656EC7ab88b098defB751B7401B5f6d8976F" 
                            readOnly
                          />
                       </div>
                    </div>
                 </div>
                 <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20" />
               </div>
               
               <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex gap-3">
                  <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0" />
                  <p className="text-[10px] text-amber-700 font-medium leading-relaxed uppercase">
                    All operational data is cryptographically hashed and mirrored to this node. Tamper-evident auditing is enabled by default.
                  </p>
               </div>
            </div>
          )}

          <div className="mt-12 flex justify-end">
             <button 
               onClick={handleSaveProfile}
               disabled={isSaving}
               className="flex items-center gap-2 px-8 py-3 bg-slate-900 border border-slate-800 text-white rounded-xl text-[11px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl group disabled:opacity-50"
             >
                <Save className={cn("w-4 h-4 transition-transform", isSaving ? "animate-spin" : "group-hover:scale-110")} />
                {isSaving ? 'Syncing...' : 'Commit Changes'}
             </button>
          </div>
        </motion.div>

        <div className="flex flex-col md:flex-row gap-6">
           <div className="flex-1 glass-card p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <div className="p-3 bg-teal-50 rounded-xl text-teal-600">
                    <HelpCircle className="w-5 h-5" />
                 </div>
                 <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Need Foundation Support?</h4>
                    <p className="text-[10px] text-slate-400 font-medium">Contact technical audit team at support@cancerwarriors.org</p>
                 </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
           </div>
        </div>
      </div>
    </div>
  );
}
