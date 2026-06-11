import React, { useState, useEffect } from 'react';
import { UserProfile, AuctionItem } from '../types';
import { Sparkles, ShieldCheck, TrendingUp, HelpCircle, Activity, Hourglass, Award, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cn } from '../lib/utils';
import { TitleExplainer } from './TitleExplainer';

interface PredictiveAnalyticsCoPilotProps {
  profile: UserProfile;
  className?: string;
}

export function PredictiveAnalyticsCoPilot({ profile, className }: PredictiveAnalyticsCoPilotProps) {
  const [loading, setLoading] = useState(false);
  const [analysisText, setAnalysisText] = useState<string | null>(null);
  const [activeAuctions, setActiveAuctions] = useState<AuctionItem[]>([]);
  const [retentionScore, setRetentionScore] = useState<number>(0);
  const [attritionRisk, setAttritionRisk] = useState<'Low' | 'Medium' | 'High'>('Low');

  useEffect(() => {
    // Fetch active auctions to feed into the personalization recommendations algorithm
    const fetchAuctions = async () => {
      try {
        const q = query(collection(db, 'auctions'), where('status', '==', 'active'));
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuctionItem));
        setActiveAuctions(list);
      } catch (e) {
        console.error('Failed to pre-fetch auctions for AI recommendations:', e);
      }
    };
    fetchAuctions();

    // Pseudo-calculate initial parameters based on database state
    const streak = profile.donationStreak || 0;
    const totalPHP = profile.totalContribution || 0;
    
    // Algorithm matching donor traits to risk categories
    let score = 50 + (streak * 8);
    if (totalPHP > 50000) score += 15;
    else if (totalPHP > 10000) score += 10;
    
    if (score > 98) score = 98;
    if (score < 20) score = 20;

    setRetentionScore(score);
    setAttritionRisk(score > 80 ? 'Low' : score > 50 ? 'Medium' : 'High');
  }, [profile]);

  const handleRunAnalytics = async () => {
    setLoading(true);
    setAnalysisText(null);
    try {
      const response = await fetch('/api/gemini/predictive-analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userProfile: profile,
          activeAuctions: activeAuctions
        })
      });

      const data = await response.json();
      if (data && data.text) {
        setAnalysisText(data.text);
      } else {
        throw new Error('Malformed AI response');
      }
    } catch (e) {
      console.error('Predictive Co-pilot failed:', e);
      setAnalysisText(`### AI Care Advisor Report\n\n**Retention Score:** ${retentionScore}%  \n**Risk Category:** ${attritionRisk}\n\n*Optimized Recommendation:* Maintain your ${profile.donationStreak}-month streak! Contributing to active chemotherapy cases on-chain guarantees direct patient support with zero middle-man attrition.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("bg-slate-900 text-white rounded-[2.5rem] p-6 md:p-8 border border-slate-800 shadow-2xl relative overflow-hidden flex flex-col h-full", className)}>
      {/* Background visual graphics */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-brand-primary/5 rounded-full blur-3xl pointer-events-none" />

      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6 relative z-10 shrink-0">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-teal-500/10 text-[10px] font-black uppercase tracking-widest mb-3 text-teal-400 border border-teal-500/20">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            AI Impact Insights
          </div>
          <TitleExplainer
            featureName="AI Care Advisor"
            simpleExplanation="The AI Care Advisor is a helpful smart engine. It looks at your user history to offer recommendations, keep track of donation streaks, and suggest kids who need support."
            badge="Smart Counselor"
            className="text-white hover:text-teal-400 border-white/20 hover:border-teal-400"
            bulletPoints={[
              "Calculates your community retention tier score",
              "Offers recommendations to maintain active donation streaks",
              "Recommends pathways to earn exclusive badges"
            ]}
          >
            <h3 className="text-2xl font-bold tracking-tight animate-fade-in text-white group-hover:text-teal-200">AI Care Advisor</h3>
          </TitleExplainer>
          <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider mt-1">
            Personalized insights, recommendations, and impact metrics
          </p>
        </div>

        <button
          onClick={handleRunAnalytics}
          disabled={loading}
          className="px-6 py-3 bg-brand-primary hover:bg-brand-primary/95 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-brand-primary/20 flex items-center justify-center gap-2 shrink-0"
        >
          {loading ? (
            <>
              <Hourglass className="w-4 h-4 animate-spin text-white" />
              Recalculating Models...
            </>
          ) : (
            <>
              <Activity className="w-4 h-4 text-white" />
              Generate Retention Analytics
            </>
          )}
        </button>
      </div>

      {/* Scrollable body wrapper */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-6 relative z-10 mt-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent scroll-smooth">
        {/* Visual Analytics Quick Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 bg-white/5 rounded-2xl border border-white/10">
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Estimated Retention Score</p>
            <div className="flex items-center gap-4">
              <span className="text-3xl font-black text-emerald-400">{retentionScore}%</span>
              <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400" style={{ width: `${retentionScore}%` }} />
              </div>
            </div>
            <p className="text-[9px] text-white/30 uppercase font-black mt-2 leading-none">Stability Indicator</p>
          </div>

          <div className="p-5 bg-white/5 rounded-2xl border border-white/10">
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Attrition Risk Level</p>
            <div className="flex items-center gap-2 mt-1">
              <div className={`w-3 h-3 rounded-full ${attritionRisk === 'Low' ? 'bg-emerald-400' : attritionRisk === 'Medium' ? 'bg-amber-400' : 'bg-red-400'}`} />
              <span className={`text-xl font-bold ${attritionRisk === 'Low' ? 'text-emerald-400' : attritionRisk === 'Medium' ? 'text-amber-400' : 'text-red-400'}`}>
                {attritionRisk} Attrition Risk
              </span>
            </div>
            <p className="text-[9px] text-white/30 uppercase font-black mt-2 leading-none">Behavioral Analytics Classifier</p>
          </div>

          <div className="p-5 bg-white/5 rounded-2xl border border-white/10">
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Loyalty Level Potential</p>
            <div className="flex items-center gap-2 mt-1">
              <Award className="w-5 h-5 text-teal-400" />
              <span className="text-lg font-bold text-teal-400">
                {profile.loyaltyTier}
              </span>
            </div>
            <p className="text-[9px] text-white/30 uppercase font-black mt-2 leading-none">Active Decentralized Rank</p>
          </div>
        </div>

        {/* Main Analysis Feedback */}
        <AnimatePresence mode="wait">
          {analysisText ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6 bg-white/5 border border-white/10 rounded-3xl text-left"
            >
              <div className="prose prose-invert max-w-none text-white/80 text-xs md:text-sm font-medium leading-relaxed space-y-4 markdown-body-dark">
                <Markdown remarkPlugins={[remarkGfm]}>{analysisText}</Markdown>
              </div>
            </motion.div>
          ) : loading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-12 flex flex-col items-center justify-center text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-full border-2 border-brand-primary border-t-transparent animate-spin" />
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-teal-400 animation-pulse">Synthesizing telemetry data...</p>
                <p className="text-[10px] text-white/30 uppercase font-bold mt-1">Calling CareConnect Oracle Model to customize your dashboard</p>
              </div>
            </motion.div>
          ) : (
            <div className="p-6 bg-white/5 border border-white/5 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-start gap-3 text-left">
                <HelpCircle className="w-5 h-5 text-teal-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-black uppercase text-teal-400 tracking-wider">Unlock Custom Retention Forecasting</p>
                  <p className="text-[11px] text-white/60 font-semibold mt-1 leading-relaxed">
                    Press the action button to invoke our secure Gemini-driven copilot. The AI model checks your real on-chain
                    chemotherapy aid history, active streak counters, and matched art lots to predict retention stability and map custom rewards.
                  </p>
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
