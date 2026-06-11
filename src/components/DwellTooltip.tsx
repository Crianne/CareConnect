import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Calendar, Wallet } from 'lucide-react';
import { cn } from '../lib/utils';

interface DwellTooltipProps {
  children: React.ReactNode;
  title: string;
  description: string;
  statusType?: 'verified' | 'pending' | 'rejected' | 'neutral';
  className?: string;
  delay?: number; // Dwell time threshold in ms
}

export function DwellTooltip({
  children,
  title,
  description,
  statusType = 'verified',
  className,
  delay = 500,
}: DwellTooltipProps) {
  const [show, setShow] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const updateCoords = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX + rect.width / 2,
      });
    }
  };

  const handleMouseEnter = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    updateCoords();
    
    timerRef.current = setTimeout(() => {
      updateCoords();
      setShow(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setShow(false);
  };

  useEffect(() => {
    const handleScrollOrResize = () => {
      if (show) {
        updateCoords();
      }
    };

    window.addEventListener('scroll', handleScrollOrResize, { passive: true });
    window.addEventListener('resize', handleScrollOrResize);
    
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      window.removeEventListener('scroll', handleScrollOrResize);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [show]);

  const getStatusStyles = () => {
    switch (statusType) {
      case 'verified':
        return {
          iconColor: 'text-emerald-500',
          borderColor: 'border-emerald-500/30',
          glowColor: 'shadow-[0_4px_24px_rgba(16,185,129,0.18)]',
          badgeText: 'On-Chain Verified'
        };
      case 'pending':
        return {
          iconColor: 'text-amber-500',
          borderColor: 'border-amber-500/30',
          glowColor: 'shadow-[0_4px_24px_rgba(245,158,11,0.18)]',
          badgeText: 'Manual Audit Pending'
        };
      case 'rejected':
        return {
          iconColor: 'text-rose-500',
          borderColor: 'border-rose-500/30',
          glowColor: 'shadow-[0_4px_24px_rgba(239,68,68,0.18)]',
          badgeText: 'Failed Verification'
        };
      default:
        return {
          iconColor: 'text-teal-400',
          borderColor: 'border-teal-700/30',
          glowColor: 'shadow-2xl',
          badgeText: 'Audit Status'
        };
    }
  };

  const statusStyle = getStatusStyles();

  return (
    <div 
      ref={triggerRef}
      className={cn("relative inline-block", className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {show && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className={cn(
                "absolute z-[9999] w-64 p-3.5 bg-slate-900 border text-slate-100 rounded-2xl text-left shadow-2xl",
                statusStyle.borderColor,
                statusStyle.glowColor
              )}
              style={{ 
                top: `${coords.top}px`,
                left: `${coords.left}px`,
                transform: 'translate(-50%, -100%) translateY(-8px)',
                backdropFilter: 'blur(12px)',
                pointerEvents: 'none'
              }}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <ShieldCheck className={cn("w-3.5 h-3.5", statusStyle.iconColor)} />
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-300">
                  {statusStyle.badgeText}
                </span>
              </div>
              {title && (
                <h5 className="text-[11px] font-black text-white leading-tight mb-1 font-sans">
                  {title}
                </h5>
              )}
              <p className="text-[10px] font-semibold text-slate-300 leading-normal">
                {description}
              </p>
              {/* Tooltip caret pointing downwards */}
              <div 
                className={cn(
                  "w-2.5 h-2.5 absolute left-1/2 -translate-x-1/2 bottom-[-5px] rotate-45 border-r border-b bg-slate-900",
                  statusStyle.borderColor
                )}
              />
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
