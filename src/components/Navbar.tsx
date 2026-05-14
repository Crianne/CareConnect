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
  ClipboardList
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { UserRole } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Navbar({ activeTab, setActiveTab }: NavbarProps) {
  const { profile, login, logout } = useAuth();

  const getNavItems = () => {
    if (profile?.role === UserRole.ADMIN) {
      return [
        { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
        { id: 'admin', label: 'Admin Hub', icon: ClipboardList },
        { id: 'patients', label: 'Cases', icon: Heart },
        { id: 'auctions', label: 'Auctions', icon: Gavel },
        { id: 'notifications', label: 'Alerts', icon: Bell },
        { id: 'settings', label: 'Config', icon: Settings },
      ];
    }
    return [
      { id: 'dashboard', label: 'Impact', icon: LayoutDashboard },
      { id: 'patients', label: 'Warriors', icon: Heart },
      { id: 'auctions', label: 'Auctions', icon: Gavel },
      { id: 'transparency', label: 'Ledger', icon: ShieldCheck },
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
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "h-full px-1 text-sm font-semibold transition-all border-b-2 flex items-center gap-2",
                activeTab === item.id 
                  ? "text-brand-primary border-brand-primary" 
                  : "text-slate-500 border-transparent hover:text-slate-800"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
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

      {/* Mobile Bottom Navigation - Scrollable */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex items-center h-16 px-4 z-50 shadow-[0_-4px_10px_rgba(0,0,0,0.03)] overflow-x-auto no-scrollbar">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 min-w-[72px] h-full transition-all flex-shrink-0 px-2",
              activeTab === item.id ? "text-brand-primary" : "text-slate-400"
            )}
          >
            <item.icon className={cn("w-5 h-5", activeTab === item.id && "fill-current/10")} />
            <span className="text-[9px] font-bold uppercase tracking-tight whitespace-nowrap">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
