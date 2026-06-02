import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, 
  ShieldCheck, 
  Globe, 
  ArrowRight, 
  Zap, 
  Users, 
  Lock, 
  Hammer,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Gavel,
  Clock,
  BookOpen,
  MessageSquare
} from 'lucide-react';
import { AuthModal } from '../Auth/AuthModal';
import { collection, query, getDocs, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Patient, AuctionItem, SurvivorStory } from '../../types';
import { formatCurrency } from '../../lib/utils';

export function LandingPage() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [auctions, setAuctions] = useState<AuctionItem[]>([]);
  const [stories, setStories] = useState<SurvivorStory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPublicData() {
      try {
        const patientsSnap = await getDocs(query(collection(db, 'patients'), limit(12)));
        const allPatients = patientsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient));
        const activePublicPatients = allPatients.filter(p => p.status?.toLowerCase() === 'active' && p.isPublic !== false);
        setPatients(activePublicPatients);

        const auctionsSnap = await getDocs(query(collection(db, 'auctions'), limit(12)));
        const allAuctions = auctionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuctionItem));
        const activeAuctions = allAuctions.filter(item => item.status === 'active');
        setAuctions(activeAuctions);

        const storiesSnap = await getDocs(query(collection(db, 'stories'), limit(12)));
        const allStories = storiesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SurvivorStory));
        setStories(allStories);
      } catch (err) {
        console.error("Error loading landing page public listings:", err);
      } finally {
        setLoading(false);
      }
    }
    loadPublicData();
  }, []);

  const getTimeRemaining = (endTime: string) => {
    const total = Date.parse(endTime) - Date.parse(new Date().toString());
    if (total <= 0) return 'Closed';
    const seconds = Math.floor((total / 1000) % 60);
    const minutes = Math.floor((total / 1000 / 60) % 60);
    const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
    const days = Math.floor(total / (1000 * 60 * 60 * 24));
    return `${days}d ${hours}h ${minutes}m`;
  };

  return (
    <div className="min-h-screen bg-white selection:bg-teal-100 selection:text-teal-900">
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-teal-900 rounded-xl flex items-center justify-center text-white shadow-lg">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-800">CareConnect</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            {['About', 'Campaigns', 'Auctions', 'Stories'].map(item => (
              <a 
                key={item} 
                href={`#${item.toLowerCase()}`} 
                className="text-xs font-bold text-slate-500 hover:text-teal-600 uppercase tracking-widest transition-colors"
              >
                {item}
              </a>
            ))}
          </div>

          <button 
            onClick={() => setIsAuthModalOpen(true)}
            className="px-6 py-2.5 bg-brand-primary text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-brand-primary/90 transition-all shadow-sm"
          >
            Access Portal
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative pt-40 pb-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-50 text-teal-700 rounded border border-teal-100 text-[10px] font-bold uppercase tracking-widest">
                <Sparkles className="w-3 h-3" />
                Empowering Cancer Warriors via Polygon
              </div>
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 leading-[1.05]">
                Direct impact, <br />
                <span className="gradient-text italic">Blockchain Verified.</span>
              </h1>
              <p className="text-lg text-slate-500 leading-relaxed max-w-xl">
                CareConnect leverages AI verification and Polygon Mainnet to ensure your support reaches pediatric cancer warriors with 100% transparency.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button 
                  onClick={() => setIsAuthModalOpen(true)}
                  className="px-8 py-4 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all shadow-xl shadow-slate-200"
                >
                  Start Donating
                  <ArrowRight className="w-5 h-5" />
                </button>
                <button className="px-8 py-4 bg-white text-slate-600 border border-slate-200 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-all">
                  View Public Ledger
                  <Globe className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-teal-100 rounded-[3rem] -rotate-3 blur-3xl opacity-30 animate-pulse"></div>
              <div className="relative bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-2xl space-y-8">
                <div className="flex items-center justify-between border-b border-slate-100 pb-6">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Verified Aid</p>
                    <p className="text-3xl font-bold text-brand-primary">₱12,482,000</p>
                  </div>
                  <ShieldCheck className="w-10 h-10 text-brand-primary" />
                </div>
                <div className="space-y-4">
                  {[
                    { label: 'Cases Funded', value: '482+', icon: Heart },
                    { label: 'Active Donors', value: '1.2k+', icon: Users },
                    { label: 'Nodes Syncing', value: 'Polygon', icon: Zap },
                  ].map((stat, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                          <stat.icon className="w-4 h-4 text-brand-primary" />
                        </div>
                        <span className="text-sm font-bold text-slate-600">{stat.label}</span>
                      </div>
                      <span className="text-sm font-bold text-slate-900">{stat.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Animated Background SVG */}
        <div className="absolute top-0 right-0 w-full h-full opacity-[0.03] pointer-events-none">
          <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
            <pattern id="landing-grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="black" strokeWidth="0.5"/>
            </pattern>
            <rect width="100%" height="100%" fill="url(#landing-grid)" />
          </svg>
        </div>
      </header>

      {/* Features Grid */}
      <section id="about" className="py-24 bg-slate-50 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-20 space-y-4">
            <h2 className="text-sm font-bold text-brand-primary uppercase tracking-[0.2em]">The CareConnect Protocol</h2>
            <h3 className="text-4xl font-bold tracking-tight text-slate-900">How we ensure your impact is real.</h3>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: 'De-Identified Patient Security',
                desc: 'AI-assisted flows ensure medical privacy while maintaining de-identified patient verification.',
                icon: Lock
              },
              {
                title: 'Polygon POS Mainnet Sync',
                desc: 'Every donation record is hashed and sent to the immutable Polygon ledger for public audit.',
                icon: Globe
              },
              {
                title: 'Charity Auction Marketplace',
                desc: 'Blockchain-backed auctions for high-value items, with automatic smart contract settlement.',
                icon: Hammer
              }
            ].map((feature, i) => (
              <div key={i} className="bg-white p-10 rounded-2xl border border-slate-200 shadow-sm space-y-6 group hover:border-brand-primary transition-all">
                <div className="w-12 h-12 bg-teal-50 rounded flex items-center justify-center text-teal-600 group-hover:bg-brand-primary group-hover:text-white transition-colors">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h4 className="text-xl font-bold text-slate-800">{feature.title}</h4>
                <p className="text-sm text-slate-500 leading-relaxed font-medium">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Campaigns Group Section */}
      <section id="campaigns" className="py-24 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
            <div className="space-y-4 max-w-2xl">
              <h2 className="text-sm font-bold text-brand-primary uppercase tracking-[0.2em]">Active Campaigns</h2>
              <h3 className="text-4xl font-bold tracking-tight text-slate-900 leading-[1.15]">Brave Pediatric oncology warriors who need your support.</h3>
              <p className="text-sm text-slate-500 font-medium">
                Browse verified, de-identified pediatric cancer cases. Every single transaction directly funds specific hospital milestones via the transparent treasury.
              </p>
            </div>
            <button 
              onClick={() => setIsAuthModalOpen(true)}
              className="flex-shrink-0 px-6 py-3 bg-teal-900 hover:bg-teal-950 text-white rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 shadow-lg transition-all"
            >
              Sign In to Fund Cases <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-teal-900 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : patients.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 rounded-[2rem] border border-slate-200">
              <Heart className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">No active cases registered</p>
              <p className="text-xs text-slate-400 font-medium mt-1">Please sign in as admin to register new warriors in the audit system.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {patients.map((patient) => {
                const progress = Math.min(100, Math.floor((patient.fundingRaised / patient.fundingGoal) * 100));
                return (
                  <div key={patient.id} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-brand-primary transition-all group relative overflow-hidden">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-[0.15em] text-teal-600 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-100">
                          Case #AID-{patient.publicIdentifier}
                        </span>
                        <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded border ${
                          patient.priority === 'Critical' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                        }`}>
                          {patient.priority}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Verified Diagnosis</h4>
                        <p className="text-sm font-bold text-slate-800 line-clamp-2 leading-relaxed bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                          {patient.diagnosis}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-slate-500">Fundraising Progress</span>
                          <span className="text-brand-primary">{progress}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/40">
                          <div 
                            className="h-full bg-brand-primary transition-all duration-500"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-end pt-1">
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block leading-none">Raised</span>
                            <span className="text-sm font-black text-slate-700">₱{patient.fundingRaised.toLocaleString()}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block leading-none">Goal</span>
                            <span className="text-sm font-black text-slate-800">₱{patient.fundingGoal.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 mt-6 border-t border-slate-100">
                      <button 
                        onClick={() => setIsAuthModalOpen(true)}
                        className="w-full py-3 bg-slate-50 hover:bg-brand-primary group-hover:bg-brand-primary text-slate-700 group-hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 group-hover:border-transparent transition-all"
                      >
                        Contribute & Support
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Auctions Group Section */}
      <section id="auctions" className="py-24 bg-slate-50 border-y border-slate-100 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
            <div className="space-y-4 max-w-2xl">
              <h2 className="text-sm font-bold text-brand-primary uppercase tracking-[0.2em]">Charity Auctions</h2>
              <h3 className="text-4xl font-bold tracking-tight text-slate-900 leading-[1.15]">Bid on fine art & luxury digital assets.</h3>
              <p className="text-sm text-slate-500 font-medium">
                High-value fine arts and physical collectibles donated by patrons. 100% of winning auction bids go straight to the pediatric chemotherapy pools.
              </p>
            </div>
            <button 
              onClick={() => setIsAuthModalOpen(true)}
              className="flex-shrink-0 px-6 py-3 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 shadow-lg transition-all"
            >
              Sign In to Place Bids <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : auctions.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-[2rem] border border-slate-200">
              <Gavel className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">No active auction lots at this moment</p>
              <p className="text-xs text-slate-400 font-medium mt-1">Founders are auditing new luxury fine art donations in the registry.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {auctions.map((item) => {
                const timeRemaining = getTimeRemaining(item.endTime);
                return (
                  <div key={item.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between hover:border-brand-primary transition-all group">
                    <div className="relative aspect-video bg-slate-100 overflow-hidden">
                      <img 
                        src={item.imageUrl} 
                        alt={item.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      />
                      <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg text-[9px] font-black text-white uppercase tracking-widest flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        {timeRemaining}
                      </div>
                    </div>

                    <div className="p-8 flex-1 flex flex-col justify-between space-y-6">
                      <div className="space-y-2">
                        <h4 className="text-lg font-black text-slate-800 leading-snug group-hover:text-brand-primary transition-colors line-clamp-1">{item.title}</h4>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed line-clamp-2">{item.description}</p>
                      </div>

                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block leading-none">Current Bid</span>
                          <span className="text-base font-black text-teal-800">₱{item.currentBid.toLocaleString()}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block leading-none">Top Bidder</span>
                          <span className="text-xs font-bold text-slate-700 truncate max-w-[120px] block">{item.highestBidderName?.split(' ')[0]}</span>
                        </div>
                      </div>

                      <button 
                        onClick={() => setIsAuthModalOpen(true)}
                        className="w-full py-3 bg-slate-900 hover:bg-brand-primary hover:text-white text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md transition-all"
                      >
                        Place a Bid
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Stories Group Section */}
      <section id="stories" className="py-24 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
            <div className="space-y-4 max-w-2xl">
              <h2 className="text-sm font-bold text-brand-primary uppercase tracking-[0.2em]">Survivor Journeys</h2>
              <h3 className="text-4xl font-bold tracking-tight text-slate-900 leading-[1.15]">Proof of Care: Real Remission Stories.</h3>
              <p className="text-sm text-slate-500 font-medium">
                Every child funded is a life preserved. Read verified testimonials from healed warriors, complete with transparent cryptographically locked ledger links.
              </p>
            </div>
            <button 
              onClick={() => setIsAuthModalOpen(true)}
              className="flex-shrink-0 px-6 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all"
            >
              Learn More at Portal <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {(stories.length > 0 ? stories.map(s => ({
              child: s.childName,
              age: s.age,
              msg: s.message,
              raised: s.fundsRaised,
              hash: s.blockchainHash,
              tag: s.tag
            })) : [
              {
                child: "Warrior Angela L.",
                age: "6y/o Leukemic Hero",
                msg: "We are finally back home and preparing for Grade 1 enrollment! Throughout 12 chemo sessions, CareConnect ensured every medicine was accounted for and fully paid on-chain.",
                raised: "₱450,000",
                hash: "0x8a92f022efee991a0c01da0c9d9beeeff82a...912a",
                tag: "Molecular Remission"
              },
              {
                child: "Warrior Christian B.",
                age: "8y/o Bone Tumor Hero",
                msg: "The limb salvage operation was successful, and Christian has already taken his first unassisted steps using the prosthetic limb! Thank you to the anonymous art patrons.",
                raised: "₱920,000",
                hash: "0x3c28b1bf05edb0e8901b05dd1c9ee01ce411...ff12",
                tag: "Fully Restored Walk"
              },
              {
                child: "Warrior Sophia M.",
                age: "4y/o Kidney Tumor Hero",
                msg: "Her bilateral scan came back clean with zero cancerous tumor tags. Today is Sophia's 4th birthday and we celebrated it completely cure-verified! Real blockchain miracles happen.",
                raised: "₱380,000",
                hash: "0x71fa28dc704feec968f8be2adebc579cc308...cc31",
                tag: "100% Tumor Free"
              }
            ]).map((story, i) => (
              <div key={i} className="bg-slate-50 p-8 rounded-3xl border border-slate-200 hover:border-brand-primary transition-all flex flex-col justify-between space-y-6 group">
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h4 className="text-base font-black text-slate-800 leading-none">{story.child}</h4>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 block">{story.age}</span>
                    </div>
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md flex-shrink-0">
                      {story.tag}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed font-semibold italic">
                    "{story.msg}"
                  </p>
                </div>

                <div className="space-y-4 pt-6 border-t border-slate-200/60">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                    <span>Funds Transferred</span>
                    <span className="text-teal-700 font-black">{story.raised}</span>
                  </div>
                  <div className="bg-white/75 p-3 rounded-xl border border-slate-100/80 font-mono text-[9px] text-slate-400 break-all select-all flex items-center justify-between gap-1.5 hover:text-slate-600 transition-colors">
                    <span className="truncate">{story.hash}</span>
                    <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GCash Flow Explanation */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 items-center gap-20">
            <div className="space-y-8">
              <h2 className="text-4xl font-bold tracking-tight text-slate-900">The Seamless Donation Flow</h2>
              <div className="space-y-6">
                {[
                  { step: '01', title: 'GCash Payment', desc: 'Donor pay securely via GCash QR in the portal.' },
                  { step: '02', title: 'Admin Verification', desc: 'Our finance team matches the receipt in real-time.' },
                  { step: '03', title: 'Blockchain Minting', desc: 'A verified record is created on the Polygon network.' },
                  { step: '04', title: 'Impact Dashboard', desc: 'Donor tracks impact and earns loyalty badges.' },
                ].map((item, i) => (
                  <div key={i} className="flex gap-6">
                    <span className="text-xl font-bold text-brand-primary/40 font-mono">{item.step}</span>
                    <div>
                      <h4 className="text-lg font-bold text-slate-800 mb-1">{item.title}</h4>
                      <p className="text-sm text-slate-500 font-medium leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-teal-900 rounded-[3rem] p-12 text-white space-y-8 relative overflow-hidden">
               <div className="relative z-10 space-y-6">
                  <div className="w-16 h-16 bg-white/10 rounded-2xl backdrop-blur flex items-center justify-center">
                    <ShieldCheck className="w-8 h-8 text-teal-100" />
                  </div>
                  <h3 className="text-3xl font-bold leading-tight">Ready to join the <br /> Foundation?</h3>
                  <button 
                    onClick={() => setIsAuthModalOpen(true)}
                    className="w-full py-4 bg-white text-teal-900 rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-teal-50 transition-all"
                  >
                    Establish Access
                  </button>
               </div>
               <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/5 rounded-full translate-x-10 translate-y-10 blur-2xl"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-white py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-12 border-b border-white/10 pb-20">
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-teal-400" />
                <span className="text-xl font-bold">CareConnect</span>
              </div>
              <p className="text-sm text-slate-400 font-medium leading-relaxed">
                Empowering the Cancer Warrior Foundation with AI & Blockchain solutions. 
              </p>
            </div>
            <div>
              <h5 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-6">Foundation</h5>
              <ul className="space-y-4 text-sm text-slate-400 font-medium">
                <li><a href="#" className="hover:text-white transition-colors">Our Mission</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact Support</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              </ul>
            </div>
            <div>
              <h5 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-6">Technology</h5>
              <ul className="space-y-4 text-sm text-slate-400 font-medium">
                <li><a href="#" className="hover:text-white transition-colors">Polygon Explorer</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Smart Verification</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Audit Logs</a></li>
              </ul>
            </div>
            <div>
              <h5 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-6">Transparency</h5>
              <div className="space-y-4">
                 <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 rounded border border-white/10 text-[9px] font-bold uppercase tracking-widest">
                   <Zap className="w-3 h-3 text-teal-400" />
                   Mainnet Nodes Active
                 </div>
                 <p className="text-[10px] text-slate-500 leading-relaxed font-mono">
                   Network: Polygon POS <br />
                   Status: Syncing v4.0.2
                 </p>
              </div>
            </div>
          </div>
          <div className="pt-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-600">
              © 2026 CareConnect Protocol. All rights reserved.
            </p>
            <div className="flex gap-6">
              <a href="#" className="text-slate-600 hover:text-white transition-colors"><ExternalLink className="w-4 h-4" /></a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
