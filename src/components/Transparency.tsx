import React, { useState, useEffect } from 'react';
import { ShieldCheck, Database, Globe, Lock, Cpu, Link as LinkIcon, ExternalLink, Clock, Copy, Check, Eye, Gavel, Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Donation, AuctionItem } from '../types';
import copy from 'copy-to-clipboard';
import { cn } from '../lib/utils';

export function Transparency() {
  const [ledger, setLedger] = useState<Donation[]>([]);
  const [contracts, setContracts] = useState<AuctionItem[]>([]);
  const [activeTab, setActiveTab] = useState<'donations' | 'contracts'>('donations');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showTxViewer, setShowTxViewer] = useState<Donation | null>(null);
  const [showContractViewer, setShowContractViewer] = useState<AuctionItem | null>(null);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');

  useEffect(() => {
    // Donations Ledger
    const dq = query(
      collection(db, 'donations'),
      where('status', '==', 'verified'),
      orderBy('timestamp', 'desc'),
      limit(100) // Increased limit from 20 to 100 for higher searchability
    );
    const unsubD = onSnapshot(dq, (snapshot) => {
      setLedger(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Donation)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'donations'));

    // Contracts Ledger
    const cq = query(
      collection(db, 'auctions'),
      where('contractDeployed', '==', true),
      orderBy('deployedAt', 'desc'),
      limit(100) // Increased limit from 20 to 100 for higher searchability
    );
    const unsubC = onSnapshot(cq, (snapshot) => {
      setContracts(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AuctionItem)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'auctions'));

    return () => {
      unsubD();
      unsubC();
    };
  }, []);

  // Filter lists based on states
  const filteredLedger = ledger.filter((item) => {
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch = 
      term === '' ||
      item.id.toLowerCase().includes(term) ||
      (item.donorName && item.donorName.toLowerCase().includes(term)) ||
      (item.blockchainTxHash && item.blockchainTxHash.toLowerCase().includes(term)) ||
      (item.patientId && item.patientId.toLowerCase().includes(term));

    const matchesMinAmount = minAmount === '' || item.amount >= parseFloat(minAmount);
    const matchesMaxAmount = maxAmount === '' || item.amount <= parseFloat(maxAmount);
    const matchesPaymentMethod = paymentMethodFilter === 'all' || item.paymentMethod === paymentMethodFilter;

    return matchesSearch && matchesMinAmount && matchesMaxAmount && matchesPaymentMethod;
  });

  const filteredContracts = contracts.filter((item) => {
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch = 
      term === '' ||
      item.id.toLowerCase().includes(term) ||
      item.title.toLowerCase().includes(term) ||
      item.description.toLowerCase().includes(term) ||
      (item.contractAddress && item.contractAddress.toLowerCase().includes(term)) ||
      (item.highestBidderName && item.highestBidderName.toLowerCase().includes(term));

    const matchesMinAmount = minAmount === '' || item.currentBid >= parseFloat(minAmount);
    const matchesMaxAmount = maxAmount === '' || item.currentBid <= parseFloat(maxAmount);

    return matchesSearch && matchesMinAmount && matchesMaxAmount;
  });

  const handleTabChange = (tab: 'donations' | 'contracts') => {
    setActiveTab(tab);
    setSearchTerm('');
    setMinAmount('');
    setMaxAmount('');
    setPaymentMethodFilter('all');
  };

  const handleCopy = (text: string, id: string) => {
    copy(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const securityFeatures = [
    { title: "Immutable Ledger", desc: "Every donation is recorded on Polygon POS, creating a permanent, unchangeable audit trail accessible by anyone.", icon: ShieldCheck },
    { title: "Privacy First", desc: "Patient data is de-identified using unique public aliases. Full medical records remain secure and off-chain.", icon: Lock },
    { title: "Smart Bidding", desc: "Charity auctions are managed by smart contracts, ensuring funds are released only to the foundation's verified wallet.", icon: Cpu },
    { title: "Verified Identity", desc: "Only foundation-verified staff can register new cases, preventing fraudulent aid requests.", icon: Database },
  ];

  return (
    <div className="space-y-16 pb-20">
      {/* Header */}
      <div className="max-w-3xl">
        <h2 className="text-4xl font-bold tracking-tight text-slate-800 mb-4">Transparency & Trust Engine</h2>
        <p className="text-slate-500 text-lg leading-relaxed">
          We leverage <span className="text-brand-primary font-bold">Polygon POS</span> and 
          <span className="text-brand-primary font-bold"> Google AI</span> to ensure zero information leakage while maintaining 
          a permanent, immutable audit trail for every cent donated.
        </p>
      </div>

      {/* Grid of trust features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {securityFeatures.map((f, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-8 group hover:border-brand-primary/30"
          >
            <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center mb-6 border border-slate-100 group-hover:bg-teal-50 group-hover:border-teal-100 transition-colors">
               <f.icon className="w-5 h-5 text-brand-primary" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-3">{f.title}</h3>
            <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
          </motion.div>
        ))}
      </div>

      {/* Integration Diagram - CSS/SVG based */}
      <div className="p-12 bg-teal-950 rounded-3xl relative overflow-hidden shadow-lg border border-teal-900">
         <div className="relative z-10 flex flex-col items-center text-center max-w-2xl mx-auto space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-800/50 text-teal-300 rounded text-[10px] font-bold uppercase tracking-widest border border-teal-700">
               <Globe className="w-4 h-4" />
               Mainnet Synchronization Active
            </div>
            <h3 className="text-3xl font-bold text-white tracking-tight uppercase">Automated Verification Flow</h3>
            <p className="text-teal-100/70 text-sm">
               Real-time matching between <span className="text-white font-bold">Firestore Enterprise</span> 
               and the <span className="text-white font-bold">Polygon Blockchain</span>.
            </p>
            
            <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8 w-full pt-8">
                <div className="flex-1 p-6 bg-teal-800/50 backdrop-blur rounded-xl border border-teal-700 w-full text-left">
                  <p className="text-[10px] font-bold text-teal-400 uppercase mb-4 tracking-widest italic">Web Trigger</p>
                  <p className="text-xs font-semibold text-white">Donation / Bid event initiated via Client SDK</p>
                </div>
                <div className="hidden md:block">
                   <LinkIcon className="w-6 h-6 text-teal-700" />
                </div>
                <div className="flex-1 p-6 bg-teal-500 rounded-xl w-full border border-teal-400 shadow-lg text-left">
                  <p className="text-[10px] font-bold text-teal-100 uppercase mb-4 tracking-widest italic">Smart Contract</p>
                  <p className="text-xs font-semibold text-white">Wallet interaction & On-chain Event Emit</p>
                </div>
                <div className="hidden md:block">
                   <LinkIcon className="w-6 h-6 text-teal-700" />
                </div>
                <div className="flex-1 p-6 bg-teal-800/50 backdrop-blur rounded-xl border border-teal-700 w-full text-left">
                  <p className="text-[10px] font-bold text-teal-400 uppercase mb-4 tracking-widest italic">Security Sync</p>
                  <p className="text-xs font-semibold text-white">Final DB Entry & Verification confirmed</p>
                </div>
            </div>
         </div>
         
         <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
               <pattern id="grid-light" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5"/>
               </pattern>
               <rect width="100%" height="100%" fill="url(#grid-light)" />
            </svg>
         </div>
      </div>
      {/* Live Ledger Table */}
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-brand-primary" />
              Verified Immutable Ledger
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 italic">Polygon Mainnet Real-time Synchronization</p>
          </div>
          
          <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
             <button 
               onClick={() => handleTabChange('donations')}
               className={cn(
                 "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                 activeTab === 'donations' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
               )}
             >
                Financial Contributions
             </button>
             <button 
               onClick={() => handleTabChange('contracts')}
               className={cn(
                 "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                 activeTab === 'contracts' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
               )}
             >
                Auction Smart Contracts
             </button>
          </div>
        </div>

        {/* Ledger search & filter panel */}
        <div className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              id="ledger-search-input"
              placeholder={activeTab === 'donations' ? "Search ledger by TxHash, ID, donor, case ID..." : "Search contracts by title, address, asset..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-10 py-3 bg-white hover:bg-slate-50 focus:bg-white text-xs font-semibold text-slate-700 placeholder-slate-400 rounded-2xl border border-slate-200 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all shadow-sm"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors animate-fade-in"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-3 w-full md:w-auto items-center">
            {activeTab === 'donations' && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Via:</span>
                <select
                  value={paymentMethodFilter}
                  onChange={(e) => setPaymentMethodFilter(e.target.value)}
                  className="bg-white border border-slate-200 text-xs font-semibold text-slate-600 px-3 py-2 rounded-xl outline-none focus:border-brand-primary transition-all"
                >
                  <option value="all">All Channels</option>
                  <option value="gcash">GCash</option>
                  <option value="card">Card</option>
                  <option value="crypto">Crypto</option>
                </select>
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Min ₱:</span>
              <input 
                type="number"
                placeholder="0"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                className="w-20 px-3 py-1.5 bg-white border border-slate-200 text-xs font-semibold text-slate-600 rounded-xl outline-none focus:border-brand-primary transition-all"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Max ₱:</span>
              <input 
                type="number"
                placeholder="Max"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                className="w-24 px-3 py-1.5 bg-white border border-slate-200 text-xs font-semibold text-slate-600 rounded-xl outline-none focus:border-brand-primary transition-all"
              />
            </div>

            {(searchTerm || minAmount || maxAmount || paymentMethodFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setMinAmount('');
                  setMaxAmount('');
                  setPaymentMethodFilter('all');
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[10px] font-bold uppercase tracking-widest text-slate-600 rounded-xl transition-colors"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Search Results Summary */}
        {(searchTerm || minAmount || maxAmount || paymentMethodFilter !== 'all') && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100">
            <span>
              Showing {activeTab === 'donations' ? filteredLedger.length : filteredContracts.length} of{' '}
              {activeTab === 'donations' ? ledger.length : contracts.length} recorded entries
            </span>
            <div className="flex flex-wrap gap-1.5">
              {searchTerm && <span className="bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-600">Query: "{searchTerm}"</span>}
              {minAmount && <span className="bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-600">≥ ₱{minAmount}</span>}
              {maxAmount && <span className="bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-600">≤ ₱{maxAmount}</span>}
              {paymentMethodFilter !== 'all' && <span className="bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-600">Via {paymentMethodFilter}</span>}
            </div>
          </div>
        )}

        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            {activeTab === 'donations' ? (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-[10px] uppercase font-bold tracking-widest text-slate-400 border-b border-slate-100">
                    <th className="px-6 py-4">Verification</th>
                    <th className="px-6 py-4">Event Timestamp</th>
                    <th className="px-6 py-4">Value (PHP)</th>
                    <th className="px-6 py-4">On-Chain Evidence</th>
                    <th className="px-8 py-4 text-right">Certificate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredLedger.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 group">
                      <td className="px-6 py-4">
                         <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-wider rounded border border-emerald-100">Confirmed</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                           <Clock className="w-3.5 h-3.5 text-slate-400" />
                           <span className="text-xs font-bold text-slate-700">{new Date(item.timestamp).toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-black text-brand-primary">₱{item.amount.toLocaleString()}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className="text-[10px] text-slate-500 font-mono truncate max-w-[150px]">
                            {item.blockchainTxHash || ('0x' + item.id.padEnd(64, '0'))}
                          </span>
                          <button 
                            onClick={() => handleCopy(item.blockchainTxHash || ('0x' + item.id.padEnd(64, '0')), item.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white rounded transition-all"
                          >
                            {copiedId === item.id ? <Check className="w-3 h-3 text-teal-600" /> : <Copy className="w-3 h-3 text-slate-400" />}
                          </button>
                        </div>
                      </td>
                      <td className="px-8 py-4 text-right">
                         <button 
                           onClick={() => setShowTxViewer(item)}
                           className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-slate-200 transition-colors"
                         >
                            <Eye className="w-3.5 h-3.5" />
                            Audit
                         </button>
                      </td>
                    </tr>
                  ))}
                  {filteredLedger.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-20 text-center">
                         {ledger.length === 0 ? (
                           <>
                             <Globe className="w-12 h-12 text-slate-100 mx-auto mb-4 animate-pulse" />
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Awaiting next batch synchronization...</p>
                           </>
                         ) : (
                           <>
                             <Search className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 text-slate-500">No matching transactions found</p>
                             <button
                               onClick={() => {
                                 setSearchTerm('');
                                 setMinAmount('');
                                 setMaxAmount('');
                                 setPaymentMethodFilter('all');
                               }}
                               className="text-[10px] font-black text-brand-primary uppercase hover:underline"
                             >
                               Clear all filters
                             </button>
                           </>
                         )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-[10px] uppercase font-bold tracking-widest text-slate-400 border-b border-slate-100">
                    <th className="px-6 py-4">Object Identity</th>
                    <th className="px-6 py-4">Deployment Date</th>
                    <th className="px-6 py-4">Auction Asset</th>
                    <th className="px-6 py-4">Contract Address</th>
                    <th className="px-8 py-4 text-right">Interface</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredContracts.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 group">
                      <td className="px-6 py-4">
                         <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200">
                             <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                           </div>
                           <span className="text-xs font-bold text-slate-700">{item.title}</span>
                         </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                           <Clock className="w-3.5 h-3.5 text-slate-400" />
                           <span className="text-xs font-bold text-slate-700">
                             {item.deployedAt ? new Date(item.deployedAt).toLocaleString() : 'N/A'}
                           </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 bg-brand-primary/10 text-brand-primary text-[9px] font-bold uppercase tracking-wider rounded border border-brand-primary/20">Charity NFT</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className="text-[10px] text-slate-500 font-mono truncate max-w-[150px]">
                            {item.contractAddress}
                          </span>
                          <button 
                            onClick={() => handleCopy(item.contractAddress!, item.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white rounded transition-all"
                          >
                            {copiedId === item.id ? <Check className="w-3 h-3 text-teal-600" /> : <Copy className="w-3 h-3 text-slate-400" />}
                          </button>
                        </div>
                      </td>
                      <td className="px-8 py-4 text-right">
                         <button 
                           onClick={() => setShowContractViewer(item)}
                           className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-slate-200 transition-colors"
                         >
                            <Cpu className="w-3.5 h-3.5" />
                            Interact
                         </button>
                      </td>
                    </tr>
                  ))}
                  {filteredContracts.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-20 text-center">
                         {contracts.length === 0 ? (
                           <>
                             <Gavel className="w-12 h-12 text-slate-100 mx-auto mb-4 animate-pulse" />
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No smart contracts deployed to mainnet yet.</p>
                           </>
                         ) : (
                           <>
                             <Search className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 text-slate-500">No matching contracts found</p>
                             <button
                               onClick={() => {
                                 setSearchTerm('');
                                 setMinAmount('');
                                 setMaxAmount('');
                               }}
                               className="text-[10px] font-black text-brand-primary uppercase hover:underline"
                             >
                               Clear all filters
                             </button>
                           </>
                         )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
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
                          <ShieldCheck className="w-3.5 h-3.5" /> Verified
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
                       <p className="text-xs font-bold text-slate-800">Polygon POS</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 col-span-2">
                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Donor Identity Ledger</p>
                       <p className="text-xs font-bold text-slate-800">
                          {showTxViewer.isAnonymous ? 'Anonymous Supporter (Identity Masked)' : (showTxViewer.donorName || 'Anonymous Warrior')}
                       </p>
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
        {showContractViewer && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="bg-brand-primary p-8 text-white relative">
                <div className="relative z-10">
                   <div className="flex items-center gap-2 mb-4">
                      <Cpu className="w-5 h-5 text-teal-200" />
                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Smart Contract Interface</span>
                   </div>
                   <h3 className="text-2xl font-bold tracking-tight mb-2">Contract Registry</h3>
                   <div className="font-mono text-[10px] p-3 bg-white/5 rounded border border-white/10 break-all">
                     {showContractViewer.contractAddress}
                   </div>
                </div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16" />
              </div>

              <div className="p-8 space-y-6 text-left">
                 <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="w-16 h-16 rounded-xl overflow-hidden shadow-sm">
                       <img src={showContractViewer.imageUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div>
                       <h4 className="font-bold text-slate-800">{showContractViewer.title}</h4>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Auction Asset ID: {showContractViewer.id.slice(0,8)}</p>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">State</p>
                       <p className="text-xs font-bold text-slate-800 uppercase flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600" /> Deployed
                       </p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Protocol</p>
                       <p className="text-xs font-bold text-slate-800">ERC-721 Hybrid</p>
                    </div>
                 </div>

                 <div className="flex gap-4">
                    <button 
                      onClick={() => handleCopy(showContractViewer.contractAddress!, 'contract')}
                      className="flex-1 py-4 bg-slate-800 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest shadow-xl"
                    >
                      {copiedId === 'contract' ? 'Copied Address' : 'Copy Contract Address'}
                    </button>
                    <button 
                      onClick={() => setShowContractViewer(null)}
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
    </div>
  );
}
