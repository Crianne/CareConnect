import React from 'react';
import { 
  User, 
  LogIn, 
  LogOut, 
  UserCircle, 
  LayoutDashboard, 
  Heart, 
  Gavel, 
  ShieldCheck, 
  Bell, 
  Settings, 
  Lock,
  ClipboardList,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { UserRole } from '../types';
import { collection, query, onSnapshot, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Navbar({ activeTab, setActiveTab }: NavbarProps) {
  const { profile, login, logout } = useAuth();
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [lastRead, setLastRead] = React.useState<string>(() => {
    return localStorage.getItem('lastReadNotifications') || '1970-01-01T00:00:00.000Z';
  });

  // Keep refs of activeTab and lastRead to avoid recreating Firestore listeners in a loop
  const activeTabRef = React.useRef(activeTab);
  const lastReadRef = React.useRef(lastRead);

  React.useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  React.useEffect(() => {
    lastReadRef.current = lastRead;
  }, [lastRead]);

  // Keep lastRead synchronized when activeTab is notifications
  React.useEffect(() => {
    if (activeTab === 'notifications') {
      const nowStr = new Date().toISOString();
      localStorage.setItem('lastReadNotifications', nowStr);
      setLastRead(nowStr);
      setUnreadCount(0);
    }
  }, [activeTab]);

  // Real-time listener in the Navbar to detect new notifications/updates
  React.useEffect(() => {
    if (!profile) return;

    const donationsRef = collection(db, 'donations');
    const baseQuery = profile.role === UserRole.ADMIN 
      ? query(donationsRef, orderBy('timestamp', 'desc'), limit(10))
      : query(donationsRef, where('donorId', '==', profile.userId));

    const unsub = onSnapshot(baseQuery, (snapshot) => {
      let docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as any);
      
      if (profile.role !== UserRole.ADMIN) {
        // Sort client-side to prevent missing index error
        docs.sort((a: any, b: any) => {
          const getT = (ts: any) => {
            if (!ts) return 0;
            if (typeof ts.toDate === 'function') return ts.toDate().getTime();
            if (ts.seconds) return ts.seconds * 1000;
            return new Date(ts).getTime();
          };
          return getT(b.timestamp) - getT(a.timestamp);
        });
        docs = docs.slice(0, 10);
      }
      const currentActiveTab = activeTabRef.current;
      const currentLastRead = lastReadRef.current;
      
      if (currentActiveTab === 'notifications') {
        setUnreadCount(0);
        const newestDoc = docs[0];
        if (newestDoc && newestDoc.timestamp) {
          // If Firestore timestamp object, convert it
          const tStr = newestDoc.timestamp.toDate ? newestDoc.timestamp.toDate().toISOString() : newestDoc.timestamp;
          localStorage.setItem('lastReadNotifications', tStr);
          setLastRead(tStr);
        }
      } else {
        const lastReadTime = new Date(currentLastRead).getTime();
        const count = docs.filter((d: any) => {
          const t = d.timestamp;
          if (!t) return false;
          const itemTime = t.toDate ? t.toDate().getTime() : new Date(t).getTime();
          return itemTime > lastReadTime;
        }).length;
        setUnreadCount(count);
      }
    }, (err) => {
      console.error("Navbar notifications listener error:", err);
    });

    return () => unsub();
  }, [profile]);

  const getNavItems = () => {
    if (profile?.role === UserRole.ADMIN) {
      return [
        { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
        { id: 'admin', label: 'Admin Hub', icon: ClipboardList },
        { id: 'notifications', label: 'Alerts', icon: Bell },
        { id: 'settings', label: 'Config', icon: Settings },
      ];
    }
    return [
      { id: 'dashboard', label: 'Impact', icon: LayoutDashboard },
      { id: 'patients', label: 'Warriors', icon: Heart },
      { id: 'auctions', label: 'Auctions', icon: Gavel },
      { id: 'transparency', label: 'Transactions', icon: ShieldCheck },
      { id: 'notifications', label: 'Updates', icon: Bell },
      { id: 'profile', label: 'My Profile', icon: UserCircle },
    ];
  };

  const navItems = getNavItems();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
          <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center">
            <Heart className="w-4 h-4 text-white fill-current" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-800">
            Care<span className="text-brand-primary">Connect</span>
          </span>
          {profile?.role === 'admin' && (
            <span className="hidden sm:inline-block ml-2 px-2 py-0.5 bg-teal-50 text-teal-700 text-[10px] font-bold uppercase tracking-wider rounded border border-teal-100">
              Foundation Admin
            </span>
          )}
        </div>

        <div className="hidden md:flex items-center gap-8 h-full">
          {navItems.map((item) => (
            <button
              key={item.id}
              id={`nav-item-${item.id}`}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "h-full px-1 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 relative",
                activeTab === item.id 
                  ? "text-brand-primary border-brand-primary" 
                  : "text-slate-500 border-transparent hover:text-slate-800"
              )}
            >
              {item.label}
              {item.id === 'notifications' && unreadCount > 0 && (
                <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-black leading-none text-white bg-brand-primary rounded-full shadow-sm animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent('trigger-onboarding-tour'));
            }}
            id="nav-tour-guide-btn"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-pink-50 hover:bg-pink-100 text-pink-700 hover:text-pink-800 rounded-full text-[10px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer border border-pink-200/40"
            title="Start Interactive Platform Tour"
          >
            <Sparkles className="w-3.5 h-3.5 text-pink-500 animate-pulse" />
            <span>Guide Tour</span>
          </button>

          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full text-[10px] font-bold text-slate-600 uppercase tracking-wider">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Polygon Mainnet
          </div>
          {profile ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end mr-2">
                 <span className="text-[10px] font-bold text-slate-800 leading-none">{profile.displayName?.split(' ')[0]}</span>
                 <span className={cn(
                    "text-[8px] font-bold uppercase tracking-widest",
                    profile.role === 'admin' ? "text-teal-800" : (
                      profile.loyaltyTier === 'Platinum Champion' ? "text-teal-600" :
                      profile.loyaltyTier === 'Gold Champion' ? "text-amber-600" :
                      profile.loyaltyTier === 'Silver Champion' ? "text-slate-500" :
                      "text-orange-600"
                    )
                 )}>{profile.role === 'admin' ? 'Foundation Admin' : profile.loyaltyTier}</span>
              </div>
              <div className="w-8 h-8 bg-slate-200 rounded-full overflow-hidden border border-slate-200">
                {profile.photoURL ? <img src={profile.photoURL} alt="" /> : <UserCircle className="w-full h-full text-slate-400" />}
              </div>
              <button onClick={logout} className="hidden sm:block text-slate-400 hover:text-red-600 transition-colors">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={login}
              className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg hover:bg-slate-900 transition-all"
            >
              Sign In
            </button>
          )}
        </div>
      </div>

      {/* Mobile Bottom Navigation - Centered & Optimized */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex items-center justify-around h-16 px-2 z-50 shadow-[0_-4px_10px_rgba(0,0,0,0.03)] overflow-x-auto no-scrollbar">
        {navItems.map((item) => (
          <button
            key={item.id}
            id={`mob-nav-item-${item.id}`}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 flex-1 min-w-0 max-w-[96px] h-full transition-all px-1 relative",
              activeTab === item.id ? "text-brand-primary" : "text-slate-400"
            )}
          >
            <div className="relative">
              <item.icon className={cn("w-5 h-5", activeTab === item.id && "fill-current/10")} />
              {item.id === 'notifications' && unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-primary"></span>
                </span>
              )}
            </div>
            <span className="text-[9px] font-bold uppercase tracking-tight whitespace-nowrap">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
