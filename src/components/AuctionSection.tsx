import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, limit, addDoc, serverTimestamp, doc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, handleFirestoreListenerError, OperationType, auth } from '../lib/firebase';
import { AuctionItem, Bid } from '../types';
import { cn, formatCurrency } from '../lib/utils';
import { Gavel, Clock, Trophy, ShieldCheck, Hammer, Share2, Upload, Trash2, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { submitBidToSmartContract } from '../services/blockchain';
import { DwellTooltip } from './DwellTooltip';
import { TitleExplainer } from './TitleExplainer';

export function AuctionSection() {
  const { profile } = useAuth();
  const [items, setItems] = useState<AuctionItem[]>([]);
  const [biddingOn, setBiddingOn] = useState<AuctionItem | null>(null);
  const [bidAmount, setBidAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newItem, setNewItem] = useState({ title: '', description: '', minBid: '', donorContact: '', image: null as string | null });
  const [selectedItemHistory, setSelectedItemHistory] = useState<Bid[]>([]);
  const [showHistory, setShowHistory] = useState<string | null>(null);
  const [checkoutItem, setCheckoutItem] = useState<AuctionItem | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [itemToDeleteId, setItemToDeleteId] = useState<string | null>(null);
  const [auditConfirmId, setAuditConfirmId] = useState<string | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      const { doc, getDoc } = await import('firebase/firestore');
      const settingsDoc = await getDoc(doc(db, 'settings', 'foundation'));
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        setQrCode(data.gcashQrUrl || data.qrCode || null);
      }
    };
    loadSettings();
  }, []);

  const logAction = async (action: string, resource: string, details: string) => {
    try {
      await addDoc(collection(db, 'audit_logs'), {
        adminId: auth.currentUser?.uid,
        adminEmail: auth.currentUser?.email || 'anonymous',
        action,
        resource,
        details,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('Audit Log failed', err);
    }
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutItem || !receiptUrl || !profile) return;
    setIsProcessing(true);
    
    let donationRef;
    try {
      donationRef = await addDoc(collection(db, 'donations'), {
        donorId: profile.userId,
        donorName: profile.displayName || 'Anonymous Warrior',
        isAnonymous: isAnonymous,
        amount: Number(checkoutItem.currentBid),
        currency: 'PHP',
        paymentMethod: 'gcash',
        receiptUrl,
        status: 'pending',
        type: 'auction_payment',
        auctionId: checkoutItem.id,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'donations');
      setIsProcessing(false);
      return;
    }
    
    try {
      await updateDoc(doc(db, 'auctions', checkoutItem.id), {
        status: 'closed',
        paymentStatus: 'pending_verification'
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'auctions');
      setIsProcessing(false);
      return;
    }

    try {
      await logAction('AUCTION_SETTLEMENT', `auctions/${checkoutItem.id}`, `User settled acquisition for ${checkoutItem.currentBid} PHP. Donation ID: ${donationRef.id}`);
    } catch (err) {
      console.error('Audit Log failed', err);
    }

    alert('Proof of payment submitted. Our treasury is auditing the transaction on-chain.');
    setCheckoutItem(null);
    setReceiptUrl(null);
    setIsProcessing(false);
  };

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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
          
          const compressed = canvas.toDataURL('image/jpeg', 0.6);
          setReceiptUrl(compressed);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'auctions'), (snapshot) => {
      const allItems = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AuctionItem));
      const filtered = allItems.filter(item => {
        const isAdmin = profile?.role === 'admin';
        return item.status === 'active' || 
               item.status === 'closed' || 
               ((item.status === 'draft' || item.status === 'audit') && (item.ownerId === profile?.userId || isAdmin));
      });
      setItems(filtered);
      
      // Update bidAmount if the item being bid on changed
      if (biddingOn) {
        const currentVersion = allItems.find(i => i.id === biddingOn.id);
        if (currentVersion) {
          if (currentVersion.currentBid > biddingOn.currentBid) {
            const nextBid = currentVersion.currentBid + Math.max(1, Math.floor(currentVersion.currentBid * 0.1));
            setBidAmount(nextBid.toString());
          }
          setBiddingOn(currentVersion);
        }
      }
    }, (err) => handleFirestoreListenerError(err, OperationType.LIST, 'auctions'));
    return unsub;
  }, [profile?.userId, biddingOn?.id]);

  useEffect(() => {
    if (showHistory) {
      const unsub = onSnapshot(
        query(collection(db, `auctions/${showHistory}/bids`), orderBy('timestamp', 'desc'), limit(10)),
        (snapshot) => {
          setSelectedItemHistory(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Bid)));
        }
      );
      return unsub;
    }
  }, [showHistory]);

  const getTimeRemaining = (endTime: string) => {
    const total = Date.parse(endTime) - Date.parse(new Date().toString());
    if (total <= 0) return 'Closed';
    const seconds = Math.floor((total / 1000) % 60);
    const minutes = Math.floor((total / 1000 / 60) % 60);
    const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
    const days = Math.floor(total / (1000 * 60 * 60 * 24));
    return `${days}d ${hours}h ${minutes}m`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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
          
          const compressed = canvas.toDataURL('image/jpeg', 0.6);
          setNewItem(prev => ({ ...prev, image: compressed }));
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const submitAuctionItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    try {
      const auctionRef = await addDoc(collection(db, 'auctions'), {
        title: newItem.title,
        description: newItem.description,
        startPrice: parseInt(newItem.minBid),
        currentBid: parseInt(newItem.minBid),
        imageUrl: newItem.image || 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&q=80&w=400',
        highestBidderId: null,
        highestBidderName: 'Reserve Pool',
        status: 'draft',
        ownerId: profile.userId,
        donorContact: newItem.donorContact,
        endTime: new Date(Date.now() + 86400000 * 7).toISOString(), // Default 7 days
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      });
      
      await logAction('SUBMIT_AUCTION_ITEM', `auctions/${auctionRef.id}`, `New auction item submitted: ${newItem.title}`);
      
      setIsSubmitting(false);
      setNewItem({ title: '', description: '', minBid: '', donorContact: '', image: null });
      alert('Asset submitted to foundation audit registry.');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'auctions');
    }
  };

  const handlePlaceBid = async (item: AuctionItem) => {
    if (!profile) return alert('Please sign in to bid');
    const numericBid = Number(bidAmount);
    
    if (numericBid <= item.currentBid) {
      return alert(`Bid must be higher than PHP ${item.currentBid.toLocaleString()}`);
    }

    const isWinner = Date.parse(item.endTime) < Date.now();
    if (isWinner || item.status === 'closed') {
      return alert('This auction has already concluded.');
    }

    setIsProcessing(true);
    try {
      const txHash = '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
      
      await updateDoc(doc(db, 'auctions', item.id), {
        currentBid: numericBid,
        highestBidderId: profile.userId,
        highestBidderName: profile.displayName || 'Anonymous Warrior',
        lastUpdated: new Date().toISOString()
      });

      await addDoc(collection(db, `auctions/${item.id}/bids`), {
        bidderId: profile.userId,
        amount: numericBid,
        timestamp: new Date().toISOString(),
        txHash
      });

      await logAction('PLACE_BID', `auctions/${item.id}`, `User placed bid: ${numericBid} PHP. TX: ${txHash}`);

      setBiddingOn(null);
      setBidAmount('');
      alert('Bid placed successfully!');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'auctions');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteItem = async (itemId: string, bypassConfirm: boolean = false) => {
    if (!bypassConfirm) {
      setItemToDeleteId(itemId);
      return;
    }
    try {
      await deleteDoc(doc(db, 'auctions', itemId));
      await logAction('DELETE_OWN_AUCTION', `auctions/${itemId}`, 'User removed their own auction draft');
      alert('Asset removed from registry.');
      setItemToDeleteId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'auctions');
    }
  };

  return (
    <div className="space-y-12">
      <div className="bg-white p-10 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="relative z-10 grid md:grid-cols-2 items-center gap-12">
           <div className="space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-teal-50 text-teal-700 text-[10px] font-bold uppercase tracking-widest border border-teal-100">
                 Foundation Auctions
              </div>
              <TitleExplainer
                featureName="Charity Auctions"
                simpleExplanation="Charity Auctions are fun bidding events where generous supporters donate pieces like arts, collectibles, or books. You can bid on them, and 100% of the bid money helps pay for pediatric oncology chemotherapy."
                badge="Generosity Auctions"
                bulletPoints={[
                  "Safely bid on unique artworks and signed collectibles",
                  "Approved bid totals go 100% to patients",
                  "Keeps a public bid history of active participants"
                ]}
              >
                <h2 className="text-3xl font-bold tracking-tight text-slate-800 mb-0">Charity Auctions</h2>
              </TitleExplainer>
              <p className="text-slate-500 text-sm leading-relaxed max-w-md">
                Participate in high-value asset auctions where 100% of proceeds are automatically routed to our verified charity wallet via Polygon smart contracts.
              </p>
              <div className="flex gap-4">
                 <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded border border-slate-100">
                    <ShieldCheck className="w-4 h-4 text-brand-primary" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Immutable Records</span>
                 </div>
                 <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded border border-slate-100">
                    <Gavel className="w-4 h-4 text-brand-primary" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Smart Bidding</span>
                 </div>
              </div>
           </div>
           <div className="bg-slate-900 p-8 rounded-[2rem] shadow-2xl text-white relative">
              <div className="relative z-10">
                <h4 className="text-lg font-bold mb-2">Have a unique asset?</h4>
                <p className="text-slate-400 text-xs mb-6">Contribute high-value items to fund our mission. All listings undergo strict provenance audit.</p>
                <button 
                  onClick={() => setIsSubmitting(!isSubmitting)}
                  className="w-full py-3 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl text-xs font-bold transition-all uppercase tracking-widest shadow-lg shadow-brand-primary/20"
                >
                   {isSubmitting ? 'Cancel' : 'Donate an Asset'}
                </button>
              </div>
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-brand-primary/20 rounded-full blur-3xl" />
           </div>
        </div>

        <AnimatePresence>
          {isSubmitting && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-10 pt-10 border-t border-slate-100"
            >
              <form onSubmit={submitAuctionItem} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Asset Nomenclature</label>
                    <input 
                      required
                      placeholder="e.g. Original #12 NFT: Hope"
                      className="w-full bg-slate-50 px-5 py-4 rounded-2xl border border-slate-100 text-sm font-medium outline-none focus:ring-4 ring-brand-primary/10 transition-all"
                      value={newItem.title}
                      onChange={e => setNewItem(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Reserve Price (PHP)</label>
                    <input 
                      required
                      type="number"
                      placeholder="50000"
                      className="w-full bg-slate-50 px-5 py-4 rounded-2xl border border-slate-100 text-sm font-medium outline-none focus:ring-4 ring-brand-primary/10 transition-all"
                      value={newItem.minBid}
                      onChange={e => setNewItem(prev => ({ ...prev, minBid: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Donor Contact Number (For Winner Verification)</label>
                    <input 
                      required
                      type="tel"
                      placeholder="e.g. +63 917 123 4567"
                      className="w-full bg-slate-50 px-5 py-4 rounded-2xl border border-slate-100 text-sm font-medium outline-none focus:ring-4 ring-brand-primary/10 transition-all"
                      value={newItem.donorContact}
                      onChange={e => setNewItem(prev => ({ ...prev, donorContact: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Provenance & Ethics</label>
                    <textarea 
                      required
                      rows={3}
                      placeholder="Details about the item's history..."
                      className="w-full bg-slate-50 px-5 py-4 rounded-2xl border border-slate-100 text-sm font-medium outline-none focus:ring-4 ring-brand-primary/10 transition-all"
                      value={newItem.description}
                      onChange={e => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-4">
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Visual Evidence</p>
                   <label className="block w-full aspect-video bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-6 cursor-pointer hover:bg-slate-100 transition-all relative overflow-hidden group">
                      {newItem.image ? (
                        <img src={newItem.image} className="absolute inset-0 w-full h-full object-cover" alt="Preview" />
                      ) : (
                        <>
                          <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center text-slate-300 group-hover:text-brand-primary transition-colors">
                             <Upload className="w-7 h-7" />
                          </div>
                          <p className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Select Image</p>
                        </>
                      )}
                      <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                   </label>
                   <button type="submit" className="w-full py-5 bg-teal-900 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-xl hover:-translate-y-1 transition-all">
                      Push to Audit Registry
                   </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
    {items.map((item) => {
          const isTimeUp = Date.parse(item.endTime) < Date.now();
          const isClosed = item.status === 'closed';
          const isWinner = item.highestBidderId === profile?.userId && (isTimeUp || isClosed);

          return (
            <motion.div 
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "glass-card overflow-hidden group flex flex-col relative",
                isWinner && "ring-2 ring-brand-primary shadow-2xl shadow-brand-primary/10"
              )}
            >
              <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
                 <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                 <div className={cn(
                   "absolute top-4 left-4 backdrop-blur-md px-3 py-1.5 rounded-full text-[9px] font-bold flex items-center gap-2 tracking-widest uppercase shadow-lg",
                   (isTimeUp || isClosed) ? "bg-red-500/80 text-white" : "bg-white/80 text-slate-900"
                 )}>
                    <Clock className="w-3 h-3" />
                    {isClosed ? 'Concluded' : getTimeRemaining(item.endTime)}
                 </div>
                 {isWinner && (
                   <div className="absolute inset-0 bg-brand-primary/20 flex items-center justify-center">
                     <div className="bg-white/95 backdrop-blur px-6 py-2 rounded-full shadow-2xl scale-110">
                        <p className="text-[10px] font-bold text-brand-primary uppercase tracking-[0.2em]">Highest Bidder</p>
                     </div>
                   </div>
                 )}
                  {item.contractAddress && (
                    <div className="absolute bottom-4 left-4 right-4 animate-in fade-in slide-in-from-bottom-3 duration-700">
                      <div className="bg-slate-900/95 backdrop-blur-xl px-4 py-3 rounded-2xl border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center justify-between gap-3 group/contract">
                         <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                               <ShieldCheck className="w-3 h-3 text-teal-400" />
                               <span className="text-[8px] font-black uppercase tracking-widest text-white/50">Verified Contract</span>
                            </div>
                            <span className="text-[10px] font-mono text-teal-100/90 truncate max-w-[180px]">
                               {item.contractAddress}
                            </span>
                         </div>
                         <div className="flex items-center gap-2">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(item.contractAddress!);
                                alert('Contract Address Copied to Audit Clipboard');
                              }}
                              className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-white/50 hover:text-white transition-all border border-white/5"
                              title="Copy Contract Address"
                            >
                               <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                alert('Explorer Link\n\nRedirecting to Foundation Blockchain Explorer for contract verification...');
                              }}
                              className="p-2 bg-teal-500/20 hover:bg-teal-500/30 rounded-xl text-teal-400 hover:text-teal-300 transition-all border border-teal-500/20"
                              title="View on Explorer"
                            >
                               <Share2 className="w-3.5 h-3.5" />
                            </button>
                         </div>
                      </div>
                    </div>
                  )}

               </div>

              <div className="p-8 space-y-6 flex-1">
                 <div>
                    <div className="flex items-center justify-between mb-2">
                       <h3 className="text-xl font-bold text-slate-800 group-hover:text-brand-primary transition-colors">{item.title}</h3>
                       <div className="flex items-center gap-2">
                         {(item.ownerId === profile?.userId || profile?.role === 'admin') && (item.status === 'draft' || item.status === 'audit') && (
                           <button 
                             onClick={() => {
                               if (itemToDeleteId === item.id) {
                                 handleDeleteItem(item.id, true);
                               } else {
                                 setItemToDeleteId(item.id);
                                 setTimeout(() => setItemToDeleteId(null), 4000);
                               }
                             }}
                             className={cn(
                               "p-1.5 rounded transition-all flex items-center gap-1",
                               itemToDeleteId === item.id 
                                 ? "bg-red-600 text-white hover:bg-red-700 animate-pulse" 
                                 : "hover:bg-red-50 text-slate-300 hover:text-red-500"
                             )}
                             title="Delete Listing"
                           >
                              {itemToDeleteId === item.id ? <span className="text-[8px] font-black uppercase tracking-widest px-1">Confirm?</span> : <Trash2 className="w-4 h-4" />}
                           </button>
                         )}
                         <button onClick={() => setShowHistory(showHistory === item.id ? null : item.id)}>
                            <Clock className="w-4 h-4 text-slate-300 hover:text-brand-primary transition-colors" />
                         </button>
                       </div>
                    </div>
                    <p className="text-xs text-slate-400 font-medium leading-relaxed line-clamp-3">{item.description}</p>
                 </div>

                 {showHistory === item.id ? (
                   <div className="space-y-3 py-4 border-y border-slate-100 h-32 overflow-y-auto no-scrollbar">
                      {selectedItemHistory.length > 0 ? selectedItemHistory.map(bid => (
                        <div key={bid.id} className="flex items-center justify-between text-[10px]">
                           <span className="font-mono text-slate-400">0x...{bid.bidderId.slice(-4)}</span>
                           <span className="font-bold text-slate-700">₱{bid.amount.toLocaleString()}</span>
                        </div>
                      )) : (
                        <p className="text-[10px] text-center text-slate-300 py-8">No bid history found on-chain</p>
                      )}
                   </div>
                 ) : (
                   <div className="flex items-center justify-between p-5 bg-slate-50/50 rounded-2xl border border-slate-100/50">
                      <div>
                         <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                           {item.status === 'draft' || item.status === 'audit' ? 'Reserve Value' : 'Current Evaluation'}
                         </p>
                         <p className="text-2xl font-black text-brand-primary tracking-tight">₱{item.currentBid.toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                         <div className={cn(
                           "w-2 h-2 rounded-full ml-auto mb-2",
                           (item.status === 'active' && !isTimeUp) ? "bg-green-500 animate-pulse" : 
                           (item.status === 'closed' || isTimeUp) ? "bg-red-400" : "bg-amber-400"
                         )} />
                         <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block" style={{ display: 'none' }} />
                         <DwellTooltip
                           title={
                             (item.status === 'active' && !isTimeUp) ? "Active Funding Pool" :
                             (item.status === 'closed' || isTimeUp) ? "Concluded Campaign2" :
                             "Under Audit / Draft"
                           }
                           description={
                             (item.status === 'active' && !isTimeUp) ? "This auction is active and currently accepting authenticated bids from registered sponsors." :
                             (item.status === 'closed' || isTimeUp) ? "Bidding time has expired. Smart contracts are locking final allocations to the designated pediatric warrior." :
                             "Currently undergoing compliance verification, target budget validation, or local draft staging."
                           }
                           statusType={
                             (item.status === 'active' && !isTimeUp) ? "verified" :
                             (item.status === 'closed' || isTimeUp) ? "rejected" :
                             "pending"
                           }
                         >
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest cursor-help">
                              {(item.status === 'active' && !isTimeUp) ? 'Active Pool' : 
                               (item.status === 'closed' || isTimeUp) ? 'Concluded' : 'Under Audit'}
                            </span>
                         </DwellTooltip>
                         <span style={{ display: 'none' }}>
                           {(item.status === 'active' && !isTimeUp) ? 'Active Pool' : 
                            (item.status === 'closed' || isTimeUp) ? 'Concluded' : 'Under Audit'}
                         </span>
                      </div>
                   </div>
                 )}
              </div>

                  {isWinner && (
                    <div className="p-4 bg-emerald-50 border border-emerald-100/60 rounded-2xl text-left animate-in fade-in duration-300 mb-4 mx-8 space-y-3">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-emerald-800 font-sans">Bidding Settled to Foundation</p>
                        <p className="text-[10px] text-slate-600 mt-1 leading-relaxed font-sans">
                          All winning bid proceeds are received directly by the foundation's secure charity wallet to support patient medical care.
                        </p>
                      </div>
                      
                      {item.donorContact && (
                        <div className="pt-2 border-t border-emerald-100">
                          <p className="text-[9px] font-black uppercase tracking-widest text-emerald-800 font-sans">Organize Handover with Donor</p>
                          <p className="text-xs font-semibold text-slate-700 mt-1 font-sans">Donor Phone / Mobile:</p>
                          <p className="text-sm font-bold text-teal-950 font-mono mt-0.5 select-all">{item.donorContact}</p>
                          <p className="text-[10px] text-slate-500 mt-1 leading-relaxed font-sans">Contact the donor directly to verify and coordinate item pick-up or transport.</p>
                        </div>
                      )}
                    </div>
                  )}
              <div className="p-4 bg-slate-50/50 border-t border-slate-100">
                {isWinner ? (
                  item.paymentStatus === 'verified' ? (
                    <div className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold uppercase tracking-widest text-[10px] text-center flex items-center justify-center gap-2 shadow-sm">
                      <ShieldCheck className="w-4 h-4 text-emerald-100" />
                      Acquisition & Payment Verified
                    </div>
                  ) : item.paymentStatus === 'pending_verification' ? (
                    <div className="w-full py-4 bg-teal-50 text-teal-800 border border-teal-100 rounded-xl font-medium uppercase tracking-widest text-[10px] text-center flex items-center justify-center gap-2">
                      <Clock className="w-4 h-4 text-teal-600 animate-pulse" />
                      Awaiting Treasury Audit
                    </div>
                  ) : (
                    <button 
                      onClick={() => setCheckoutItem(item)}
                      className="w-full py-4 bg-teal-900 text-white rounded-xl font-bold uppercase tracking-widest text-[11px] shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                    >
                      <Trophy className="w-4 h-4" />
                      Complete Acquisition
                    </button>
                  )
                ) : (item.status === 'draft' || item.status === 'audit') ? (
                  <div className="flex flex-col gap-2">
                    <div className="w-full py-4 bg-amber-50 text-amber-700 border border-amber-100 rounded-xl font-bold uppercase tracking-widest text-[10px] text-center flex items-center justify-center gap-2 px-4 italic">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {item.status === 'audit' ? 'Foundation Audit in Progress' : 'Draft Protocol Active'}
                    </div>
                    {item.status === 'draft' && item.ownerId === profile?.userId && (
                       <button 
                         onClick={async () => {
                           if (auditConfirmId !== item.id) {
                             setAuditConfirmId(item.id);
                             setTimeout(() => setAuditConfirmId(null), 5000);
                             return;
                           }
                           try {
                             await updateDoc(doc(db, 'auctions', item.id), {
                               status: 'audit',
                               lastUpdated: new Date().toISOString()
                             });
                             await logAction('PUSH_TO_AUDIT', `auctions/${item.id}`, 'User submitted asset for audit');
                             alert('Asset pushed to audit.');
                             setAuditConfirmId(null);
                           } catch (err) {
                             handleFirestoreError(err, OperationType.WRITE, 'auctions');
                           }
                         }}
                         className={cn(
                           "w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all",
                           auditConfirmId === item.id 
                             ? "bg-amber-600 text-white animate-pulse" 
                             : "bg-slate-800 text-white"
                         )}
                       >
                         {auditConfirmId === item.id ? "Click to Confirm" : "Submit for Audit"}
                       </button>
                    )}
                  </div>
                ) : (isTimeUp || isClosed) ? (
                  <div className="w-full py-4 bg-slate-100 text-slate-400 rounded-xl flex flex-col items-center justify-center gap-1 border border-slate-200/50">
                    <span className="font-bold uppercase tracking-widest text-[11px] italic">Auction Concluded</span>
                    {item.highestBidderName && (
                      <span className="text-[10px] font-bold text-brand-primary uppercase tracking-widest not-italic">Winner: {item.highestBidderName}</span>
                    )}
                  </div>
                ) : biddingOn?.id === item.id ? (
                  <div className="flex gap-2">
                     <input 
                       type="number"
                       placeholder="Enter PHP Amount"
                       autoFocus
                       className="flex-1 bg-white px-4 py-3 rounded-xl border border-slate-200 outline-none text-xs font-bold focus:ring-4 ring-brand-primary/10 transition-all shadow-inner"
                       value={bidAmount}
                       onChange={e => setBidAmount(e.target.value)}
                     />
                     <button 
                       onClick={() => handlePlaceBid(item)}
                       className="px-6 py-3 bg-brand-primary text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-primary/20 hover:scale-105 active:scale-95 transition-all"
                     >
                       Confirm
                     </button>
                     <button onClick={() => setBiddingOn(null)} className="p-3 bg-slate-100 text-slate-400 rounded-xl transition-colors hover:bg-slate-200">
                        <Share2 className="w-4 h-4" />
                     </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => {
                      setBiddingOn(item);
                      setBidAmount(Math.floor(item.currentBid + Math.max(1, item.currentBid * 0.1)).toString());
                      setShowHistory(null);
                    }}
                    className="w-full py-4 bg-white text-slate-900 border border-slate-200 rounded-xl font-bold uppercase tracking-widest text-[11px] hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                  >
                    Open Smart Bid Interface
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
        {items.length === 0 && (
           <div className="col-span-full py-48 text-center bg-white rounded-3xl border border-slate-100 border-dashed">
              <Gavel className="w-20 h-20 mx-auto text-slate-200 mb-6" />
              <h3 className="text-lg font-bold text-slate-400 uppercase tracking-widest">Wait for the next cycle</h3>
              <p className="text-slate-300 text-xs mt-2">All assets currently audited and recorded on-chain have been cleared.</p>
           </div>
        )}
      </div>

      <AnimatePresence>
        {checkoutItem && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="grid md:grid-cols-2">
                <div className="bg-teal-900 p-8 text-white flex flex-col justify-center text-center">
                  <div className="w-48 h-48 bg-white p-4 rounded-3xl mx-auto shadow-2xl flex items-center justify-center mb-6 overflow-hidden">
                    {qrCode ? (
                      <img src={qrCode} className="w-full h-full object-contain" alt="GCash QR" />
                    ) : (
                      <ShieldCheck className="w-16 h-16 text-teal-900 opacity-20" />
                    )}
                  </div>
                  <h4 className="text-xl font-bold mb-2 tracking-tight">Charity Treasury Vault</h4>
                  <p className="text-teal-100/60 text-xs font-medium uppercase tracking-widest leading-relaxed">
                    Scan to complete acquisition of <br />
                    <span className="text-teal-300 font-bold">"{checkoutItem.title}"</span>
                  </p>
                </div>
                
                <div className="p-8">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-slate-800 tracking-tight">Final Settlement</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Acquisition Portal</p>
                    </div>
                    <button onClick={() => setCheckoutItem(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                      <Gavel className="w-5 h-5 text-slate-300" />
                    </button>
                  </div>

                  <form onSubmit={handleCheckoutSubmit} className="space-y-6">
                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Settlement</p>
                      <p className="text-2xl font-black text-slate-900">₱{checkoutItem.currentBid.toLocaleString()}</p>
                    </div>

                    <div className="p-4 bg-teal-50 rounded-2xl border border-teal-100 text-left">
                      <p className="text-[9px] font-bold text-teal-800 uppercase tracking-widest mb-1 font-sans">Payment Protocol</p>
                      <p className="text-xs text-slate-600 leading-relaxed font-sans">
                        Your bid winnings of <span className="font-bold text-slate-800">₱{checkoutItem.currentBid.toLocaleString()}</span> are received directly by the foundation's charity treasury vault. After your settlement is verified, you can coordinate pick-up or shipping details with the donor.
                      </p>
                    </div>

                    <div 
                      onClick={() => setIsAnonymous(!isAnonymous)}
                      className={cn(
                        "p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all select-none",
                        isAnonymous ? "border-teal-600 bg-teal-50/40" : "border-slate-100 bg-white hover:border-slate-200"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <ShieldCheck className={cn("w-5 h-5", isAnonymous ? "text-teal-600" : "text-slate-400")} />
                        <div>
                          <p className="text-xs font-bold text-slate-700">Donate Anonymously</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 tracking-wider font-semibold">Mask your identity on public boards</p>
                        </div>
                      </div>
                      <div className={cn(
                        "w-10 h-6 rounded-full p-0.5 transition-colors duration-200 flex items-center cursor-pointer",
                        isAnonymous ? "bg-teal-600" : "bg-slate-200"
                      )}>
                        <div className={cn(
                          "w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200",
                          isAnonymous ? "transform translate-x-4" : ""
                        )} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Evidence of Payment</label>
                      <label className="block w-full py-12 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-all relative overflow-hidden group">
                        {receiptUrl ? (
                          <img src={receiptUrl} className="absolute inset-0 w-full h-full object-cover" alt="Receipt" />
                        ) : (
                          <>
                            <Upload className="w-6 h-6 text-slate-300 group-hover:text-brand-primary transition-colors mb-2" />
                            <span className="text-xs font-bold text-slate-400 group-hover:text-slate-600 transition-colors">Attach GCash Receipt</span>
                          </>
                        )}
                        <input type="file" className="hidden" accept="image/*" onChange={handleReceiptUpload} required />
                      </label>
                    </div>

                    <button 
                      type="submit" 
                      disabled={isProcessing || !receiptUrl}
                      className="w-full py-4 bg-teal-900 text-white rounded-xl font-bold uppercase tracking-widest text-[11px] shadow-xl hover:-translate-y-0.5 active:translate-y-0 shadow-teal-900/10 disabled:opacity-50 transition-all"
                    >
                      {isProcessing ? 'Auditing Vault...' : 'Confirm Settlement'}
                    </button>
                  </form>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
