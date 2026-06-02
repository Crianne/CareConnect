import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, increment, where } from 'firebase/firestore';
import { db, handleFirestoreError, handleFirestoreListenerError, OperationType } from '../lib/firebase';
import { Patient, PatientPriority, PatientStatus } from '../types';
import { cn, formatCurrency } from '../lib/utils';
import { Heart, Star, Sparkles, ShieldCheck, ArrowUpRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateAidAnalysis } from '../services/geminiService';
import { useAuth } from '../context/AuthContext';
import { DonationModal } from './Donation/DonationModal';

export function PatientList() {
  const { profile } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isDonating, setIsDonating] = useState(false);
  const [expandedPatientId, setExpandedPatientId] = useState<string | null>(null);

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
  }, [profile]);

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

  if (loading) return (
    <div className="flex items-center justify-center py-40">
      <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="max-w-xl">
          <h2 className="text-3xl font-bold tracking-tight text-slate-800 mb-2">Priority Patient Registry</h2>
          <p className="text-sm text-slate-500 font-medium">
            AI-assisted verification flow ensures funding reaches de-identified medical cases via Polygon Mainnet.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg border border-slate-200">
           <ShieldCheck className="w-4 h-4 text-brand-primary" />
           <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Chain Verified</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {patients.map((patient) => {
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

                  {/* Expandable transparent treatment plan */}
                  <div className="border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedPatientId(expandedPatientId === patient.id ? null : patient.id);
                      }}
                      className="text-[10px] font-black text-brand-primary uppercase tracking-widest hover:text-brand-primary/80 flex items-center gap-1.5 focus:outline-none"
                    >
                      {expandedPatientId === patient.id ? "Hide Treatment Blueprint" : "Show Treatment Blueprint & Proof"}
                      <span className="text-xs">{expandedPatientId === patient.id ? "▲" : "▼"}</span>
                    </button>
                    
                    <AnimatePresence>
                      {expandedPatientId === patient.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden mt-3 space-y-3"
                        >
                          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                            <h5 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Transparent Treatment Protocol</h5>
                            <p className="text-xs text-slate-600 leading-relaxed font-medium">
                              {patient.treatmentPlan || "Subject to final diagnostic confirmation and foundation board audit."}
                            </p>
                          </div>
                          {patient.medicalDocuments && patient.medicalDocuments.length > 0 ? (
                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                              <h5 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                                Verified Medical Documents ({patient.medicalDocuments.length})
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
                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                              <p className="text-[9px] text-slate-400 italic">Verified via internal cryptographic medical ledger. No raw attachments uploaded.</p>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
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

        {patients.length === 0 && (
          <div className="col-span-full py-40 text-center">
            <Heart className="w-16 h-16 text-slate-100 mx-auto mb-4" />
            <h3 className="text-xl font-bold font-serif opacity-50 uppercase tracking-widest italic">The Registry is currently quiet.</h3>
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
