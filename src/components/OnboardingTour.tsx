import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Heart, 
  Award, 
  ShieldCheck, 
  ArrowRight, 
  ArrowLeft, 
  X, 
  Check, 
  Navigation,
  Activity,
  Gavel,
  Compass,
  Eye,
  ClipboardList
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

interface TourStep {
  title: string;
  subtitle: string;
  description: string;
  badge: string;
  icon: React.ComponentType<any>;
  themeColor: string;
  highlightText: string;
  selector: string;
  targetTab: string;
  subTab?: string;
}

const DONOR_STEPS: TourStep[] = [
  {
    title: "Welcome to CareConnect",
    subtitle: " Philippine Children Cancer Funds",
    description: "Welcome to CareConnect! We help pool funds to support young Filipino children fighting cancer. This quick tour will show you how to navigate our features. Tip: If you don't know the function of a feature, look for titles with a dashed underline—you can click them to open a helpful tooltip explanation!",
    badge: "Quick Tour",
    icon: Sparkles,
    themeColor: "from-pink-500 to-rose-600 outline-pink-500/20 text-rose-500",
    highlightText: "Click titles with dashed underlines for feature tooltips!",
    selector: "", 
    targetTab: "dashboard"
  },
  {
    title: "Meet the Children",
    subtitle: "Young Warriors needing support",
    description: "View clinical profiles of kids fighting cancer. Read their real stories, see clinical progress tracking, and make a donation to help them (starting at ₱100).",
    badge: "Kids Profile List",
    icon: Heart,
    themeColor: "from-rose-500 to-pink-600 outline-rose-500/20 text-rose-500",
    highlightText: "Donate for chemotherapy and life-saving treatments.",
    selector: "#nav-item-patients, #mob-nav-item-patients",
    targetTab: "patients"
  },
  {
    title: "Charity Items & Auctions",
    subtitle: "Bid on items to help fund patients",
    description: "Browse items donated by generous supporters, such as art or collectible memorabilia. All bidding proceeds go directly to helping the kids' cancer care.",
    badge: "Auctions",
    icon: Gavel,
    themeColor: "from-indigo-500 to-blue-600 outline-indigo-500/20 text-indigo-500",
    highlightText: "Every bid supports children's treatments.",
    selector: "#nav-item-auctions, #mob-nav-item-auctions",
    targetTab: "auctions"
  },
  {
    title: "Transparency Ledger",
    subtitle: "Track where every Peso goes",
    description: "See exactly where the funds go in real-time. Check actual receipt photos, track chemical supplies purchased, and find verified proof of payments.",
    badge: "Live Tracking",
    icon: ShieldCheck,
    themeColor: "from-emerald-500 to-teal-600 outline-emerald-500/20 text-emerald-500",
    highlightText: "100% transparency with receipts and tracking.",
    selector: "#nav-item-transparency, #mob-nav-item-transparency",
    targetTab: "transparency"
  },
  {
    title: "Your Impact & Badges",
    subtitle: "See your kindness achievements",
    description: "Get custom badges (like 'Compassionate Soul') when your donations are verified, level up in rank, and view your kindness milestones!",
    badge: "Kindness Rank",
    icon: Award,
    themeColor: "from-amber-500 to-orange-600 outline-amber-500/20 text-amber-500",
    highlightText: "Earn fun badges for supporting children.",
    selector: "#nav-item-profile, #mob-nav-item-profile",
    targetTab: "profile"
  },
  {
    title: "Need a Guide?",
    subtitle: "Restart this tour anytime",
    description: "Don't worry, you can always restart this tour by clicking the 'Guide Tour' button at the top of the header!",
    badge: "Help Guide",
    icon: Compass,
    themeColor: "from-pink-500 to-rose-600 outline-pink-500/20 text-pink-500",
    highlightText: "Interactive help is always here.",
    selector: "#nav-tour-guide-btn",
    targetTab: "profile"
  }
];

const ADMIN_STEPS: TourStep[] = [
  {
    title: "Welcome Administrator",
    subtitle: "Admin Control Panel Guide",
    description: "Welcome to the Admin Dashboard. This walkthrough will show you how to manage patient profiles, review incoming donation proofs, audit purchases, and run controls. Tip: If you don't know the functions of any admin/ledger features, look for titles with a dashed underline—you can click them to open a helpful tooltip explanation!",
    badge: "Admin Guide",
    icon: ShieldCheck,
    themeColor: "from-teal-800 to-indigo-900 outline-teal-800/10 text-teal-400",
    highlightText: "Look for titles with dashed underlines to open interactive tooltips!",
    selector: "",
    targetTab: "admin",
    subTab: "cases"
  },
  {
    title: "Clinical Case Submissions",
    subtitle: "Manage Patient Files",
    description: "Review registered pediatric medical profiles, configure progress indicators, and adjust active fundraising goal limits.",
    badge: "Patient Listings",
    icon: ClipboardList,
    themeColor: "from-sky-600 to-blue-700 outline-sky-500/20 text-sky-500",
    highlightText: "Add and edit active children profile listings.",
    selector: "#admin-subtab-cases",
    targetTab: "admin",
    subTab: "cases"
  },
  {
    title: "Donor Analytics",
    subtitle: "View donor statistics and tiers",
    description: "Monitor donor activity, view contribution leaderboards, examine loyalty program tiers, and see recent user support history.",
    badge: "Supporter Database",
    icon: Award,
    themeColor: "from-amber-500 to-orange-600 outline-amber-500/20 text-amber-500",
    highlightText: "Keep in touch with supporters.",
    selector: "#admin-subtab-donors",
    targetTab: "admin",
    subTab: "donors"
  },
  {
    title: "Donation Verification",
    subtitle: "Verify GCash & Bank Receipts",
    description: "Look at GCash or bank screenshots uploaded by donors. Click approve to update the funding balance and make it public.",
    badge: "Receipt Approvals",
    icon: Eye,
    themeColor: "from-rose-500 to-pink-600 outline-rose-500/20 text-rose-500",
    highlightText: "Approve money proofs to update active balances.",
    selector: "#admin-subtab-verification",
    targetTab: "admin",
    subTab: "verification"
  },
  {
    title: "Charity Auctions Clearance",
    subtitle: "Authorize Auction Pools",
    description: "Review collectibles, arts, or items. You can approve drafts or end active auctions to convert them to care funding.",
    badge: "Auctions Manager",
    icon: Gavel,
    themeColor: "from-indigo-500 to-purple-600 outline-indigo-500/20 text-indigo-500",
    highlightText: "Curate and publish items for active public auctions.",
    selector: "#admin-subtab-auctions",
    targetTab: "admin",
    subTab: "auctions"
  },
  {
    title: "Log Clinic Expenses",
    subtitle: "Add medical purchases & bills",
    description: "Log chemotherapy drug costs, clinic bills, and hospital payout events. This shows donors exactly how and where money is being spent.",
    badge: "Expense Logging",
    icon: ClipboardList,
    themeColor: "from-emerald-600 to-teal-700 outline-emerald-500/20 text-emerald-500",
    highlightText: "Publish real expense logs to maintain trust.",
    selector: "#admin-subtab-reports",
    targetTab: "admin",
    subTab: "reports"
  },
  {
    title: "Survivor Stories",
    subtitle: "Update Recovery Stories",
    description: "Share encouraging recovery milestones, updates, and thank-you letters from healed children to keep donors inspired.",
    badge: "Milestone Stories",
    icon: Heart,
    themeColor: "from-pink-500 to-rose-600 outline-pink-500/20 text-pink-500",
    highlightText: "Publish healing progress updates to motivate community.",
    selector: "#admin-subtab-stories",
    targetTab: "admin",
    subTab: "stories"
  },
  {
    title: "System Controls",
    subtitle: "Global settings and QR setup",
    description: "Update the GCash deposit QR code graphic, change basic fund rules, or modify operational parameters.",
    badge: "Settings Hub",
    icon: ShieldCheck,
    themeColor: "from-teal-800 to-slate-900 outline-teal-800/10 text-slate-300",
    highlightText: "Adjust global app values easily.",
    selector: "#admin-subtab-control",
    targetTab: "admin",
    subTab: "control"
  },
  {
    title: "Live Preview View",
    subtitle: "See what donors see",
    description: "Use this button to quickly look at patient screens, auction catalogs, or expense listings from a regular donor's viewpoint.",
    badge: "Donor Preview",
    icon: Eye,
    themeColor: "from-emerald-500 to-teal-600 outline-emerald-500/20 text-emerald-500",
    highlightText: "Instantly check your modified records live.",
    selector: "#operational-hub-preview-btn",
    targetTab: "admin",
    subTab: "cases"
  },
  {
    title: "Restart Guide Anytime",
    subtitle: "Need help again?",
    description: "Click the 'Guide Tour' sparkles icon in the menu bar whenever you want to reset or rerun these prompts!",
    badge: "Help Option",
    icon: Compass,
    themeColor: "from-pink-500 to-rose-600 outline-pink-500/20 text-pink-500",
    highlightText: "Full interactive help is always ready.",
    selector: "#nav-tour-guide-btn",
    targetTab: "admin"
  }
];

interface OnboardingTourProps {
  onClose?: () => void;
  isOpenManual?: boolean;
}

export function OnboardingTour({ onClose, isOpenManual = false }: OnboardingTourProps) {
  const { profile } = useAuth();
  
  const [isOpen, setIsOpen] = useState(() => {
    if (isOpenManual) return true;
    const completed = localStorage.getItem('careconnect_tour_completed');
    return !completed;
  });
  
  const [currentStep, setCurrentStep] = useState(0);
  const [isInCursorMode, setIsInCursorMode] = useState(false);
  const [targetRect, setTargetRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const [mouseOverTarget, setMouseOverTarget] = useState(false);
  const [showDwellTooltip, setShowDwellTooltip] = useState(false);

  // Monitor cursor dwell/hover on the active pointing target
  useEffect(() => {
    if (!isOpen || !targetRect || currentStep === 0) {
      setMouseOverTarget(false);
      setShowDwellTooltip(false);
      return;
    }

    let hoverTimeout: any;

    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const padding = 40;
      const isInside = 
        clientX >= targetRect.left - padding &&
        clientX <= targetRect.left + targetRect.width + padding &&
        clientY >= targetRect.top - padding &&
        clientY <= targetRect.top + targetRect.height + padding;

      if (isInside) {
        if (!mouseOverTarget) {
          setMouseOverTarget(true);
          clearTimeout(hoverTimeout);
          hoverTimeout = setTimeout(() => {
            setShowDwellTooltip(true);
          }, 700); // Trigger after 700ms of dwell time
        }
      } else {
        if (mouseOverTarget) {
          setMouseOverTarget(false);
          clearTimeout(hoverTimeout);
          setShowDwellTooltip(false);
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(hoverTimeout);
    };
  }, [targetRect, isOpen, currentStep, mouseOverTarget]);

  // Reset dwell states when slide changes
  useEffect(() => {
    setMouseOverTarget(false);
    setShowDwellTooltip(false);
  }, [currentStep]);

  // Monitor screen width to enable dynamic mobile positioning anchors
  useEffect(() => {
    const checkMobileState = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobileState();
    window.addEventListener('resize', checkMobileState);
    return () => window.removeEventListener('resize', checkMobileState);
  }, []);

  // Separate distinct paths based on profile role check
  const steps = useMemo(() => {
    const isAdmin = profile?.role === 'admin';
    return isAdmin ? ADMIN_STEPS : DONOR_STEPS;
  }, [profile?.role]);

  // Sync state with global triggers
  useEffect(() => {
    const handleTriggerTour = () => {
      setCurrentStep(0);
      setIsInCursorMode(false);
      setIsOpen(true);
    };
    window.addEventListener('trigger-onboarding-tour', handleTriggerTour);
    return () => {
      window.removeEventListener('trigger-onboarding-tour', handleTriggerTour);
    };
  }, []);

  const step = steps[currentStep] || steps[0];

  // Auto-switch tabs to display appropriate pages under validation targets
  useEffect(() => {
    if (!isOpen || !step) return;
    
    // Automatically switch tabs if this step specifies a different view
    if (step.targetTab && currentStep > 0) {
      window.dispatchEvent(new CustomEvent('nav-change', { 
        detail: step.targetTab, 
        subTab: step.subTab 
      } as any));
    }
  }, [currentStep, isOpen, step]);

  // Track the target element's position on screen
  useEffect(() => {
    // Only track if the step defines a selector and we have actively entered Pointer/Cursor mode (from step 1 onwards)
    if (!isOpen || !step || !step.selector || currentStep === 0) {
      setTargetRect(null);
      return;
    }

    const updatePosition = () => {
      if (!step.selector) {
        setTargetRect(null);
        return;
      }

      // Support mobile vs desktop responsive variants by assessing visibility of items in comma-separated list
      const selectors = step.selector.split(',').map(s => s.trim());
      let element: Element | null = null;

      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            element = el;
            break;
          }
        }
      }

      if (element) {
        const rect = element.getBoundingClientRect();
        setTargetRect({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height
        });
      } else {
        setTargetRect(null);
      }
    };

    // Calculate instantly
    updatePosition();

    const timeout = setTimeout(updatePosition, 100);
    const intervalId = setInterval(updatePosition, 400);

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      clearTimeout(timeout);
      clearInterval(intervalId);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [currentStep, isOpen, step, isInCursorMode]);

  const handleNext = () => {
    if (currentStep === 0) {
      // Transition from Welcoming Center Popup to Pointer Mode
      setIsInCursorMode(true);
      setCurrentStep(1);
    } else if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    } else if (currentStep === 1) {
      // Transition back to center welcome popup
      setIsInCursorMode(false);
      setCurrentStep(0);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('careconnect_tour_completed', 'true');
    setIsOpen(false);
    setIsInCursorMode(false);
    window.dispatchEvent(new CustomEvent('nav-change', { detail: 'dashboard' }));
    if (onClose) onClose();
  };

  const handleSkip = () => {
    handleComplete();
  };

  if (!isOpen || !step) return null;

  const StepIcon = step.icon;

  // Let's compute styles to place the floating tooltip cleanly next to the pointed target element
  const getTooltipStyle = () => {
    // On mobile devices, anchor the walkthrough step cards neatly at the bottom or top of the screen depending on target coordinate to prevent overlay blocking
    if (isMobile && !isIntroStep) {
      const isTargetInBottomHalf = targetRect && (targetRect.top + targetRect.height / 2 > window.innerHeight / 2);
      if (isTargetInBottomHalf) {
        return {
          left: '16px',
          right: '16px',
          top: '16px',
          position: 'fixed' as const
        };
      } else {
        return {
          left: '16px',
          right: '16px',
          bottom: '16px',
          position: 'fixed' as const
        };
      }
    }

    if (!targetRect || currentStep === 0) {
      return {
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        position: 'fixed' as const
      };
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const tooltipWidth = 360; 
    
    // Position starting point directly below or above the target element
    let left = targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2);
    let top = targetRect.top + targetRect.height + 20;

    // Safety bounds on left/right edges
    if (left < 16) {
      left = 16;
    } else if (left + tooltipWidth > viewportWidth - 16) {
      left = viewportWidth - tooltipWidth - 16;
    }

    // Safety bounds on top/bottom edges
    if (top + 280 > viewportHeight - 16) {
      // Position above the target element if there is no space below
      top = targetRect.top - 290;
    }
    
    if (top < 16) {
      top = 16;
    }

    return {
      left: `${left}px`,
      top: `${top}px`,
      position: 'fixed' as const
    };
  };

  const isIntroStep = currentStep === 0;
  const tooltipPositionStyle = getTooltipStyle();
  const isAdminPath = profile?.role === 'admin';
  const shouldCenter = isIntroStep || !targetRect;

  return (
    <>
      {/* Dimmed Background Overlay - Only rendered on step 0 */}
      <AnimatePresence>
        {isIntroStep && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleSkip}
            className="fixed inset-0 z-[990] bg-slate-950/70 backdrop-blur-md cursor-pointer transition-all duration-300"
          />
        )}
      </AnimatePresence>


      {/* Spotlight highlight over pointed target element using an outward projection shadow to block out surroundings while keeping the target physically 100% crisp and clear */}
      <AnimatePresence>
        {targetRect && !isIntroStep && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{  
              opacity: 1,
              scale: 1,
              left: targetRect.left - 6,
              top: targetRect.top - 6,
              width: targetRect.width + 12,
              height: targetRect.height + 12
            }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed z-[991] rounded-2xl border-4 border-rose-500 bg-transparent shadow-[0_0_0_9999px_rgba(15,23,42,0.45),0_0_20px_rgba(244,63,94,0.6)] pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Pulsing Pointer Finger / Cursor pointing to section */}
      <AnimatePresence>
        {targetRect && !isIntroStep && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              x: targetRect.left + targetRect.width / 2,
              y: targetRect.top + targetRect.height / 2
            }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', damping: 20, stiffness: 220 }}
            className="fixed top-0 left-0 z-[995] pointer-events-none"
          >
            <div className="relative">
              {/* Multiplying background pulse radars (exactly centered on the target) */}
              <span className="absolute -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-rose-500/40 animate-ping" />
              <span className="absolute -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-rose-400 border border-white shadow-sm" />
              
              {/* Floating Badge (placed above or below the center dynamically to avoid going off-screen) */}
              <motion.div
                animate={{ 
                  y: (targetRect.top + targetRect.height / 2 > window.innerHeight / 2)
                    ? [-35, -43, -35] // bounce above
                    : [25, 17, 25],  // bounce below
                  scale: [1, 0.92, 1]
                }}
                transition={{ 
                  repeat: Infinity, 
                  duration: 1.0,
                  ease: "easeInOut" 
                }}
                className="absolute -translate-x-1/2 text-[9px] font-black uppercase tracking-widest text-white bg-rose-600 border-2 border-white px-3 py-1.5 rounded-full shadow-2xl flex items-center gap-1 whitespace-nowrap"
              >
                <Navigation className={cn(
                  "w-3 h-3 text-white fill-white",
                  (targetRect.top + targetRect.height / 2 > window.innerHeight / 2)
                    ? "rotate-[45deg]" // point down to the target from above
                    : "rotate-[225deg]" // point up to the target from below
                )} />
                <span>POINTER TARGET</span>
              </motion.div>

              {/* Hover Dwell Short Description Tooltip */}
              <AnimatePresence>
                {showDwellTooltip && (
                  <motion.div
                    initial={{ opacity: 0, y: (targetRect.top + targetRect.height / 2 > window.innerHeight / 2) ? 10 : -10, scale: 0.92 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.92 }}
                    className={cn(
                      "absolute -translate-x-1/2 w-64 p-3 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl text-center z-[1000]",
                      (targetRect.top + targetRect.height / 2 > window.innerHeight / 2)
                        ? "bottom-[50px] mb-2" // position neatly above the bounced badge
                        : "top-[65px] mt-2"    // position neatly below the bounced badge
                    )}
                  >
                    <div className="text-[9px] uppercase tracking-wider font-extrabold text-rose-400 mb-1 flex items-center justify-center gap-1">
                      <Sparkles className="w-3 h-3 text-rose-400 animate-pulse" />
                      Guided Insight
                    </div>
                    <p className="text-[11px] font-bold text-white leading-snug">
                      {step.title}
                    </p>
                    <p className="text-[10px] font-semibold text-slate-350 mt-1 leading-normal">
                      {step.highlightText || step.subtitle}
                    </p>
                    <div className="w-2.5 h-2.5 bg-slate-900 absolute left-1/2 -translate-x-1/2 rotate-45"
                      style={
                        (targetRect.top + targetRect.height / 2 > window.innerHeight / 2)
                          ? { bottom: '-5px', borderRight: '1px solid rgb(51 65 85)', borderBottom: '1px solid rgb(51 65 85)' }
                          : { top: '-5px', borderTop: '1px solid rgb(51 65 85)', borderLeft: '1px solid rgb(51 65 85)' }
                      }
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Guided Tooltip or Central Dialogue */}
      <AnimatePresence>
        <div className={cn(
          shouldCenter ? "fixed inset-0 z-[993] flex items-center justify-center p-4 pointer-events-none" : "contents"
        )}>
          <motion.div
            key={currentStep}
            initial={isIntroStep ? { opacity: 0, scale: 0.95 } : { opacity: 0, y: 15, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 26, stiffness: 240 }}
            style={shouldCenter ? undefined : tooltipPositionStyle}
            className={cn(
              "z-[993] bg-white border shadow-2xl overflow-hidden pointer-events-auto",
              isIntroStep 
                ? "rounded-3xl w-full max-w-xl border-slate-200"
                : "rounded-2xl border-rose-500/40 shadow-rose-950/10 md:w-[360px] w-auto animate-fade-in" // dynamic responsive widths
            )}
          >
            {/* Top Decorative Colored Glow Border */}
            <div className={cn(
              "h-1.5 bg-gradient-to-r transition-all duration-500",
              step.themeColor
            )} />

            {/* Card Header */}
            <div className="p-5 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest rounded border flex items-center gap-1",
                  isAdminPath 
                    ? "bg-teal-50 text-teal-800 border-teal-100" 
                    : "bg-pink-50 text-pink-800 border-pink-100"
                )}>
                  <Sparkles className="w-2.5 h-2.5 animate-pulse" />
                  {isAdminPath ? "Admin Step" : "Donor Step"} {currentStep} of {steps.length - 1}
                </span>
                {!isIntroStep && (
                  <span className="px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest bg-rose-50 text-rose-700 rounded border border-rose-100 animate-pulse">
                    Pointer Active
                  </span>
                )}
              </div>
              
              <button 
                onClick={handleSkip}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all cursor-pointer"
                title="Skip Tour"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Interactive Slide Body Content */}
            <div className="p-5 space-y-4">
              {/* Visual Icon Box */}
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow relative",
                  step.themeColor
                )}>
                  <StepIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="text-[9px] uppercase tracking-widest font-black text-slate-400 block leading-tight">
                    {step.badge}
                  </span>
                  <h2 className="text-sm md:text-base font-black text-slate-800 tracking-tight leading-tight">
                    {step.title}
                  </h2>
                </div>
              </div>

              {/* Subtitle */}
              <h3 className="text-xs font-bold text-teal-800 border-l-2 border-teal-500 pl-2 uppercase tracking-wide">
                {step.subtitle}
              </h3>

              {/* Comprehensive Description text */}
              <p className={cn(
                "text-slate-600 leading-relaxed font-semibold",
                isIntroStep ? "text-xs md:text-sm" : "text-xs"
              )}>
                {step.description}
              </p>

              {/* Bottom highlight banner */}
              <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span className="text-[10px] text-slate-600 font-bold leading-tight">
                  {step.highlightText}
                </span>
              </div>
            </div>

            {/* Bottom Footer Actions block */}
            <div className="px-5 py-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-4">
              {/* Dot slide indicator indexes */}
              <div className="flex items-center gap-1.5">
                {steps.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentStep(idx)}
                    className={cn(
                      "rounded-full transition-all duration-300 cursor-pointer",
                      idx === currentStep 
                        ? (isAdminPath ? "w-4 h-1.5 bg-teal-800" : "w-4 h-1.5 bg-pink-600") 
                        : "w-1.5 h-1.5 bg-slate-200 hover:bg-slate-300"
                    )}
                    aria-label={`Go to slide ${idx}`}
                  />
                ))}
              </div>

              {/* Back, Next and Skip Actions */}
              <div className="flex items-center gap-2">
                {currentStep > 0 && (
                  <button
                    onClick={handleBack}
                    className="px-2.5 py-1.5 bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all duration-150 cursor-pointer"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    Back
                  </button>
                )}

                <button
                  onClick={handleNext}
                  className={cn(
                    "px-3.5 py-2 text-white rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1 transition-all duration-150 shadow cursor-pointer text-center",
                    isAdminPath ? "bg-teal-950 hover:bg-teal-900" : "bg-slate-900 hover:bg-black"
                  )}
                >
                  {currentStep === 0 ? (
                    <>
                      <span>Start Guided Walkthrough</span>
                      <ArrowRight className="w-3 h-3 text-pink-300" />
                    </>
                  ) : currentStep === steps.length - 1 ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>Finish</span>
                    </>
                  ) : (
                    <>
                      <span>Next</span>
                      <ArrowRight className="w-3 h-3 text-teal-300" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    </>
  );
}
