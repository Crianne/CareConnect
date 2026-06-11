import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, X, Sparkles, BookOpen } from 'lucide-react';
import { cn } from '../lib/utils';

interface TitleExplainerProps {
  children: React.ReactNode;
  featureName: string;
  simpleExplanation: string;
  bulletPoints?: string[];
  className?: string;
  badge?: string;
}

export function TitleExplainer({
  children,
  featureName,
  simpleExplanation,
  bulletPoints = [],
  className,
  badge = "Feature Explanation",
}: TitleExplainerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  return (
    <>
      <div
        onClick={toggleOpen}
        className={cn(
          "inline-flex items-center gap-1.5 cursor-pointer group hover:text-brand-primary transition-all duration-250 select-none border-b border-dashed border-slate-300 hover:border-brand-primary",
          className
        )}
        title="Click to see what this means"
      >
        {children}
        <motion.span
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 3, repeatType: "reverse" }}
          className="inline-flex items-center justify-center p-0.5 rounded-full text-slate-400 group-hover:text-brand-primary group-hover:bg-brand-primary/5 transition-colors"
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </motion.span>
      </div>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            {/* Explainer Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative w-full max-w-sm bg-white rounded-3xl border border-slate-100 shadow-2xl overflow-hidden p-6 text-left"
            >
              {/* Header Badge */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-1.5">
                  <div className="p-1 px-2 rounded-full bg-brand-primary/10 text-brand-primary flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-brand-primary animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-widest leading-none">
                      {badge}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Explainer Body */}
              <div className="space-y-3">
                <h4 className="text-xl font-black text-slate-800 leading-snug font-sans flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-brand-primary" />
                  {featureName}
                </h4>
                
                <p className="text-xs text-slate-600 font-medium leading-relaxed bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100">
                  {simpleExplanation}
                </p>

                {bulletPoints.length > 0 && (
                  <div className="pt-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                      Key Highlights:
                    </p>
                    <ul className="space-y-2">
                      {bulletPoints.map((point, index) => (
                        <li key={index} className="flex items-start gap-2 text-xs font-semibold text-slate-500">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-primary/70 mt-1.5 shrink-0" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <button
                onClick={() => setIsOpen(false)}
                className="mt-6 w-full py-2.5 bg-brand-primary text-white text-xs font-bold uppercase tracking-widest rounded-xl shadow-lg shadow-brand-primary/20 hover:bg-brand-primary/90 hover:shadow-xl transition-all text-center"
              >
                Got It, Thanks!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
