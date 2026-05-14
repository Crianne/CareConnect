import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Wallet, 
  Upload, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Copy,
  Check,
  ChevronRight,
  Info,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { formatCurrency, cn } from '../../lib/utils';
import { Patient } from '../../types';

interface DonationModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
}

const Loader2 = ({ className }: { className?: string }) => (
  <RefreshCw className={cn("animate-spin", className)} />
);

export function DonationModal({ isOpen, onClose, patient }: DonationModalProps) {
  const { profile } = useAuth();
  const [step, setStep] = useState<'amount' | 'payment' | 'proof' | 'success'>('amount');
  const [amount, setAmount] = useState<string>('');
  const [method, setMethod] = useState<'gcash' | 'card' | 'crypto'>('gcash');
  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string>('');
  const [tempReceipt, setTempReceipt] = useState<string | null>(null);
  const [foundationQr, setFoundationQr] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      const loadFoundationQr = async () => {
        try {
          const { doc, getDoc } = await import('firebase/firestore');
          const settingsDoc = await getDoc(doc(db, 'settings', 'foundation'));
          if (settingsDoc.exists()) {
            const data = settingsDoc.data();
            setFoundationQr(data.gcashQrUrl || data.qrCode || null);
          }
        } catch (err) {
          console.error("Error loading foundation QR:", err);
        }
      };
      loadFoundationQr();
    }
  }, [isOpen]);

  if (!isOpen || !patient) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size first
      if (file.size > 5 * 1024 * 1024) {
        alert("File is too large. Please select an image smaller than 5MB.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Compress to JPEG with lower quality to stay well under 1MB
          const compressed = canvas.toDataURL('image/jpeg', 0.6);
          setTempReceipt(compressed);
          setReceiptUrl(compressed);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmitDonation = async () => {
    if (!profile) {
      alert("Please sign in to make a donation.");
      return;
    }
    const numericAmount = parseFloat(amount);
    if (!numericAmount || isNaN(numericAmount) || numericAmount <= 0) {
      alert("Please enter a valid donation amount.");
      return;
    }
    if (!receiptUrl && !tempReceipt) {
      alert("Please upload a receipt for verification.");
      return;
    }

    setUploading(true);
    try {
      const finalReceipt = receiptUrl || tempReceipt || 'https://images.unsplash.com/photo-1554224155-1696413565d3?auto=format&fit=crop&q=80&w=200';
      
      await addDoc(collection(db, 'donations'), {
        donorId: profile.userId,
        donorName: profile.displayName || 'Anonymous Warrior',
        patientId: patient.id,
        amount: numericAmount,
        currency: 'PHP',
        paymentMethod: method,
        receiptUrl: finalReceipt,
        status: 'pending',
        timestamp: new Date().toISOString(),
        type: 'direct'
      });
      setStep('success');
    } catch (err) {
      console.error("Donation error:", err);
      alert("Failed to submit donation. Please try again.");
      handleFirestoreError(err, OperationType.WRITE, 'donations');
    } finally {
      setUploading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'amount':
        return (
          <div className="space-y-8 py-4">
            <div className="space-y-4">
               {[500, 1000, 5000, 10000].map(val => (
                 <button 
                  key={val}
                  onClick={() => setAmount(val.toString())}
                  className={cn(
                    "w-full py-4 px-6 rounded-xl border-2 flex items-center justify-between transition-all group",
                    amount === val.toString() ? "border-brand-primary bg-teal-50" : "border-slate-100 hover:border-slate-200"
                  )}
                 >
                   <span className={cn("text-lg font-bold", amount === val.toString() ? "text-brand-primary" : "text-slate-700")}>
                     {formatCurrency(val)}
                   </span>
                   <div className={cn(
                     "w-6 h-6 rounded-full border-2 flex items-center justify-center",
                     amount === val.toString() ? "border-brand-primary bg-brand-primary text-white" : "border-slate-200"
                   )}>
                     {amount === val.toString() && <Check className="w-4 h-4" />}
                   </div>
                 </button>
               ))}
               <div className="relative">
                 <input 
                   type="number"
                   placeholder="Enter custom amount (PHP)"
                   className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-brand-primary font-bold text-lg"
                   value={amount}
                   onChange={e => setAmount(e.target.value)}
                 />
                 <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">PHP</span>
               </div>
            </div>
            <button 
              disabled={!amount}
              onClick={() => setStep('payment')}
              className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all disabled:opacity-50 shadow-xl"
            >
              Continue to Payment
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        );
      case 'payment':
        return (
          <div className="space-y-8 py-4">
            <div className="bg-teal-900 rounded-[2rem] p-8 text-center text-white space-y-6 relative overflow-hidden">
               <div className="relative z-10 space-y-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-300">Foundation GCash Portal</p>
                  <div className="w-48 h-48 bg-white p-4 rounded-3xl mx-auto shadow-2xl flex items-center justify-center border-4 border-teal-500/30 overflow-hidden">
                    {foundationQr ? (
                      <img src={foundationQr} className="w-full h-full object-contain" alt="Foundation QR" />
                    ) : (
                      <div className="text-teal-900 flex flex-col items-center">
                         <ShieldCheck className="w-16 h-16 mb-2 opacity-20" />
                         <span className="text-[10px] font-bold uppercase tracking-widest leading-tight">Verified <br /> Charity Wallet</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xl font-bold tracking-tight">CareConnect Foundation</p>
                    <p className="text-sm font-mono text-teal-200">0995-345-6380</p>
                  </div>
                  <button 
                    onClick={() => handleCopy('09953456380')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-xs font-bold hover:bg-white/20 transition-all backdrop-blur"
                  >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Copied' : 'Copy Number'}
                  </button>
               </div>
            </div>

            <div className="flex gap-4 p-4 bg-blue-50/50 rounded-xl border border-blue-100 text-blue-700">
               <Info className="w-5 h-5 shrink-0" />
               <p className="text-xs font-medium leading-relaxed">
                 Pay via GCash app, save your receipt, then proceed to the next step to upload verification proof.
               </p>
            </div>

            <div className="flex gap-4">
               <button onClick={() => setStep('amount')} className="flex-1 py-4 text-slate-500 font-bold uppercase text-xs tracking-widest hover:text-slate-700">Back</button>
               <button 
                onClick={() => setStep('proof')}
                className="flex-3 py-4 bg-brand-primary text-white rounded-xl font-bold uppercase text-xs tracking-widest shadow-lg shadow-brand-primary/20 hover:bg-brand-primary/90 transition-all"
               >
                 I have Paid
               </button>
            </div>
          </div>
        );
      case 'proof':
        return (
          <div className="space-y-8 py-4">
            <div className="space-y-4">
               <p className="text-sm text-slate-500 font-medium">Verify your payment of <span className="text-slate-900 font-bold">{formatCurrency(parseFloat(amount))}</span> by uploading your GCash transaction confirmation.</p>
               
               <label className="border-2 border-dashed border-slate-200 rounded-3xl p-10 flex flex-col items-center justify-center space-y-4 cursor-pointer hover:border-brand-primary/50 transition-all group relative overflow-hidden h-64">
                  {tempReceipt ? (
                    <>
                      <img src={tempReceipt} className="absolute inset-0 w-full h-full object-cover opacity-20" alt="Preview" />
                      <div className="relative z-10 flex flex-col items-center text-center">
                        <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-2" />
                        <p className="text-sm font-bold text-slate-700">Receipt Captured</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Tap to replace</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-teal-50 group-hover:text-teal-600 transition-colors">
                         <Upload className="w-8 h-8" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-slate-700">Click to upload receipt</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">PNG, JPG or PDF up to 5MB</p>
                      </div>
                    </>
                  )}
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
               </label>

               <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Transaction Reference # (Optional)</label>
                  <input 
                    placeholder="Enter 13-digit GCash Ref"
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-mono tracking-wider focus:ring-2 ring-brand-primary/20 outline-none"
                  />
               </div>
            </div>

            <div className="flex gap-4 pt-4">
               <button onClick={() => setStep('payment')} className="flex-1 py-4 text-slate-500 font-bold uppercase text-xs tracking-widest">Back</button>
               <button 
                onClick={handleSubmitDonation}
                disabled={uploading || (!receiptUrl && !tempReceipt)}
                className="flex-3 py-4 bg-brand-primary text-white rounded-xl font-bold uppercase text-xs tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
               >
                 {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm & Send for Verification'}
               </button>
            </div>
          </div>
        );
      case 'success':
        return (
          <div className="py-12 text-center space-y-8">
            <div className="w-24 h-24 bg-teal-50 rounded-full flex items-center justify-center mx-auto text-teal-600 animate-bounce">
               <CheckCircle2 className="w-12 h-12" />
            </div>
            <div className="space-y-3">
              <h3 className="text-3xl font-bold tracking-tight text-slate-900">Donation Captured!</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-xs mx-auto">
                Our verification engine is now matching your payment. Once approved, it will be permanently engraved on the Polygon Blockchain.
              </p>
            </div>
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4 text-left">
               <ShieldCheck className="w-8 h-8 text-brand-primary shrink-0" />
               <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status</p>
                  <div className="flex items-center gap-2">
                     <span className="text-sm font-bold text-slate-800">Pending Polygon Verification</span>
                     <div className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-pulse" />
                  </div>
               </div>
            </div>
            <button 
              onClick={onClose}
              className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold uppercase text-xs tracking-widest"
            >
              Back to Registry
            </button>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden"
      >
        <div className="bg-slate-50 px-8 py-6 border-b border-slate-100 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-xl border border-slate-100 flex items-center justify-center text-brand-primary shadow-sm">
                 <Wallet className="w-5 h-5" />
              </div>
              <div>
                 <h2 className="text-lg font-bold text-slate-800 tracking-tight">Verified Contribution</h2>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 leading-none mt-0.5">
                   Secured by <ShieldCheck className="w-3 h-3 text-teal-500" /> Polygon Mainnet
                 </p>
              </div>
           </div>
           <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
              <X className="w-5 h-5" />
           </button>
        </div>

        <div className="p-10">
           {renderStep()}
        </div>
      </motion.div>
    </div>
  );
}
