import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, X, Minimize2, Maximize2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { chatWithAssistant } from '../../services/geminiService';
import { collection, query, limit, getDocs, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../../lib/utils';

export function ChatWidget() {
  const { profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    { 
      role: 'assistant', 
      content: profile?.role === 'admin' 
        ? "Hello Admin. I'm your operational intelligence assistant. How can I help you analyze trends today?"
        : "Welcome to CareConnect! I'm your personal aid guide. Ask me about our transparency, loyalty tiers, or how your donation makes a difference." 
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsTyping(true);

    // Fetch brief context for personalized recommendations
    let platformContext = '';
    if (profile?.role === 'admin') {
      try {
        const [patientsSnap, donationsSnap, auctionsSnap, usersSnap, auditLogsSnap] = await Promise.all([
          getDocs(collection(db, 'patients')),
          getDocs(collection(db, 'donations')),
          getDocs(collection(db, 'auctions')),
          getDocs(collection(db, 'users')),
          getDocs(query(collection(db, 'audit_logs'), limit(15)))
        ]);

        const patientsSnapshotData = patientsSnap.docs.map(doc => {
          const d = doc.data();
          return {
            id: doc.id,
            publicIdentifier: d.publicIdentifier,
            fullName: d.fullName,
            priority: d.priority,
            diagnosis: d.diagnosis,
            fundingGoal: d.fundingGoal,
            fundingRaised: d.fundingRaised,
            status: d.status
          };
        });

        const donationsSnapshotData = donationsSnap.docs.map(doc => {
          const d = doc.data();
          return {
            id: doc.id,
            donorName: d.donorName || 'Anonymous',
            isAnonymous: d.isAnonymous || false,
            amount: d.amount,
            status: d.status,
            patientId: d.patientId,
            timestamp: d.timestamp,
            paymentMethod: d.paymentMethod
          };
        });

        const auctionsSnapshotData = auctionsSnap.docs.map(doc => {
          const d = doc.data();
          return {
            id: doc.id,
            title: d.title,
            currentBid: d.currentBid,
            status: d.status,
            endTime: d.endTime
          };
        });

        const usersSnapshotData = usersSnap.docs.map(doc => {
          const d = doc.data();
          return {
            userId: d.userId,
            displayName: d.displayName,
            email: d.email,
            role: d.role,
            loyaltyTier: d.loyaltyTier,
            totalContribution: d.totalContribution
          };
        });

        const auditLogsSnapshotData = auditLogsSnap.docs.map(doc => {
          const d = doc.data();
          return {
            action: d.action,
            details: d.details,
            timestamp: d.timestamp,
            adminEmail: d.adminEmail
          };
        });

        platformContext = `\n(ADMIN LIVE SYSTEM SNAPSHOT:
- PATIENTS: ${JSON.stringify(patientsSnapshotData)}
- DONATIONS: ${JSON.stringify(donationsSnapshotData)}
- AUCTIONS: ${JSON.stringify(auctionsSnapshotData)}
- USERS: ${JSON.stringify(usersSnapshotData)}
- RECENT AUDIT LOGS: ${JSON.stringify(auditLogsSnapshotData)}
)`;
      } catch (e) {
        console.error("Admin Context fetch failed", e);
      }
    } else if (messages.length < 5) {
      try {
        const patientsSnap = await getDocs(query(collection(db, 'patients'), where('status', 'in', ['Active', 'active']), limit(3)));
        const auctionsSnap = await getDocs(query(collection(db, 'auctions'), where('status', 'in', ['Active', 'active']), limit(2)));
        
        const patients = patientsSnap.docs.map(doc => ({ id: doc.data().publicIdentifier, diag: doc.data().diagnosis }));
        const auctions = auctionsSnap.docs.map(doc => doc.data().title);
        
        const donorProfile = {
          tier: profile?.loyaltyTier,
          streak: profile?.donationStreak,
          totalImpacts: profile?.verifiedContributionsCount,
          totalGiven: profile?.totalContribution
        };

        if (patients.length > 0 || auctions.length > 0) {
          platformContext = `\n(Context for Assistant: Current donor status: ${JSON.stringify(donorProfile)}. Active cases: ${JSON.stringify(patients)}. Auctions: ${JSON.stringify(auctions)})`;
        }
      } catch (e) {
        console.error("Context fetch failed", e);
      }
    }

    const response = await chatWithAssistant(userMsg + platformContext, messages, profile?.role || 'donor' as any);
    
    setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    setIsTyping(false);
  };

  return (
    <div className="fixed bottom-20 md:bottom-6 right-6 z-[100] flex flex-col items-end">
      <AnimatePresence>
        {isOpen && !isMinimized && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="w-[90vw] md:w-[400px] h-[600px] max-h-[80vh] flex flex-col overflow-hidden glass-card rounded-3xl mb-4 border-slate-200"
          >
            {/* Header */}
            <div className="p-4 bg-brand-primary text-white flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Gemini Assistant</h3>
                  <p className="text-[10px] opacity-80">{profile?.role === 'admin' ? 'Strategic Support' : 'Aid Guide'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setIsMinimized(true)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                  <Minimize2 className="w-4 h-4" />
                </button>
                <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
              {messages.map((msg, i) => (
                <div key={i} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[85%] p-3 rounded-2xl text-sm shadow-sm",
                    msg.role === 'user' 
                      ? "bg-brand-primary text-white rounded-tr-none" 
                      : "bg-white text-slate-800 border border-slate-100 rounded-tl-none"
                  )}>
                    <div className={cn(
                      msg.role === 'user'
                        ? "text-white font-medium [&_*]:text-white [&_p]:text-white [&_p]:mb-2 [&_p:last-child]:mb-0 leading-relaxed"
                        : "markdown-body prose prose-sm max-w-none"
                    )}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm">
                    <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5 }} className="flex gap-1">
                      <div className="w-2 h-2 bg-slate-300 rounded-full" />
                      <div className="w-2 h-2 bg-slate-300 rounded-full" />
                      <div className="w-2 h-2 bg-slate-300 rounded-full" />
                    </motion.div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-slate-100">
              <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl focus-within:ring-2 ring-brand-primary/20 transition-all">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask CareConnect..."
                  className="flex-1 bg-transparent px-3 py-2 text-sm focus:outline-none"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isTyping}
                  className="p-2.5 bg-brand-primary text-white rounded-xl disabled:opacity-50 transition-all hover:bg-brand-primary/90"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trigger Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          setIsOpen(true);
          setIsMinimized(false);
        }}
        className={cn(
          "w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl transition-all",
          isOpen ? "bg-brand-secondary" : "bg-brand-primary",
          "text-white"
        )}
      >
        {isOpen && isMinimized ? <Maximize2 className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
      </motion.button>
    </div>
  );
}

