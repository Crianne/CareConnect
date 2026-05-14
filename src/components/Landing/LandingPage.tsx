import React, { useState } from 'react';
import { motion } from 'framer-motion';
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
  Sparkles
} from 'lucide-react';
import { AuthModal } from '../Auth/AuthModal';

export function LandingPage() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

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
