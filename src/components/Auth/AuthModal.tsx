import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, User, ShieldCheck, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

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
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await login();
      onClose();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden relative"
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8">
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
                    type="password"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 ring-brand-primary/20 outline-none text-sm transition-all"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
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

            <button 
              type="submit"
              disabled={loading}
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

          <div className="mt-8 pt-8 border-t border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center mb-4">Foundation Quick Start</p>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={handleGoogleLogin}
                className="py-3 px-4 bg-teal-50 text-teal-700 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-teal-100 transition-all flex flex-col items-center gap-1.5 border border-teal-100"
              >
                <ShieldCheck className="w-4 h-4" />
                Admin Portal
              </button>
              <button 
                onClick={handleGoogleLogin}
                className="py-3 px-4 bg-slate-50 text-slate-600 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all flex flex-col items-center gap-1.5 border border-slate-100"
              >
                <User className="w-4 h-4" />
                Donor Hub
              </button>
            </div>
            <p className="text-[9px] text-slate-400 text-center mt-3 italic">Uses Google authentication for secure access</p>
          </div>

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
    </div>
  );
}
