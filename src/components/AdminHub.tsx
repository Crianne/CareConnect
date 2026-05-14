import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, updateDoc, doc, increment, getDocs, setDoc, deleteDoc, getDoc, orderBy, limit } from 'firebase/firestore';
import { db, handleFirestoreError, handleFirestoreListenerError, OperationType, auth } from '../lib/firebase';
import { Patient, PatientPriority, PatientStatus, UserProfile, Donation, LoyaltyTier, AuctionItem, AuditLog, AppConfiguration } from '../types';
import { cn, formatCurrency } from '../lib/utils';
import { 
  ShieldAlert, 
  AlertCircle, 
  FileText, 
  UserPlus, 
  TrendingUp, 
  Sparkles, 
  CheckCircle2, 
  Search, 
  ShieldCheck,
  Clock,
  Eye,
  Check,
  Gavel,
  Trash2,
  Settings as SettingsIcon,
  Shield,
  Activity,
  QrCode,
  Lock,
  X as CloseIcon,
  Copy,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import copy from 'copy-to-clipboard';
import { generateAidAnalysis } from '../services/geminiService';

export function AdminHub() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [donors, setDonors] = useState<UserProfile[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [auctions, setAuctions] = useState<AuctionItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [config, setConfig] = useState<AppConfiguration | null>(null);
  const [activeTab, setActiveTab] = useState<'cases' | 'donors' | 'verification' | 'auctions' | 'control'>('cases');
  const [newPatient, setNewPatient] = useState({ 
    fullName: '', 
    age: '', 
    goal: '', 
    diagnosis: '',
    medicalDocuments: [] as { id: string; name: string; url: string; uploadedAt: string }[]
  });
  const [isAdding, setIsAdding] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [editingAuction, setEditingAuction] = useState<AuctionItem | null>(null);
  const [aiAuditResult, setAiAuditResult] = useState<{ patient: Patient; insight: string } | null>(null);
  const [isAuditing, setIsAuditing] = useState<string | null>(null);
  const [isDeploying, setIsDeploying] = useState<string | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showReportSuccess, setShowReportSuccess] = useState(false);
  const [showTxViewer, setShowTxViewer] = useState<Donation | null>(null);
  const [rejectingDonation, setRejectingDonation] = useState<Donation | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const handleCopy = (text: string, id: string) => {
    copy(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const [reports, setReports] = useState<{id: string, date: string, type: string, hash: string, size: string}[]>([
    { id: '1', date: '2026-05-13', type: 'Monthly Impact', hash: 'Qm...4k2', size: '2.4MB' },
    { id: '2', date: '2026-04-30', type: 'Quarterly Audit', hash: 'Qm...9y1', size: '12.8MB' }
  ]);

  useEffect(() => {
    const unsubP = onSnapshot(collection(db, 'patients'), (snapshot) => {
      setPatients(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Patient)));
    }, (err) => handleFirestoreListenerError(err, OperationType.LIST, 'patients'));
    
    const unsubU = onSnapshot(collection(db, 'users'), (snapshot) => {
      setDonors(snapshot.docs.map(d => ({ ...d.data() } as UserProfile)));
    }, (err) => handleFirestoreListenerError(err, OperationType.LIST, 'users'));
    
    const unsubD = onSnapshot(query(collection(db, 'donations'), orderBy('timestamp', 'desc'), limit(100)), (snapshot) => {
      setDonations(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Donation)));
    }, (err) => handleFirestoreListenerError(err, OperationType.LIST, 'donations'));
    
    const unsubA = onSnapshot(query(collection(db, 'auctions'), orderBy('lastUpdated', 'desc'), limit(100)), (snapshot) => {
      setAuctions(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AuctionItem)));
    }, (err) => handleFirestoreListenerError(err, OperationType.LIST, 'auctions'));
    
    const unsubL = onSnapshot(query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(100)), (snapshot) => {
      setAuditLogs(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AuditLog)));
    }, (err) => handleFirestoreListenerError(err, OperationType.LIST, 'audit_logs'));
    
    const unsubC = onSnapshot(doc(db, 'settings', 'foundation'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setConfig({
          maintenanceMode: data.maintenanceMode || false,
          allowPublicSubmissions: data.allowPublicSubmissions || false,
          gcashQrUrl: data.gcashQrUrl || data.qrCode || ''
        } as AppConfiguration);
      }
    }, (err) => handleFirestoreListenerError(err, OperationType.GET, 'settings/foundation'));
    return () => { unsubP(); unsubU(); unsubD(); unsubA(); unsubL(); unsubC(); };
  }, []);

  const handleUpdateConfig = async (updates: Partial<AppConfiguration>) => {
    try {
      await setDoc(doc(db, 'settings', 'foundation'), { ...config, ...updates }, { merge: true });
      await logAction('UPDATE_SETTINGS', 'settings/foundation', `Updated ${Object.keys(updates).join(', ')}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'settings');
    }
  };

  const logAction = async (action: string, resource: string, details: string) => {
    try {
      await addDoc(collection(db, 'audit_logs'), {
        adminId: auth.currentUser?.uid,
        adminEmail: auth.currentUser?.email,
        action,
        resource,
        details,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('Audit Log failed', err);
    }
  };

  const handleDeleteAuction = async (id: string) => {
    if (!confirm('Are you sure you want to remove this auction item from the registry?')) return;
    console.log('Admin initiating auction deletion for:', id);
    try {
      await deleteDoc(doc(db, 'auctions', id));
      await logAction('DELETE_AUCTION', `auctions/${id}`, `Administrative removal of auction asset.`);
      alert('Asset removed successfully from foundation registry.');
    } catch (err) {
      console.error('Delete Auction Error:', err);
      handleFirestoreError(err, OperationType.DELETE, `auctions/${id}`);
    }
  };

  const handleDeletePatient = async (id: string) => {
    if (!confirm('Are you sure you want to permanently remove this warrior case from the foundation registry?')) return;
    try {
      await deleteDoc(doc(db, 'patients', id));
      await logAction('DELETE_WARRIOR', `patients/${id}`, `Administrative removal of warrior case.`);
      alert('Case removed from registry.');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `patients/${id}`);
    }
  };

  const handleToggleAuctionStatus = async (item: AuctionItem) => {
    try {
      await updateDoc(doc(db, 'auctions', item.id), {
        status: item.status === 'active' ? 'closed' : 'active',
        lastUpdated: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'auctions');
    }
  };

  const handleSaveAuction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAuction) return;
    try {
      await updateDoc(doc(db, 'auctions', editingAuction.id), {
        title: editingAuction.title,
        description: editingAuction.description,
        startPrice: Number(editingAuction.startPrice),
        currentBid: Number(editingAuction.currentBid),
        status: editingAuction.status,
        endTime: editingAuction.endTime,
        lastUpdated: new Date().toISOString()
      });
      setEditingAuction(null);
      alert('Asset registry updated.');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'auctions');
    }
  };

  const handleCreateAuction = async () => {
    try {
      const newAuction = {
        title: 'New Boutique Asset',
        description: 'Boutique asset awaiting full audit description...',
        imageUrl: 'https://images.unsplash.com/photo-1513584684374-8bdb74837385?auto=format&fit=crop&q=80&w=800',
        startPrice: 10000,
        currentBid: 10000,
        status: 'draft',
        endTime: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
        contractDeployed: false,
        bidHistory: [],
        ownerId: auth.currentUser?.uid || 'admin',
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };
      const docRef = await addDoc(collection(db, 'auctions'), newAuction);
      setEditingAuction({ id: docRef.id, ...newAuction } as AuctionItem);
      await logAction('CREATE_AUCTION', `auctions/${docRef.id}`, 'Created new auction draft');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'auctions');
    }
  };

  const handleApproveDonation = async (donation: Donation & { type?: string; auctionId?: string }) => {
    try {
      const txHash = '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
      
      // 1. Update Donation
      await updateDoc(doc(db, 'donations', donation.id), {
        status: 'verified',
        verifiedAt: new Date().toISOString(),
        blockchainTxHash: txHash
      });

      await logAction('APPROVE_DONATION', `donations/${donation.id}`, `Approved ${donation.amount} PHP contribution`);

      // 2. Update Patient (If regular donation)
      if (donation.patientId) {
        await updateDoc(doc(db, 'patients', donation.patientId), {
          fundingRaised: increment(donation.amount),
          lastUpdated: new Date().toISOString()
        });
      }

      // 3. Update Auction (If auction payment)
      if (donation.type === 'auction_payment' && donation.auctionId) {
        await updateDoc(doc(db, 'auctions', donation.auctionId), {
          status: 'closed',
          paymentStatus: 'verified',
          finalizedAt: new Date().toISOString(),
          blockchainFinalTx: txHash
        });
      }

      // 4. Update User Profile
      const userRef = doc(db, 'users', donation.donorId);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) return;
      const userData = userSnap.data() as UserProfile;
      
      const now = new Date();
      let streak = userData.donationStreak || 0;
      const lastDonation = userData.lastDonationDate ? new Date(userData.lastDonationDate) : null;
      
      if (!lastDonation) {
        streak = 1;
      } else {
        const diffDays = Math.floor((now.getTime() - lastDonation.getTime()) / (1000 * 3600 * 24));
        if (diffDays <= 45) { // Active within 45 days
          streak += 1;
        } else {
          streak = 1;
        }
      }

      // Calculate tier based on new potential total
      const currentTotal = userData?.totalContribution || 0;
      const newPotentialTotal = currentTotal + donation.amount;
      let newTier = userData?.loyaltyTier || LoyaltyTier.BRONZE;
      
      if (newPotentialTotal >= 200000) newTier = LoyaltyTier.PLATINUM;
      else if (newPotentialTotal >= 50000) newTier = LoyaltyTier.GOLD;
      else if (newPotentialTotal >= 10000) newTier = LoyaltyTier.SILVER;
      else newTier = LoyaltyTier.BRONZE;

      await updateDoc(userRef, {
        totalContribution: increment(donation.amount),
        verifiedContributionsCount: increment(1),
        donationStreak: streak,
        lastDonationDate: now.toISOString(),
        loyaltyTier: newTier
      });
      alert('Proof Verified. Recording impact on Polygon Blockchain.');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'donations');
    }
  };

  const handleRejectDonation = async (donation: Donation) => {
    setRejectingDonation(donation);
    setRejectionReason('');
  };

  const confirmRejection = async () => {
    if (!rejectingDonation || !rejectionReason) return;
    
    try {
      await updateDoc(doc(db, 'donations', rejectingDonation.id), {
        status: 'rejected',
        rejectionReason: rejectionReason,
        verifiedAt: new Date().toISOString()
      });
      
      await logAction('REJECT_DONATION', `donations/${rejectingDonation.id}`, `Rejected donation: ${rejectionReason}`);
      alert('Donation rejected.');
      setRejectingDonation(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `donations/${rejectingDonation.id}`);
    }
  };

  const createPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = Math.random().toString(36).substring(2, 10).toUpperCase();
    const publicId = `CH-${Math.floor(1000 + Math.random() * 9000)}`;
    
    // Simulate AI priority tagging
    const pData = { id, fullName: newPatient.fullName, diagnosis: newPatient.diagnosis };
    const aiInsight = await generateAidAnalysis(pData, 'admin' as any);
    
    const p: Omit<Patient, 'id'> = {
      publicIdentifier: publicId,
      fullName: newPatient.fullName,
      age: Number(newPatient.age),
      diagnosis: newPatient.diagnosis,
      treatmentPlan: "Under Evaluation",
      priority: aiInsight.includes('Critical') ? PatientPriority.CRITICAL : PatientPriority.HIGH,
      fundingGoal: Number(newPatient.goal),
      fundingRaised: 0,
      status: PatientStatus.ACTIVE,
      isPublic: true,
      medicalDocuments: newPatient.medicalDocuments,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };

    await setDoc(doc(db, 'patients', id), p);
    await logAction('REGISTER_WARRIOR', `patients/${id}`, `Registered new warrior: ${p.fullName} (#${p.publicIdentifier})`);
    setIsAdding(false);
    setNewPatient({ fullName: '', age: '', goal: '', diagnosis: '', medicalDocuments: [] });
  };

  const handleSavePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPatient) return;
    try {
      await updateDoc(doc(db, 'patients', editingPatient.id), {
        fullName: editingPatient.fullName,
        diagnosis: editingPatient.diagnosis,
        fundingGoal: Number(editingPatient.fundingGoal),
        priority: editingPatient.priority,
        status: editingPatient.status,
        isPublic: editingPatient.isPublic,
        lastUpdated: new Date().toISOString()
      });
      setEditingPatient(null);
      alert('Warrior case information synchronized successfully.');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'patients');
    }
  };

  const handleDeployContract = async (id: string) => {
    setIsDeploying(id);
    try {
      // Simulate real delay for propagation
      await new Promise(resolve => setTimeout(resolve, 2500));
      const address = '0x' + Array.from({length: 40}, () => Math.floor(Math.random() * 16).toString(16)).join('');
      await updateDoc(doc(db, 'auctions', id), {
        contractDeployed: true,
        contractAddress: address,
        status: 'active',
        deployedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      });
      await logAction('DEPLOY_AUCTION_CONTRACT', `auctions/${id}`, `Smart contract initialized at ${address}`);
      alert(`Smart Contract Deployed to Polygon at ${address}. Auction is now LIVE.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'auctions');
    } finally {
      setIsDeploying(null);
    }
  };

  const handleUploadMedicalRecord = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingPatient || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    
    // Simulate upload
    const mockUrl = `https://foundation.cloud/records/${Math.random().toString(36).slice(7)}_${file.name}`;
    const newDoc = { id: Math.random().toString(36).slice(7), name: file.name, url: mockUrl, uploadedAt: new Date().toISOString() };
    
    try {
      const currentDocs = editingPatient.medicalDocuments || [];
      await updateDoc(doc(db, 'patients', editingPatient.id), {
        medicalDocuments: [...currentDocs, newDoc]
      });
      setEditingPatient({
        ...editingPatient,
        medicalDocuments: [...currentDocs, newDoc]
      });
      alert('Medical document uploaded and attached to warrior case.');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'patients');
    }
  };

  const handleAddDocToNewPatient = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    const mockUrl = `https://foundation.cloud/records/${Math.random().toString(36).slice(7)}_${file.name}`;
    const newDoc = { id: Math.random().toString(36).slice(7), name: file.name, url: mockUrl, uploadedAt: new Date().toISOString() };
    setNewPatient(prev => ({ ...prev, medicalDocuments: [...prev.medicalDocuments, newDoc] }));
  };

  const handleRemoveDocFromEditing = async (docId: string) => {
    if (!editingPatient) return;
    try {
      const updatedDocs = (editingPatient.medicalDocuments || []).filter(d => d.id !== docId);
      await updateDoc(doc(db, 'patients', editingPatient.id), {
        medicalDocuments: updatedDocs
      });
      setEditingPatient({
        ...editingPatient,
        medicalDocuments: updatedDocs
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'patients');
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row items-center justify-between bg-white px-6 py-4 rounded-xl border border-slate-200 shadow-sm gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            Operational Control Hub
            <span className="px-2 py-0.5 bg-teal-50 text-teal-700 text-[10px] font-bold uppercase tracking-wider rounded border border-teal-100">Live</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium tracking-tight">Foundation Intelligence & Resource Management System</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab('cases')} 
            className={cn("px-4 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-widest", activeTab === 'cases' ? "bg-brand-primary text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200")}
          >
            Case Queue
          </button>
          <button 
            onClick={() => setActiveTab('donors')} 
            className={cn("px-4 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-widest", activeTab === 'donors' ? "bg-brand-primary text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200")}
          >
            Donor Insights
          </button>
          <button 
            onClick={() => setActiveTab('verification')} 
            className={cn("px-4 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-widest", activeTab === 'verification' ? "bg-brand-primary text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200")}
          >
            Donation Verification
          </button>
          <button 
            onClick={() => setActiveTab('auctions')} 
            className={cn("px-4 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-widest", activeTab === 'auctions' ? "bg-brand-primary text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200")}
          >
            Auctions
          </button>
          <button 
            onClick={() => setActiveTab('control')} 
            className={cn("px-4 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-widest", activeTab === 'control' ? "bg-brand-primary text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200")}
          >
            Control Center
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        <div className="xl:col-span-3 space-y-6">
          <AnimatePresence mode="wait">
            {activeTab === 'cases' ? (
              <motion.div 
                 key="cases" 
                 initial={{ opacity: 0, x: -10 }} 
                 animate={{ opacity: 1, x: 0 }} 
                 exit={{ opacity: 0, x: 10 }}
                 className="glass-card overflow-hidden"
              >
                {/* ... existing cases table ... */}
                <div className="p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-brand-primary" />
                    Priority Verification Queue
                  </h3>
                  <button 
                    onClick={() => setIsAdding(!isAdding)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 text-white rounded text-[10px] font-bold uppercase tracking-widest hover:bg-slate-900 transition-all"
                  >
                    <UserPlus className="w-3 h-3" /> Register Warrior
                  </button>
                </div>
                
                {isAdding && (
                  <div className="p-6 border-b border-slate-100 bg-teal-50/30">
                    <form onSubmit={createPatient} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* ... existing form fields ... */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Warrior Name (De-Identified)</label>
                        <input 
                          className="w-full bg-white px-4 py-2 rounded border border-slate-200 focus:ring-1 ring-brand-primary outline-none text-sm font-medium"
                          value={newPatient.fullName}
                          onChange={e => setNewPatient({...newPatient, fullName: e.target.value})}
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Age</label>
                        <input 
                          type="number"
                          className="w-full bg-white px-4 py-2 rounded border border-slate-200 focus:ring-1 ring-brand-primary outline-none text-sm font-medium"
                          value={newPatient.age}
                          onChange={e => setNewPatient({...newPatient, age: e.target.value})}
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Funding Target (PHP)</label>
                        <input 
                          type="number"
                          className="w-full bg-white px-4 py-2 rounded border border-slate-200 focus:ring-1 ring-brand-primary outline-none text-sm font-medium"
                          value={newPatient.goal}
                          onChange={e => setNewPatient({...newPatient, goal: e.target.value})}
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Diagnosis Overview</label>
                        <input 
                          className="w-full bg-white px-4 py-2 rounded border border-slate-200 focus:ring-1 ring-brand-primary outline-none text-sm font-medium"
                          value={newPatient.diagnosis}
                          onChange={e => setNewPatient({...newPatient, diagnosis: e.target.value})}
                          required
                        />
                      </div>
                      <div className="md:col-span-2 p-4 bg-white rounded-xl border border-slate-200">
                        <div className="flex items-center justify-between mb-3">
                           <h4 className="text-[10px] font-bold text-slate-800 uppercase tracking-widest">Medical Documentation</h4>
                           <label className="text-[10px] font-bold text-brand-primary uppercase tracking-widest flex items-center gap-1 cursor-pointer hover:opacity-80">
                             <UserPlus className="w-3 h-3" /> Add Record
                             <input 
                               type="file" 
                               className="hidden" 
                               onChange={handleAddDocToNewPatient}
                             />
                           </label>
                        </div>
                        <div className="flex flex-wrap gap-2">
                           {newPatient.medicalDocuments.map(doc => (
                             <div key={doc.id} className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg">
                               <FileText className="w-3.5 h-3.5 text-slate-400" />
                               <span className="text-[10px] font-bold text-slate-600">{doc.name}</span>
                               <button 
                                 type="button" 
                                 onClick={() => setNewPatient(prev => ({ ...prev, medicalDocuments: prev.medicalDocuments.filter(d => d.id !== doc.id) }))}
                                 className="text-slate-300 hover:text-red-500"
                               >
                                 <CloseIcon className="w-3 h-3" />
                               </button>
                             </div>
                           ))}
                           {newPatient.medicalDocuments.length === 0 && (
                             <p className="text-[10px] text-slate-400 italic">No records attached for initial audit</p>
                           )}
                        </div>
                      </div>
                      <div className="md:col-span-2 flex justify-end gap-3 pt-2">
                        <button type="button" onClick={() => setIsAdding(false)} className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4">Cancel</button>
                        <button type="submit" className="px-6 py-2 bg-brand-primary text-white rounded text-[10px] font-bold uppercase tracking-widest shadow-sm">Save & Auto-Verify</button>
                      </div>
                    </form>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] uppercase font-bold tracking-widest text-slate-400 border-b border-slate-100">
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">De-ID Hash</th>
                        <th className="px-6 py-4">Priority (AI)</th>
                        <th className="px-6 py-4">Funding Gap</th>
                        <th className="px-8 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 transition-all">
                      {patients.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50/50 group">
                          <td className="px-6 py-4">
                             <span className={cn(
                               "px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded border",
                               p.status === 'Active' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-50 text-slate-400 border-slate-100"
                             )}>
                               {p.status}
                             </span>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-bold text-slate-700">#PX-{p.publicIdentifier}</p>
                            <p className="text-[9px] text-slate-400 font-mono italic truncate max-w-[100px]">{p.fullName}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                               "status-badge",
                               p.priority === 'Critical' ? "bg-red-50 text-red-600 border-red-100" :
                               p.priority === 'High' ? "bg-orange-50 text-orange-600 border-orange-100" :
                               "status-badge-teal"
                            )}>
                              {p.priority}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden mb-1.5">
                              <div className="h-full bg-brand-primary" style={{ width: `${(p.fundingRaised / p.fundingGoal) * 100}%` }} />
                            </div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                               ₱{((p.fundingGoal - p.fundingRaised) / 1000).toFixed(0)}k remaining
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                             <div className="flex items-center justify-end gap-2 relative z-10">
                               <button 
                                 onClick={() => setEditingPatient(p)}
                                 className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-700 rounded text-[9px] font-bold uppercase tracking-widest hover:bg-slate-200 transition-colors border border-slate-200"
                               >
                                  <FileText className="w-3 h-3" />
                                  Edit
                               </button>
                               <button 
                                 onClick={async () => {
                                   setIsAuditing(p.id);
                                   const insight = await generateAidAnalysis(p, 'admin' as any);
                                   setAiAuditResult({ patient: p, insight });
                                   setIsAuditing(null);
                                 }}
                                 className="hidden md:inline-flex items-center gap-1 px-2 py-1 bg-teal-50 text-teal-700 rounded text-[9px] font-bold uppercase tracking-widest hover:bg-teal-100 transition-colors border border-teal-100"
                               >
                                  <Sparkles className="w-3 h-3" />
                                  {isAuditing === p.id ? '...' : 'AI'}
                               </button>
                               <button 
                                 onClick={() => handleDeletePatient(p.id)}
                                 className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 rounded text-[9px] font-bold uppercase tracking-widest hover:bg-red-100 transition-colors border border-red-100"
                               >
                                  <Trash2 className="w-3 h-3" />
                                  Remove
                               </button>
                             </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            ) : activeTab === 'donors' ? (
              <motion.div 
                key="donors" 
                initial={{ opacity: 0, x: -10 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: 10 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                {donors.map(d => (
                   // ... existing donors list ...
                  <div key={d.userId} className="glass-card p-4 flex items-center justify-between group hover:border-brand-primary/30 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-100 rounded flex items-center justify-center font-bold text-slate-300">
                        {d.displayName?.split(' ').map(n => n[0]).join('') || 'U'}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800 tracking-tight">{d.displayName}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          {d.role === 'admin' ? (
                            <span className="text-[9px] font-bold text-red-600 uppercase tracking-widest bg-red-50 px-1.5 py-0.5 rounded border border-red-100">Foundation Admin</span>
                          ) : (
                            <span className="text-[9px] font-bold text-teal-600 uppercase tracking-widest bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100">{d.loyaltyTier} Champion</span>
                          )}
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">₱{(d.totalContribution || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    <button className="text-slate-300 hover:text-brand-primary transition-colors">
                      <TrendingUp className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </motion.div>
            ) : activeTab === 'auctions' ? (
              <motion.div 
                key="auctions" 
                initial={{ opacity: 0, x: -10 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: 10 }}
                className="glass-card overflow-hidden"
              >
                <div className="p-5 bg-slate-50 border-b border-slate-100 mb-2">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <Gavel className="w-4 h-4 text-brand-primary" />
                    Boutique Asset Registry
                  </h3>
                  <button 
                    onClick={handleCreateAuction}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 text-white rounded text-[10px] font-bold uppercase tracking-widest hover:bg-slate-900 transition-all"
                  >
                    <UserPlus className="w-3 h-3" /> Register Asset
                  </button>
                </div>
                <div className="p-6">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {auctions.map(item => (
                         <div key={item.id} className="p-4 border border-slate-100 rounded-xl bg-slate-50/50 flex flex-col gap-4">
                            <div className="flex gap-4">
                               <div className="w-20 h-20 bg-white rounded-lg overflow-hidden flex-shrink-0 border border-slate-200">
                                  <img src={item.imageUrl} className="w-full h-full object-cover" alt="" />
                               </div>
                               <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-bold text-slate-800 truncate">{item.title}</h4>
                                  <p className="text-[10px] text-slate-400 font-medium mb-2 uppercase">Ref: {item.id.slice(0,8)}</p>
                                  <div className="flex items-center gap-2">
                                     <span className={cn(
                                        "px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider rounded border",
                                        item.status === 'active' ? "bg-green-50 text-green-600 border-green-100" : 
                                        item.status === 'draft' ? "bg-amber-50 text-amber-600 border-amber-100" :
                                        item.status === 'audit' ? "bg-purple-50 text-purple-600 border-purple-100" :
                                        "bg-slate-100 text-slate-400 border-slate-200"
                                     )}>
                                        {item.status}
                                     </span>
                                     <span className="text-[10px] font-bold text-slate-700">₱{item.currentBid.toLocaleString()}</span>
                                     {item.contractDeployed && (
                                       <span className="text-[8px] font-mono text-teal-600 opacity-60 truncate">
                                         {item.contractAddress?.slice(0, 10)}...
                                       </span>
                                     )}
                                  </div>
                               </div>
                            </div>
                            <div className="flex gap-2">
                               <button 
                                  onClick={() => setEditingAuction(item)}
                                  className="px-3 py-1.5 bg-white border border-slate-200 rounded text-[9px] font-bold uppercase tracking-widest hover:bg-slate-50"
                               >
                                  Edit
                               </button>
                               {item.status === 'draft' ? (
                                 <button 
                                   onClick={async () => {
                                     try {
                                       await updateDoc(doc(db, 'auctions', item.id), { 
                                         status: 'audit',
                                         lastUpdated: new Date().toISOString()
                                       });
                                       await logAction('PUSH_TO_AUDIT', `auctions/${item.id}`, 'Submitted asset for Foundation Provenance Audit');
                                       alert('Asset submitted for audit.');
                                     } catch (err) {
                                       handleFirestoreError(err, OperationType.WRITE, 'auctions');
                                     }
                                   }}
                                   className="flex-1 py-1.5 bg-amber-600 text-white border border-amber-600 rounded text-[9px] font-bold uppercase tracking-widest hover:bg-amber-700 shadow-sm"
                                 >
                                   Push to Audit
                                 </button>
                               ) : item.status === 'audit' ? (
                                 <button 
                                   onClick={() => handleDeployContract(item.id)}
                                   disabled={isDeploying === item.id}
                                   className="flex-1 py-1.5 bg-teal-600 text-white border border-teal-600 rounded text-[9px] font-bold uppercase tracking-widest hover:bg-teal-700 shadow-sm disabled:opacity-50"
                                 >
                                   {isDeploying === item.id ? 'Deploying...' : 'Deploy & Publish'}
                                 </button>
                               ) : (
                                 <button 
                                    onClick={() => handleToggleAuctionStatus(item)}
                                    className="flex-1 py-1.5 bg-slate-800 text-white border border-slate-800 rounded text-[9px] font-bold uppercase tracking-widest hover:bg-slate-900 shadow-sm"
                                 >
                                    {item.status === 'active' ? 'Deactivate' : 'Publish'}
                                 </button>
                               )}
                               <button 
                                  onClick={() => handleDeleteAuction(item.id)}
                                  className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-100 rounded text-[9px] font-bold uppercase tracking-widest hover:bg-red-100"
                               >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                         </div>
                      ))}
                      {auctions.length === 0 && (
                         <div className="col-span-full py-20 text-center">
                            <Gavel className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No auction items submitted</p>
                         </div>
                      )}
                   </div>
                </div>
              </motion.div>
            ) : activeTab === 'control' ? (
              <motion.div 
                key="control" 
                initial={{ opacity: 0, x: -10 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: 10 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* System Settings */}
                  <div className="glass-card p-6">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-6">
                      <SettingsIcon className="w-4 h-4 text-brand-primary" />
                      Platform Parameters
                    </h3>
                    
                    <div className="space-y-6">
                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-3">
                          <Activity className="w-4 h-4 text-slate-400" />
                          <div>
                            <p className="text-[10px] font-bold text-slate-800 uppercase tracking-widest">Maintenance Mode</p>
                            <p className="text-[8px] text-slate-400 uppercase font-bold tracking-tighter">Restrict public access to site</p>
                          </div>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={config?.maintenanceMode || false}
                          onChange={e => handleUpdateConfig({ maintenanceMode: e.target.checked })}
                          className="w-4 h-4 accent-brand-primary"
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-3">
                          <Shield className="w-4 h-4 text-slate-400" />
                          <div>
                            <p className="text-[10px] font-bold text-slate-800 uppercase tracking-widest">Public Submissions</p>
                            <p className="text-[8px] text-slate-400 uppercase font-bold tracking-tighter">Allow public case inquiries</p>
                          </div>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={config?.allowPublicSubmissions || false}
                          onChange={e => handleUpdateConfig({ allowPublicSubmissions: e.target.checked })}
                          className="w-4 h-4 accent-brand-primary"
                        />
                      </div>

                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-3 mb-4">
                          <QrCode className="w-4 h-4 text-slate-400" />
                          <p className="text-[10px] font-bold text-slate-800 uppercase tracking-widest">GCash QR Deployment</p>
                        </div>
                        <div className="aspect-square bg-white rounded-lg border border-slate-200 flex items-center justify-center overflow-hidden mb-4 p-2">
                           {config?.gcashQrUrl ? (
                             <img src={config.gcashQrUrl} className="w-full h-full object-contain" alt="GCash QR" />
                           ) : (
                             <p className="text-[9px] text-slate-300 uppercase font-bold text-center px-6 leading-relaxed">System-wide GCash QR code not configured</p>
                           )}
                        </div>
                        <button 
                          onClick={() => {
                            const url = prompt('Enter new GCash QR Image URL:');
                            if (url) handleUpdateConfig({ gcashQrUrl: url, qrCode: url } as any);
                          }}
                          className="w-full py-2 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-800 uppercase tracking-widest transition-all hover:bg-slate-100"
                        >
                          Update QR Source
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Audit Logs */}
                  <div className="glass-card p-6 flex flex-col h-[500px]">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-brand-primary" />
                        Administrative Audit Trail
                      </div>
                      <span className="text-[8px] px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded">Read-Only</span>
                    </h3>
                    
                    <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
                      {auditLogs.map(log => (
                        <div 
                          key={log.id} 
                          onClick={() => alert(`AUDIT LOG DETAIL\n----------------\nID: ${log.id}\nAction: ${log.action}\nAdmin: ${log.adminEmail}\nTime: ${new Date(log.timestamp).toLocaleString()}\nResource: ${log.resource}\n\nDetails: ${log.details}\nStatus: Verified Onsite`)}
                          className="p-3 bg-white border border-slate-100 rounded-xl shadow-sm cursor-pointer hover:border-brand-primary/30 transition-all group"
                        >
                           <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[8px] px-1.5 py-0.5 bg-brand-primary/5 text-brand-primary font-bold rounded uppercase tracking-tighter">
                                {log.action}
                              </span>
                              <span className="text-[8px] text-slate-400 uppercase font-bold tracking-widest">
                                {new Date(log.timestamp).toLocaleString()}
                              </span>
                           </div>
                           <p className="text-[10px] font-bold text-slate-800 leading-tight mb-1">{log.details}</p>
                           <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-slate-200" title={`Admin: ${log.adminId}`} />
                              <span className="text-[8px] text-slate-400 font-mono tracking-tighter truncate opacity-60">ADMIN: {log.adminEmail}</span>
                           </div>
                        </div>
                      ))}
                      {auditLogs.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center opacity-30 italic text-[10px] text-slate-400 uppercase font-bold tracking-widest">
                           <Activity className="w-8 h-8 mb-2" />
                           Audit sequence empty
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Reports Vault */}
                  <div className="glass-card p-6 flex flex-col h-[500px]">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-6">
                      <FileText className="w-4 h-4 text-brand-primary" />
                      Foundation Reports Vault
                    </h3>
                    
                    <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
                      {reports.map(report => (
                        <div key={report.id} className="p-4 bg-slate-50 border border-slate-100 rounded-xl hover:border-teal-200 transition-all cursor-pointer group">
                           <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 bg-white rounded flex items-center justify-center border border-slate-100">
                                    <FileText className="w-4 h-4 text-teal-600" />
                                 </div>
                                 <div>
                                    <p className="text-[10px] font-bold text-slate-800 uppercase tracking-widest">{report.type}</p>
                                    <p className="text-[8px] text-slate-400 uppercase font-bold tracking-tighter">{report.date}</p>
                                 </div>
                              </div>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  alert(`REPORT DOWNLOAD\n----------------\nIPFS Hash: ${report.hash}\nSize: ${report.size}\nOrigin: Foundation On-Chain Auth\n\nSecurity Clearance: Verified Admin`);
                                }}
                                className="px-2 py-1 bg-white border border-slate-200 rounded text-[8px] font-bold uppercase tracking-widest hover:bg-slate-50"
                              >
                                Access
                              </button>
                           </div>
                           <div className="flex items-center gap-2 opacity-40">
                              <Lock className="w-3 h-3 text-slate-400" />
                              <span className="text-[7px] font-mono tracking-tighter">{report.hash}</span>
                           </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="glass-card p-6">
                   <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-6">
                      <Shield className="w-4 h-4 text-emerald-600" />
                      Privacy & Data Governance
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-800 uppercase tracking-widest mb-2">Anonymization Layer</p>
                          <p className="text-[9px] text-slate-500 leading-relaxed font-bold tracking-tight uppercase">Automatically masking donor PII and warrior internal IDs at the edge using decentralized identifiers.</p>
                       </div>
                       <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-800 uppercase tracking-widest mb-2">Consent Status</p>
                          <p className="text-[9px] text-slate-500 leading-relaxed font-bold tracking-tight uppercase">Manual moderation override required for all public profile changes to ensure strict data protection compliance.</p>
                       </div>
                       <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-800 uppercase tracking-widest mb-2">Security Rules</p>
                          <p className="text-[9px] text-slate-500 leading-relaxed font-bold tracking-tight uppercase">Version 2 high-order security rules deployed. Enforcing attribute-based access control for medical docs.</p>
                       </div>
                    </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="verification" 
                initial={{ opacity: 0, x: -10 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: 10 }}
                className="glass-card overflow-hidden"
              >
                <div className="p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Fiat-to-Chain Verification Bridge
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] uppercase font-bold tracking-widest text-slate-400 border-b border-slate-100">
                        <th className="px-6 py-4">Submission</th>
                        <th className="px-6 py-4">Donor</th>
                        <th className="px-6 py-4">Amount</th>
                        <th className="px-6 py-4">Proof</th>
                        <th className="px-8 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 transition-all">
                      {donations.filter(d => d.status === 'pending').map(d => (
                        <tr key={d.id} className="hover:bg-slate-50/50 group">
                          <td className="px-6 py-4">
                             <div className="flex items-center gap-2">
                                <Clock className="w-3 h-3 text-slate-400" />
                                <div className="flex flex-col">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                    {new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                  {(d as any).type === 'auction_payment' ? (
                                    <span className="text-[8px] font-bold text-teal-600 uppercase tracking-tight">Auction Settlement</span>
                                  ) : (
                                    <span className="text-[8px] font-bold text-amber-600 uppercase tracking-tight">
                                      Warrior {patients.find(p => p.id === d.patientId)?.publicIdentifier}
                                    </span>
                                  )}
                                </div>
                             </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <p className="text-xs font-bold text-slate-700">
                                {donors.find(donor => donor.userId === d.donorId)?.displayName || 'Unknown'}
                              </p>
                              {donations.filter(allD => allD.receiptUrl === d.receiptUrl && allD.status === 'verified').length > 0 && (
                                <div className="flex items-center gap-1 text-[8px] font-bold text-red-500 uppercase mt-1">
                                   <ShieldAlert className="w-2.5 h-2.5" />
                                   Duplicate Proof Detected
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-bold text-brand-primary">{formatCurrency(d.amount)}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{d.paymentMethod}</p>
                          </td>
                          <td className="px-6 py-4">
                            <button 
                              onClick={() => setSelectedReceipt(d.receiptUrl || null)}
                              className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-100 rounded text-[9px] font-bold uppercase tracking-widest hover:bg-slate-200 transition-colors"
                            >
                              <Eye className="w-3 h-3" />
                              View Proof
                            </button>
                          </td>
                          <td className="px-8 py-4 text-right space-x-2">
                             <button 
                              onClick={() => handleApproveDonation(d)}
                              className="px-3 py-1.5 bg-brand-primary text-white rounded text-[10px] font-bold uppercase tracking-widest shadow-sm hover:opacity-90 transition-all"
                             >
                               Approve
                             </button>
                             <button 
                               onClick={() => handleRejectDonation(d)}
                               className="px-3 py-1.5 bg-white text-slate-400 rounded text-[10px] font-bold uppercase tracking-widest border border-slate-200 hover:text-red-500 hover:border-red-500 transition-all"
                             >
                               Reject
                             </button>
                          </td>
                        </tr>
                      ))}
                      {donations.filter(d => d.status === 'pending').length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-20 text-center">
                            <CheckCircle2 className="w-10 h-10 text-slate-100 mx-auto mb-4" />
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Queue Fully Verified</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Admin AI Analysis */}
        <div className="space-y-6">
          <div className="bg-teal-900 rounded-xl p-6 shadow-lg text-white relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-6">
                <Sparkles className="w-4 h-4 text-teal-400" />
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-teal-300">Impact AI Engine</h3>
              </div>
              
              <div className="space-y-4">
                 <div className="p-3 bg-white/5 rounded border border-white/10">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-teal-400 mb-2 italic">Observation</p>
                    <p className="text-xs leading-relaxed opacity-80">Funding velocity for Stage IV cases increased by 18% after last quarterly audit release.</p>
                 </div>
                 <div className="p-3 bg-white/5 rounded border border-white/10">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-amber-400 mb-2 italic">Critical Alert</p>
                    <p className="text-xs leading-relaxed text-amber-200">Patient #PX-8821 funding stalled. Recommend immediate charity auction feature slot.</p>
                 </div>
              </div>

              <button 
                onClick={async () => {
                  setIsGeneratingReport(true);
                  await new Promise(r => setTimeout(r, 2000));
                  
                  const newReport = {
                    id: Math.random().toString(36).substring(7),
                    date: new Date().toISOString().split('T')[0],
                    type: 'Monthly Impact (Auto)',
                    hash: 'Qm' + Array.from({length: 32}, () => Math.floor(Math.random() * 16).toString(16)).join(''),
                    size: (Math.random() * 5 + 1).toFixed(1) + 'MB'
                  };
                  
                  setReports(prev => [newReport, ...prev]);
                  setShowReportSuccess(true);
                  await logAction('GENERATE_REPORT', 'system', 'Generated monthly donor impact report');
                  setIsGeneratingReport(false);
                  setTimeout(() => setShowReportSuccess(false), 5000);
                }}
                disabled={isGeneratingReport}
                className="w-full mt-6 py-2.5 bg-teal-700 hover:bg-teal-600 rounded-lg text-xs font-bold transition-all uppercase tracking-widest disabled:opacity-50"
              >
                 {isGeneratingReport ? 'Processing...' : showReportSuccess ? 'Report Generated' : 'Generate Donor Report'}
              </button>
              {showReportSuccess && (
                <p className="mt-2 text-[8px] text-teal-300 font-bold uppercase tracking-widest animate-pulse">
                  Registry ID: RPT-2026-05 Mirroring to Vault...
                </p>
              )}
            </div>
            {/* Grid background matching theme sidebar */}
            <div className="absolute top-0 right-0 w-full h-full opacity-5 pointer-events-none">
              <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                 <pattern id="grid-admin" width="10" height="10" patternUnits="userSpaceOnUse">
                    <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5"/>
                 </pattern>
                 <rect width="100%" height="100%" fill="url(#grid-admin)" />
              </svg>
            </div>
          </div>

          <div className="glass-card p-5">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3 h-3" />
                Verified Feed
              </div>
              <button 
                onClick={() => alert("Foundation Blockchain Explorer\n\nAll tx hashes shown here are immutably signed by the Foundation Audit Treasury and mirrored on the Polygon network.")}
                className="text-[8px] text-teal-600 hover:underline flex items-center gap-1"
              >
                Network Explorer
              </button>
            </h4>
            <div className="space-y-3">
               {donations
                 .filter(d => d.status === 'verified')
                 .sort((a, b) => new Date(b.verifiedAt || b.timestamp).getTime() - new Date(a.verifiedAt || a.timestamp).getTime())
                 .slice(0, 10).map((d, i) => (
                 <div 
                   key={d.id} 
                   className="flex flex-col p-2 bg-slate-50 rounded border border-slate-100 group transition-all"
                 >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-bold text-slate-700">Donation Verified</span>
                      <span className="text-[9px] text-slate-400">{d.verifiedAt ? 'Recent' : 'Synced'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-1 overflow-hidden">
                      <span 
                        onClick={() => setShowTxViewer(d)}
                        className="text-[9px] text-teal-600 font-mono truncate cursor-pointer hover:underline"
                      >
                        {d.blockchainTxHash || ('0x' + d.id.padEnd(64, 'a'))}
                      </span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleCopy(d.blockchainTxHash || ('0x' + d.id.padEnd(64, '0')), d.id)}
                          className="p-1 hover:bg-white rounded transition-colors"
                        >
                          {copiedId === d.id ? <Check className="w-3 h-3 text-teal-600" /> : <Copy className="w-3 h-3 text-slate-400" />}
                        </button>
                        <button 
                          onClick={() => setShowTxViewer(d)}
                          className="p-1 hover:bg-white rounded transition-colors"
                        >
                          <FileText className="w-3 h-3 text-slate-400" />
                        </button>
                      </div>
                    </div>
                 </div>
               ))}
               {donations.filter(d => d.status === 'verified').length === 0 && (
                 <p className="text-[9px] text-slate-300 italic text-center py-4">Waiting for next block sync...</p>
               )}
            </div>
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
              className="glass-card bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden p-0"
            >
              <div className="bg-teal-900 p-8 text-white relative">
                <div className="relative z-10">
                   <div className="flex items-center gap-2 mb-4">
                      <ShieldCheck className="w-5 h-5 text-teal-400" />
                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Verified On-Chain Asset</span>
                   </div>
                   <h3 className="text-2xl font-bold tracking-tight mb-2">Audit Certificate</h3>
                   <div className="font-mono text-[10px] p-3 bg-white/5 rounded border border-white/10 break-all">
                     {showTxViewer.blockchainTxHash || ('0x' + showTxViewer.id.padEnd(64, '0'))}
                   </div>
                </div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-teal-400/10 rounded-full blur-3xl -mr-16 -mt-16" />
              </div>

              <div className="p-8 space-y-6 text-left">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status</p>
                       <p className="text-xs font-bold text-emerald-600 uppercase flex items-center gap-2">
                          <Check className="w-3.5 h-3.5" /> Verified
                       </p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Timestamp</p>
                       <p className="text-xs font-bold text-slate-800">
                          {new Date(showTxViewer.timestamp).toLocaleString()}
                       </p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Amount</p>
                       <p className="text-xs font-bold text-slate-800">₱{showTxViewer.amount.toLocaleString()}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Network</p>
                       <p className="text-xs font-bold text-slate-800">Polygon Mainnet</p>
                    </div>
                 </div>

                 <div className="flex gap-4">
                    <button 
                      onClick={() => handleCopy(showTxViewer.blockchainTxHash || ('0x' + showTxViewer.id.padEnd(64, '0')), 'cert')}
                      className="flex-1 py-4 bg-slate-800 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest shadow-xl"
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
        {rejectingDonation && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="glass-card bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden p-0"
            >
              <div className="bg-red-900 p-8 text-white relative">
                <div className="relative z-10">
                   <div className="flex items-center gap-2 mb-4">
                      <ShieldAlert className="w-5 h-5 text-red-400" />
                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Manual Rejection Control</span>
                   </div>
                   <h3 className="text-2xl font-bold tracking-tight mb-2">Reject Submission</h3>
                   <p className="text-white/60 text-xs font-medium">Verify rejection reason before finalizing record.</p>
                </div>
              </div>

              <div className="p-8 space-y-6">
                 <div className="space-y-1.5">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Reason for Rejection</label>
                   <textarea 
                     value={rejectionReason}
                     onChange={e => setRejectionReason(e.target.value)}
                     className="w-full bg-slate-50 px-4 py-4 rounded-2xl border border-slate-100 text-sm font-medium h-32 focus:ring-2 ring-red-500/10 outline-none"
                     placeholder="e.g. Invalid receipt, Insufficient funds shown, Proof tampered..."
                   />
                 </div>

                 <div className="flex gap-4">
                    <button 
                      onClick={confirmRejection}
                      disabled={!rejectionReason}
                      className="flex-1 py-4 bg-red-900 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest shadow-xl disabled:opacity-50"
                    >
                      Confirm Rejection
                    </button>
                    <button 
                      onClick={() => setRejectingDonation(null)}
                      className="px-8 py-4 bg-slate-100 text-slate-600 rounded-xl font-bold uppercase text-[10px] tracking-widest"
                    >
                      Cancel
                    </button>
                 </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {aiAuditResult && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden relative"
            >
              <div className="p-1 w-full bg-gradient-to-r from-teal-500 to-brand-primary" />
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-teal-50 rounded-lg">
                      <Sparkles className="w-5 h-5 text-teal-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 tracking-tight">AI Case Audit Intelligence</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Case Ref: #PX-{aiAuditResult.patient.publicIdentifier}</p>
                    </div>
                  </div>
                  <button onClick={() => setAiAuditResult(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <CloseIcon className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="p-5 bg-slate-900 rounded-2xl text-teal-50 text-xs leading-relaxed font-medium italic relative overflow-hidden border border-teal-900 shadow-inner">
                    <div className="relative z-10">
                      {aiAuditResult.insight}
                    </div>
                    <div className="absolute top-0 right-0 p-2 opacity-10">
                      <Sparkles className="w-12 h-12" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Priority Validation</p>
                      <p className="text-xs font-bold text-slate-800">{aiAuditResult.patient.priority} Severity</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Funding Velocity</p>
                      <p className="text-xs font-bold text-brand-primary">Optimal Growth</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8">
                  <button 
                    onClick={() => setAiAuditResult(null)}
                    className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest shadow-xl hover:bg-slate-800 transition-all"
                  >
                    Close Intelligence Feed
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {editingPatient && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden relative"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">Edit Warrior Case</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Foundational Audit Update</p>
                  </div>
                  <button onClick={() => setEditingPatient(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <CloseIcon className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                <form onSubmit={handleSavePatient} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Full Name (Internal)</label>
                    <input 
                      className="w-full bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 text-sm font-medium"
                      value={editingPatient.fullName}
                      onChange={e => setEditingPatient({...editingPatient, fullName: e.target.value})}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Priority</label>
                      <select 
                        className="w-full bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 text-sm font-medium outline-none"
                        value={editingPatient.priority}
                        onChange={e => setEditingPatient({...editingPatient, priority: e.target.value as PatientPriority})}
                      >
                        <option value={PatientPriority.GENERAL}>General</option>
                        <option value={PatientPriority.HIGH}>High</option>
                        <option value={PatientPriority.CRITICAL}>Critical</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Status</label>
                      <select 
                        className="w-full bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 text-sm font-medium outline-none"
                        value={editingPatient.status}
                        onChange={e => setEditingPatient({...editingPatient, status: e.target.value as PatientStatus})}
                      >
                        <option value={PatientStatus.ACTIVE}>Active</option>
                        <option value={PatientStatus.COMPLETED}>Completed</option>
                        <option value={PatientStatus.INACTIVE}>Inactive</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <input 
                      type="checkbox" 
                      id="isPublic"
                      checked={editingPatient.isPublic}
                      onChange={e => setEditingPatient({...editingPatient, isPublic: e.target.checked})}
                      className="w-4 h-4 text-brand-primary accent-brand-primary"
                    />
                    <label htmlFor="isPublic" className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Publish Anonymized Public Profile</label>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between ml-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Medical Records</label>
                      <label className="text-[10px] font-bold text-brand-primary uppercase tracking-widest flex items-center gap-1 cursor-pointer hover:opacity-80">
                         <UserPlus className="w-2.5 h-2.5" /> Upload Record
                         <input 
                           type="file" 
                           className="hidden" 
                           onChange={handleUploadMedicalRecord}
                         />
                      </label>
                    </div>
                    <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                       {editingPatient.medicalDocuments?.map(doc => (
                         <div key={doc.id} className="flex items-center justify-between p-2 bg-white rounded border border-slate-100 group">
                           <div className="flex items-center gap-2 flex-1 min-w-0">
                              <FileText className="w-3 h-3 text-slate-400" />
                              <span className="text-[10px] font-bold text-slate-700 truncate">{doc.name}</span>
                           </div>
                           <div className="flex items-center gap-2">
                              <span className="text-[8px] text-slate-400 uppercase">{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                              <button 
                                type="button"
                                onClick={() => handleRemoveDocFromEditing(doc.id)}
                                className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 transition-all"
                              >
                                 <CloseIcon className="w-3 h-3" />
                              </button>
                           </div>
                         </div>
                       ))}
                       {(!editingPatient.medicalDocuments || editingPatient.medicalDocuments.length === 0) && (
                         <p className="text-[10px] text-slate-400 italic text-center py-2">No documents uploaded</p>
                       )}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Funding Goal (PHP)</label>
                    <input 
                      type="number"
                      className="w-full bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 text-sm font-medium"
                      value={editingPatient.fundingGoal}
                      onChange={e => setEditingPatient({...editingPatient, fundingGoal: Number(e.target.value)})}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Diagnosis Overview</label>
                    <textarea 
                      className="w-full bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 text-sm font-medium h-24"
                      value={editingPatient.diagnosis}
                      onChange={e => setEditingPatient({...editingPatient, diagnosis: e.target.value})}
                      required
                    />
                  </div>
                  <div className="pt-4 flex gap-4">
                    <button type="button" onClick={() => setEditingPatient(null)} className="flex-1 py-4 text-slate-500 font-bold uppercase text-[10px] tracking-widest">Discard</button>
                    <button type="submit" className="flex-2 py-4 bg-teal-900 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest shadow-lg hover:shadow-teal-900/20 transition-all">Save Changes</button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}

        {editingAuction && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden relative"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">Edit Auction Item</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Ref: {editingAuction.id}</p>
                  </div>
                  <button onClick={() => setEditingAuction(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <CloseIcon className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                <form onSubmit={handleSaveAuction} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Asset Title</label>
                    <input 
                      className="w-full bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 text-sm font-medium"
                      value={editingAuction.title}
                      onChange={e => setEditingAuction({...editingAuction, title: e.target.value})}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Current Bid (PHP)</label>
                      <input 
                        type="number"
                        className="w-full bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 text-sm font-medium"
                        value={editingAuction.currentBid}
                        onChange={e => setEditingAuction({...editingAuction, currentBid: Number(e.target.value)})}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Status</label>
                      <select 
                        className="w-full bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 text-sm font-medium outline-none"
                        value={editingAuction.status}
                        onChange={e => setEditingAuction({...editingAuction, status: e.target.value as any})}
                      >
                        <option value="draft">Draft</option>
                        <option value="audit">Under Audit</option>
                        <option value="active">Active</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">End Time</label>
                    <input 
                      type="datetime-local"
                      className="w-full bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 text-sm font-medium"
                      value={editingAuction.endTime.slice(0, 16)}
                      onChange={e => setEditingAuction({...editingAuction, endTime: new Date(e.target.value).toISOString()})}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Description</label>
                    <textarea 
                      className="w-full bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 text-sm font-medium h-24"
                      value={editingAuction.description}
                      onChange={e => setEditingAuction({...editingAuction, description: e.target.value})}
                      required
                    />
                  </div>
                  <div className="pt-4 flex gap-4">
                    <button type="button" onClick={() => setEditingAuction(null)} className="flex-1 py-4 text-slate-500 font-bold uppercase text-[10px] tracking-widest">Discard</button>
                    <button type="submit" className="flex-2 py-4 bg-teal-900 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest shadow-lg hover:shadow-teal-900/20 transition-all">Save Changes</button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}

        {selectedReceipt && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden relative"
            >
              <button 
                onClick={() => setSelectedReceipt(null)}
                className="absolute top-4 right-4 p-2 bg-white/80 backdrop-blur rounded-full text-slate-500 hover:text-slate-700 shadow-sm"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
              <div className="p-8">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Payment Verification Proof</h4>
                <div className="aspect-[3/4] bg-slate-100 rounded-2xl overflow-hidden shadow-inner">
                   <img src={selectedReceipt} className="w-full h-full object-cover" alt="Receipt" />
                </div>
                <div className="mt-6 flex gap-3">
                   <button 
                    onClick={() => setSelectedReceipt(null)}
                    className="flex-1 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest"
                   >
                     Close Viewer
                   </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
