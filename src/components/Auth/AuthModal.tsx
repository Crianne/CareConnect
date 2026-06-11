import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, User, ShieldCheck, ArrowRight, Loader2, RefreshCw, Check, Eye, EyeOff } from 'lucide-react';
import { cn } from '../../lib/utils';

export function AuthModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { login, loginWithEmail, register, resetPassword } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [agreedRegisterTerms, setAgreedRegisterTerms] = useState(false);
  const [showRegisterTerms, setShowRegisterTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  React.useEffect(() => {
    setAgreedRegisterTerms(false);
    setShowPassword(false);
  }, [mode, isOpen]);

  const getFriendlyErrorMessage = (error: any): string => {
    const code = error?.code || '';
    const message = error?.message || '';

    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
      return 'Incorrect email address or password. Please verify your credentials and try again.';
    }
    if (code === 'auth/email-already-in-use') {
      return 'The email address is already in use by another account. Try logging in instead.';
    }
    if (code === 'auth/invalid-email') {
      return 'Please enter a valid email address.';
    }
    if (code === 'auth/weak-password') {
      return 'Your password is too weak. It must be at least 6 characters long.';
    }
    if (code === 'auth/network-request-failed') {
      return 'Network connection failed. Please check your internet or try again.';
    }
    if (code === 'auth/popup-closed-by-user') {
      return 'Login process was canceled. Please complete the Google sign-in popup to authenticate.';
    }
    if (code === 'auth/too-many-requests') {
      return 'Access to this account has been temporarily disabled due to too many failed login attempts. Please reset your password or try again later.';
    }
    return message || 'An unexpected error occurred. Please try again.';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (mode !== 'reset' && password.length < 6) {
      setError('Password must be at least 6 characters long for security purposes.');
      setLoading(false);
      return;
    }

    try {
      if (mode === 'login') {
        await loginWithEmail(email, password);
        onClose();
      } else if (mode === 'register') {
        await register(email, password, name);
        setSuccess('Verification email sent! Please check your inbox.');
        setMode('login');
      } else {
        await resetPassword(email);
        setSuccess('Password reset link sent to your email.');
        setMode('login');
      }
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await login();
      onClose();
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden relative max-h-[90vh] flex flex-col"
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8 overflow-y-auto flex-1">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-teal-900 rounded-lg flex items-center justify-center text-white">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">
                {mode === 'login' ? 'Welcome Back' : mode === 'register' ? 'Join the Cause' : 'Reset Password'}
              </h2>
              <p className="text-xs text-slate-500 font-medium tracking-tight">CareConnect Secure Access</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 ring-brand-primary/20 outline-none text-sm transition-all"
                    placeholder="John Doe"
                    value={name}
                    onChange={e => setName(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="email"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 ring-brand-primary/20 outline-none text-sm transition-all"
                  placeholder="name@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>

            {mode !== 'reset' && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type={showPassword ? "text" : "password"}
                    required
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 ring-brand-primary/20 outline-none text-sm transition-all"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <p className="text-[10px] font-bold text-red-500 uppercase tracking-wide bg-red-50 p-2 rounded border border-red-100">
                {error}
              </p>
            )}

            {success && (
              <p className="text-[10px] font-bold text-teal-600 uppercase tracking-wide bg-teal-50 p-2 rounded border border-teal-100">
                {success}
              </p>
            )}

            {mode === 'register' && (
              <div className="flex items-start gap-2.5 mt-2 text-left bg-slate-50 p-3 rounded-xl border border-slate-100" id="registration-terms-check">
                <button
                  type="button"
                  id="reg-terms-checkbox"
                  onClick={() => setAgreedRegisterTerms(!agreedRegisterTerms)}
                  className={cn(
                    "mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0 animate-fade-in",
                    agreedRegisterTerms 
                      ? "bg-brand-primary border-brand-primary text-white" 
                      : "border-slate-300 bg-white hover:border-slate-400"
                  )}
                >
                  {agreedRegisterTerms && <Check className="w-3 h-3 stroke-[3]" />}
                </button>
                <p className="text-[11px] text-slate-500 font-medium leading-normal select-none">
                  I agree to the <button type="button" onClick={() => setShowRegisterTerms(true)} className="text-brand-primary font-bold underline hover:text-teal-600 transition-colors">Donor Terms &amp; Conditions</button> regarding transparent on-chain logging and fund matching rules.
                </p>
              </div>
            )}

            <button 
              type="submit"
              disabled={loading || (mode === 'register' && !agreedRegisterTerms)}
              className="w-full py-3 bg-brand-primary text-white rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-brand-primary/90 transition-all shadow-sm uppercase text-xs tracking-widest disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Account' : 'Send Reset Link'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100"></div>
            </div>
            <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-widest">
              <span className="bg-white px-3 text-slate-400 italic">or continue with</span>
            </div>
          </div>

          <button 
            onClick={handleGoogleLogin}
            className="w-full py-3 bg-white text-slate-700 border border-slate-200 rounded-lg font-bold flex items-center justify-center gap-3 hover:bg-slate-50 transition-all text-xs uppercase tracking-widest shadow-sm"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-4 h-4 outline-none" alt="Google" />
            Sign in with Google
          </button>

          <div className="mt-8 flex flex-col items-center gap-2">
            {mode === 'login' ? (
              <>
                <button onClick={() => setMode('register')} className="text-[10px] font-bold text-slate-500 hover:text-brand-primary transition-colors uppercase tracking-widest">
                  Don't have an account? <span className="text-brand-primary">Sign up</span>
                </button>
                <button onClick={() => setMode('reset')} className="text-[10px] font-bold text-slate-400 hover:text-slate-600 transition-colors italic">
                  Forgot password?
                </button>
              </>
            ) : (
              <button onClick={() => setMode('login')} className="text-[10px] font-bold text-slate-500 hover:text-brand-primary transition-colors uppercase tracking-widest">
                Already have an account? <span className="text-brand-primary">Sign in</span>
              </button>
            )}
          </div>
        </div>

        <div className="bg-slate-50 p-4 border-t border-slate-100 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
            <ShieldCheck className="w-3 h-3 text-teal-500" />
            Mainnet-Verified Security Protocol
          </p>
        </div>
      </motion.div>

      <AnimatePresence>
        {showRegisterTerms && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 p-8 flex flex-col max-h-[85vh] relative"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4 shrink-0">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-brand-primary" />
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest font-sans">
                    Donor Terms &amp; Conditions
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRegisterTerms(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto pr-2 space-y-4 text-xs text-slate-600 leading-relaxed font-normal flex-1">
                <div>
                  <h4 className="font-bold text-slate-800 mb-1">
                    1. Account Accuracy &amp; Auditable Profile
                  </h4>
                  <p>
                    All registered donors must verify their details truthfully. Submission of fraudulent records or mock payment verification details is strictly treated as a direct breach of CareConnect protocols.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-800 mb-1">
                    2. Polygon Blockchain Logging
                  </h4>
                  <p>
                    Each matched donation receipt generates an immutable cryptographically secure ledger entry on-chain. Masked anonymous options protect identities for public registry viewing.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-800 mb-1">
                    3. Strict Patient Privacy
                  </h4>
                  <p>
                    Medical details and identities of pediatric oncology cases uploaded on pre-verified clinic lists are highly confidential. Exfiltration, screenshot farming, or public copying of patient profiles is forbidden.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-800 mb-1">
                    4. Verified Matching &amp; Pool Allocation
                  </h4>
                  <p>
                    CareConnect matches individual hospital case targets with unified funding streams directly assisting authorized pharmacies and oncologists. Donations are non-refundable once approved.
                  </p>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 mt-4 shrink-0 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowRegisterTerms(false)}
                  className="flex-1 py-3 text-slate-500 hover:text-slate-800 font-bold uppercase text-xs tracking-wider"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAgreedRegisterTerms(true);
                    setShowRegisterTerms(false);
                  }}
                  className="flex-1 py-3 bg-brand-primary text-white font-bold uppercase text-xs tracking-wider rounded-xl hover:bg-brand-primary/95 transition-all text-center"
                >
                  Confirm Agree
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
