import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, increment, where } from 'firebase/firestore';
import { db, handleFirestoreError, handleFirestoreListenerError, OperationType } from '../lib/firebase';
import { Patient, PatientPriority, PatientStatus } from '../types';
import { cn, formatCurrency } from '../lib/utils';
import { Heart, Star, Sparkles, ShieldCheck, ArrowUpRight, Search, SlidersHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateAidAnalysis } from '../services/geminiService';
import { useAuth } from '../context/AuthContext';
import { DonationModal } from './Donation/DonationModal';
import { TitleExplainer } from './TitleExplainer';

export function PatientList() {
  const { profile } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isDonating, setIsDonating] = useState(false);
  const [expandedPatientId, setExpandedPatientId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [progressFilter, setProgressFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    // For non-admins, we only show ACTIVE patients.
    // We try to filter by isPublic on the server if possible, but to handle legacy data
    // we'll fetch all active and filter isPublic !== false in memory if the query is ambiguous.
    // However, to keep it simple and match security rules, we'll use a safer query.
    const q = collection(db, 'patients');

    const unsub = onSnapshot(q, (snapshot) => {
      const allDocs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Patient));
      
      const filtered = allDocs.filter(p => {
        // Condition 1: Must be active (case insensitive)
        const isActive = p.status?.toLowerCase() === 'active';
        if (!isActive && profile?.role !== 'admin') return false;

        // Condition 2: If not admin, must be public
        if (profile?.role !== 'admin') {
          return p.isPublic !== false;
        }
        
        return true;
      });
      
      setPatients(filtered);
      setLoading(false);
    }, (err) => {
      setLoading(false);
      handleFirestoreListenerError(err, OperationType.LIST, 'patients');
    });
    return unsub;
  }, [profile?.role]);

  const getPriorityColor = (p: PatientPriority) => {
    switch (p) {
      case PatientPriority.CRITICAL: return 'bg-red-500';
      case PatientPriority.HIGH: return 'bg-orange-400';
      default: return 'bg-brand-secondary';
    }
  };

  const initiateDonation = (patient: Patient) => {
    setSelectedPatient(patient);
    setIsDonating(true);
  };

  const filteredPatients = patients.filter(patient => {
    // 1. Search filter
    const searchString = searchTerm.trim().toLowerCase();
    const matchesSearch = !searchString || 
      patient.publicIdentifier?.toLowerCase().includes(searchString) ||
      patient.diagnosis?.toLowerCase().includes(searchString) ||
      String(patient.age).includes(searchString);

    if (!matchesSearch) return false;

    // 2. Priority Filter
    if (priorityFilter !== 'all' && patient.priority !== priorityFilter) {
      return false;
    }

    // 3. Progress Filter
    const progress = (patient.fundingRaised / patient.fundingGoal) * 100;
    if (progressFilter === 'needs_support' && progress >= 80) return false;
    if (progressFilter === 'near_goal' && (progress < 80 || progress >= 100)) return false;
    if (progressFilter === 'fully_funded' && progress < 100) return false;

    return true;
  }).sort((a, b) => {
    if (sortBy === 'newest') {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA || b.publicIdentifier.localeCompare(a.publicIdentifier);
    }
    if (sortBy === 'highest_priority') {
      const priorityOrder: Record<string, number> = { 'Critical': 3, 'High': 2, 'General': 0 };
      const priorityA = priorityOrder[a.priority] ?? 0;
      const priorityB = priorityOrder[b.priority] ?? 0;
      return priorityB - priorityA;
    }
    if (sortBy === 'progress_low') {
      const ratioA = a.fundingGoal > 0 ? a.fundingRaised / a.fundingGoal : 0;
      const ratioB = b.fundingGoal > 0 ? b.fundingRaised / b.fundingGoal : 0;
      return ratioA - ratioB;
    }
    if (sortBy === 'progress_high') {
      const ratioA = a.fundingGoal > 0 ? a.fundingRaised / a.fundingGoal : 0;
      const ratioB = b.fundingGoal > 0 ? b.fundingRaised / b.fundingGoal : 0;
      return ratioB - ratioA;
    }
    if (sortBy === 'goal_high') {
      return b.fundingGoal - a.fundingGoal;
    }
    if (sortBy === 'goal_low') {
      return a.fundingGoal - b.fundingGoal;
    }
    return 0;
  });

  if (loading) return (
    <div className="flex items-center justify-center py-40">
      <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="max-w-xl">
          <TitleExplainer
            featureName="Patient Profiles"
            simpleExplanation="Patient Profiles are verified listings of children fighting cancer. You can read their real stories, see their therapy logs, and directly fund their treatments safely."
            badge="Featured Children Profiles"
            bulletPoints={[
              "Direct medical funding starting at ₱100 PHP",
              "100% de-identified medical data to guard personal privacy",
              "Real-time visual meters showing goal progress"
            ]}
          >
            <h2 className="text-3xl font-bold tracking-tight text-slate-800 mb-0">Patient Profiles</h2>
          </TitleExplainer>
          <p className="text-sm text-slate-500 font-medium">
            AI-assisted verification flow ensures funding reaches de-identified medical cases via Polygon Mainnet.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg border border-slate-200">
           <ShieldCheck className="w-4 h-4 text-brand-primary" />
           <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Chain Verified</span>
        </div>
      </div>

      {/* Modern Warrior Search & Filter Suite */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 md:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Warrior ID, diagnosis, or age..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary placeholder-slate-400 font-medium transition-all"
            />
          </div>

          <div className="flex flex-wrap md:flex-nowrap gap-3">
            {/* Progress filter */}
            <div className="flex-1 md:w-48">
              <select
                value={progressFilter}
                onChange={(e) => setProgressFilter(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-primary uppercase tracking-wider"
              >
                <option value="all">All Goals</option>
                <option value="needs_support">Needs Support (&lt;80%)</option>
                <option value="near_goal">Near Goal (&ge;80%)</option>
                <option value="fully_funded">Fully Funded (100%)</option>
              </select>
            </div>

            {/* Sort by */}
            <div className="flex-1 md:w-44">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-primary uppercase tracking-wider"
              >
                <option value="newest">Newest Listed</option>
                <option value="highest_priority">Highest Severity</option>
                <option value="progress_low">Progress (Min to Max)</option>
                <option value="progress_high">Progress (Max to Min)</option>
                <option value="goal_high">Goal (High to Low)</option>
                <option value="goal_low">Goal (Low to High)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Priority Quick Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-2 flex items-center gap-1.5">
            <SlidersHorizontal className="w-3 h-3" />
            Severity limit:
          </span>
          {[
            { value: 'all', label: 'All Cases' },
            { value: 'Critical', label: 'Critical Severity', color: 'bg-red-500' },
            { value: 'High', label: 'High Severity', color: 'bg-orange-400' },
            { value: 'General', label: 'General / Active', color: 'bg-teal-500' },
          ].map((item) => {
            const isSelected = priorityFilter === item.value;
            return (
              <button
                key={item.value}
                onClick={() => setPriorityFilter(item.value)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 border",
                  isSelected 
                    ? "bg-slate-900 text-white border-slate-900" 
                    : "bg-slate-50 text-slate-500 hover:bg-slate-100 border-slate-200"
                )}
              >
                {item.color && (
                  <span className={cn("w-1.5 h-1.5 rounded-full", item.color)} />
                )}
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Global Care Auto-Division Pool Header Card */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-[2.5rem] p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl border border-teal-800/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="space-y-3 relative z-10 max-w-2xl text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 border border-emerald-400/20 rounded-full text-[9px] font-black uppercase tracking-wider text-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Adaptive Smart Division Enabled
          </div>
          <h3 className="text-xl md:text-2xl font-bold tracking-tight">Support all children via Unified Care Pool</h3>
          <p className="text-xs md:text-sm text-teal-100 font-medium leading-relaxed max-w-xl">
            Don't worry about choosing an individual patient case. Choose the <strong className="text-white">Unified Care Pool</strong> to automatically and equally divide your contribution among all active pediatric oncology cases in our verified registry.
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedPatient(null);
            setIsDonating(true);
          }}
          className="w-full md:w-auto shrink-0 px-6 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-extrabold uppercase text-xs tracking-widest rounded-xl transition-all shadow-lg hover:shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
        >
          Contribute to Pool
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {filteredPatients.map((patient) => {
          const progress = (patient.fundingRaised / patient.fundingGoal) * 100;
          return (
            <motion.div 
              key={patient.id} 
              layout
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card overflow-hidden flex flex-col group hover:border-brand-primary/50"
            >
              <div className="p-6 space-y-5 flex-1">
                <div className="flex items-center justify-between">
                   <div className="flex flex-col">
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Warrior Case</span>
                     <div className="font-mono text-sm font-bold text-slate-800">#AID-{patient.publicIdentifier}</div>
                   </div>
                   <div className={cn(
                     "status-badge",
                     patient.priority === PatientPriority.CRITICAL ? "bg-red-50 text-red-700 border-red-100" :
                     patient.priority === PatientPriority.HIGH ? "bg-orange-50 text-orange-700 border-orange-100" :
                     "bg-teal-50 text-teal-700 border-teal-100"
                   )}>
                     {patient.priority}
                   </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Verified Diagnosis ({patient.age} y/o Warrior)
                    </h4>
                    <p className="text-xs bg-emerald-50/50 text-emerald-950 border border-emerald-100/60 rounded-xl p-3 font-semibold mt-1.5 leading-relaxed">
                      {patient.diagnosis || "Acute Cancer Case (Under Verification)"}
                    </p>
                  </div>

                  {/* Highly visible Patient Overview */}
                  <div className="border-t border-slate-100 pt-3 space-y-3">
                    <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3">
                      <h5 className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest mb-1 inline-block px-1.5 py-0.5 bg-slate-100 rounded">Patient Overview</h5>
                      <p className="text-xs text-slate-700 leading-relaxed font-semibold mt-1">
                        {patient.treatmentPlan || "Subject to final diagnostic confirmation and foundation board audit."}
                      </p>
                    </div>
                    {patient.medicalDocuments && patient.medicalDocuments.length > 0 ? (
                      <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3">
                        <h5 className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest mb-2 inline-block px-1.5 py-0.5 bg-slate-100 rounded">
                          Verified Medical Support Proof ({patient.medicalDocuments.length})
                        </h5>
                        <div className="space-y-1.5">
                          {patient.medicalDocuments.map((doc) => (
                            <a 
                              key={doc.id}
                              href={doc.url}
                              target="_blank"
                              referrerPolicy="no-referrer"
                              rel="noreferrer"
                              className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-100 hover:border-brand-primary text-[10px] font-bold transition-all"
                            >
                              <span className="text-slate-600 truncate max-w-[140px]">{doc.name}</span>
                              <span className="text-[8px] font-bold text-brand-primary uppercase tracking-widest bg-brand-primary/5 px-2 py-1 rounded">View Proof ↗</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 text-center">
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Verified via Ledger Hub</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                   <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      <span>Funding Goal Progress</span>
                      <span>{Math.round(progress)}%</span>
                   </div>
                   <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className="h-full bg-brand-primary rounded-full transition-all duration-1000" 
                      />
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4 py-4 border-t border-slate-50">
                   <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Raised</p>
                      <p className="text-lg font-bold text-teal-600">{formatCurrency(patient.fundingRaised)}</p>
                   </div>
                   <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Goal</p>
                      <p className="text-lg font-bold text-slate-800">{formatCurrency(patient.fundingGoal)}</p>
                   </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border-t border-slate-100 flex gap-2">
                <button 
                  onClick={() => initiateDonation(patient)}
                  className="w-full py-2.5 bg-brand-primary text-white rounded-lg text-xs font-bold hover:bg-brand-primary/90 transition-all flex items-center justify-center gap-2 shadow-sm uppercase tracking-wider"
                >
                  Support Warrior
                  <Heart className="w-3 h-3 fill-white" />
                </button>
                {profile?.role === 'admin' && (
                  <div className="absolute top-2 right-2 px-2 py-0.5 bg-brand-primary/10 text-brand-primary text-[8px] font-black uppercase rounded border border-brand-primary/20 z-10">
                    Admin Preview
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}

        {filteredPatients.length === 0 && (
          <div className="col-span-full py-28 text-center space-y-3">
            <Heart className="w-12 h-12 text-slate-200 mx-auto animate-pulse" />
            <h3 className="text-lg font-bold text-slate-700 uppercase tracking-widest">No Warriors Found</h3>
            <p className="text-xs text-slate-400 font-medium max-w-sm mx-auto">
              We couldn't find any de-identified registry files matching your active search terms or filters.
            </p>
            {(searchTerm || priorityFilter !== 'all' || progressFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setPriorityFilter('all');
                  setProgressFilter('all');
                }}
                className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-250 text-slate-700 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors border border-slate-200"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      <DonationModal 
        isOpen={isDonating} 
        onClose={() => setIsDonating(false)} 
        patient={selectedPatient} 
      />
    </div>
  );
}
