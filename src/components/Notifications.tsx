import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import copy from 'copy-to-clipboard';
import { Bell, Heart, ShieldCheck, Gavel, ArrowRight, CheckCircle2, Clock, X as CloseIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserRole } from '../types';

export function Notifications() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<any | null>(null);

  const getSafeDate = (ts: any) => {
    if (!ts) return new Date();
    if (ts.toDate) return ts.toDate();
    return new Date(ts);
  };

  useEffect(() => {
    if (!profile) return;

    // In a real app, we'd have a 'notifications' collection
    // For this demo, we'll derive them from 'donations' and 'patients'
    const donationsRef = collection(db, 'donations');
    const baseQuery = profile.role === UserRole.ADMIN 
      ? query(donationsRef, orderBy('timestamp', 'desc'), limit(10))
      : query(donationsRef, where('donorId', '==', profile.userId), orderBy('timestamp', 'desc'), limit(10));

    const unsub = onSnapshot(baseQuery, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      const derived = docs.map((d: any) => {
          const isVerified = d.status === 'verified';
          const isRejected = d.status === 'rejected';
          const date = getSafeDate(d.timestamp);
          
          if (profile?.role === UserRole.ADMIN) {
            return {
              id: d.id,
              title: isVerified ? 'Donation Verified' : (isRejected ? 'Donation Rejected' : 'Action Required: Pending Verification'),
              message: isRejected 
                ? `Donation #${d.id.slice(0,6)} was rejected for: ${d.rejectionReason || 'No reason provided'}`
                : (isVerified ? `Donation of ₱${d.amount} verified.` : `Donation of ₱${d.amount} from donor #${d.donorId.slice(0,4)} needs audit.`),
              icon: isVerified ? ShieldCheck : (isRejected ? CloseIcon : Clock),
              color: isVerified ? 'text-emerald-500' : (isRejected ? 'text-red-500' : 'text-amber-500'),
              time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              type: 'system'
            };
          } else {
            // For Donor, only show their own
            if (d.donorId !== profile?.userId) return null;
            
            let title = 'Receipt Submitted';
            let message = 'Our foundation is currently auditing your GCash submission.';
            let icon = Clock;
            let color = 'text-slate-400';

            if (isVerified) {
              title = 'Donation On-Chain!';
              message = `Your impact has been recorded on the Polygon network.`;
              icon = Heart;
              color = 'text-brand-primary';
            } else if (isRejected) {
              title = 'Submission Rejected';
              message = `Your donation submission was rejected: ${d.rejectionReason || 'Pending clarification.'}`;
              icon = CloseIcon;
              color = 'text-red-500';
            }

            return {
              id: d.id,
              title,
              message,
              icon,
              color,
              time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              type: 'impact'
            };
          }
      }).filter(Boolean);

      setNotifications(derived);
    });

    return () => unsub();
  }, [profile]);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Bell className="w-6 h-6 text-brand-primary" />
            Alert Center
          </h2>
          <p className="text-sm text-slate-500 font-medium">Verified system updates and personalized impact alerts.</p>
        </div>
        <button className="text-[10px] font-bold text-brand-primary uppercase tracking-widest hover:underline">Mark all as read</button>
      </div>

      <div className="space-y-4">
        <AnimatePresence>
          {notifications.map((n, i) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card p-5 group hover:border-brand-primary/30 transition-all flex items-start gap-4"
            >
              <div className={cn("mt-1 p-2 rounded-lg bg-slate-50", n.color)}>
                <n.icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-bold text-slate-800">{n.title}</h3>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{n.time}</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  {n.message}
                </p>
                <div className="mt-4 flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest">
                   <button 
                    onClick={() => setSelectedNotification(n)}
                    className="text-brand-primary flex items-center gap-1 hover:gap-2 transition-all"
                   >
                      View Details
                      <ArrowRight className="w-3 h-3" />
                   </button>
                   <span className="text-slate-200">|</span>
                   <button className="text-slate-400 hover:text-slate-600">Dismiss</button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {notifications.length === 0 && (
          <div className="py-20 text-center glass-card border-dashed">
            <CheckCircle2 className="w-12 h-12 text-slate-100 mx-auto mb-4" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">All caught up</p>
          </div>
        )}
        <AnimatePresence>
          {selectedNotification && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden"
              >
                <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Alert Intelligence</h3>
                  <button onClick={() => setSelectedNotification(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                    <CloseIcon className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
                <div className="p-8 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className={cn("p-3 rounded-2xl bg-slate-50", selectedNotification.color)}>
                      <selectedNotification.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-slate-800 tracking-tight">{selectedNotification.title}</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{selectedNotification.time} • SysID: {selectedNotification.id.slice(0,8)}</p>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-slate-600 leading-relaxed p-5 bg-slate-50 rounded-2xl border border-slate-100 italic">
                    {selectedNotification.message}
                  </p>
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-3">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-tight">Resolution: System Verified via On-Chain Protocol</p>
                  </div>
                </div>
                <div className="p-6 pt-0">
                  <button 
                    onClick={() => setSelectedNotification(null)}
                    className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest"
                  >
                    Ackownledge Alert
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>

      <div className="p-6 bg-slate-900 rounded-3xl text-white relative overflow-hidden">
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold mb-1 tracking-tight">Stay updated via Mobile</h4>
            <p className="text-[10px] text-white/60 font-medium tracking-tight">Enable push notifications for critical patient updates.</p>
          </div>
          <button className="px-4 py-2 bg-brand-primary rounded-lg text-[10px] font-bold uppercase tracking-widest">Configure</button>
        </div>
        <div className="absolute top-0 right-0 w-24 h-24 bg-brand-primary/20 blur-3xl rounded-full -mr-12 -mt-12" />
      </div>
    </div>
  );
}
