import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Utensils, 
  Dumbbell, 
  Pill, 
  Timer, 
  TrendingUp, 
  Settings as SettingsIcon,
  LogOut,
  User as UserIcon
} from 'lucide-react';
import { auth, loginWithGoogle, logout, db } from './services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { UserProfile } from './types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Pages
import Diet from './pages/Diet';
import Workouts from './pages/Workouts';
import Supplements from './pages/Supplements';
import Cardios from './pages/Cardios';
import Evolution from './pages/Evolution';
import Settings from './pages/Settings';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const themes = {
  dark: 'bg-zinc-950 text-zinc-100 selection:bg-zinc-700',
  light: 'bg-zinc-50 text-zinc-900 selection:bg-zinc-200',
  'gym-neon': 'bg-[#020400] text-white selection:bg-lime-500/30 font-sans',
  'neon-blue': 'bg-[#00040a] text-white selection:bg-blue-500/30 font-sans',
  'neon-red': 'bg-[#050000] text-white selection:bg-red-500/30 font-sans',
  'neon-purple': 'bg-[#040008] text-white selection:bg-purple-500/30 font-sans',
  'neon-cyan': 'bg-[#000505] text-white selection:bg-cyan-500/30 font-sans',
  sunset: 'bg-orange-50 text-orange-950 selection:bg-orange-200'
};

export const accentColors = {
  dark: 'text-zinc-400',
  light: 'text-zinc-500',
  'gym-neon': 'text-lime-400',
  'neon-blue': 'text-blue-400',
  'neon-red': 'text-red-400',
  'neon-purple': 'text-purple-400',
  'neon-cyan': 'text-cyan-400',
  sunset: 'text-orange-500'
};

export const bgAccents = {
  dark: 'bg-zinc-800',
  light: 'bg-zinc-200',
  'gym-neon': 'bg-lime-400',
  'neon-blue': 'bg-blue-400',
  'neon-red': 'bg-red-400',
  'neon-purple': 'bg-purple-400',
  'neon-cyan': 'bg-cyan-400',
  sunset: 'bg-orange-400'
};

export const shadowAccents = {
  dark: 'shadow-zinc-500/20',
  light: 'shadow-zinc-500/20',
  'gym-neon': 'shadow-lime-400/20',
  'neon-blue': 'shadow-blue-400/20',
  'neon-red': 'shadow-red-400/20',
  'neon-purple': 'shadow-purple-400/20',
  'neon-cyan': 'shadow-cyan-400/20',
  sunset: 'shadow-orange-400/20'
};

export const borderAccents = {
  dark: 'focus:border-zinc-500',
  light: 'focus:border-zinc-400',
  'gym-neon': 'focus:border-lime-400',
  'neon-blue': 'focus:border-blue-400',
  'neon-red': 'focus:border-red-400',
  'neon-purple': 'focus:border-purple-400',
  'neon-cyan': 'focus:border-cyan-400',
  sunset: 'focus:border-orange-400'
};

export const ringAccents = {
  dark: 'focus:ring-zinc-500',
  light: 'focus:ring-zinc-400',
  'gym-neon': 'focus:ring-lime-400',
  'neon-blue': 'focus:ring-blue-400',
  'neon-red': 'focus:ring-red-400',
  'neon-purple': 'focus:ring-purple-400',
  'neon-cyan': 'focus:ring-cyan-400',
  sunset: 'focus:ring-orange-400'
};

export const hoverBorderAccents = {
  dark: 'hover:border-zinc-500/30',
  light: 'hover:border-zinc-400/30',
  'gym-neon': 'hover:border-lime-400/30',
  'neon-blue': 'hover:border-blue-400/30',
  'neon-red': 'hover:border-red-400/30',
  'neon-purple': 'hover:border-purple-400/30',
  'neon-cyan': 'hover:border-cyan-400/30',
  sunset: 'hover:border-orange-400/30'
};

export const hexAccents = {
  dark: '#71717a',
  light: '#a1a1aa',
  'gym-neon': '#A3E635',
  'neon-blue': '#60A5FA',
  'neon-red': '#F87171',
  'neon-purple': '#C084FC',
  'neon-cyan': '#22D3EE',
  sunset: '#FB923C'
};

export const bgSoftAccents = {
  dark: 'bg-zinc-500/10',
  light: 'bg-zinc-500/10',
  'gym-neon': 'bg-lime-400/10',
  'neon-blue': 'bg-blue-400/10',
  'neon-red': 'bg-red-400/10',
  'neon-purple': 'bg-purple-400/10',
  'neon-cyan': 'bg-cyan-400/10',
  sunset: 'bg-orange-400/10'
};

export const borderSoftAccents = {
  dark: 'border-zinc-500/40',
  light: 'border-zinc-500/40',
  'gym-neon': 'border-lime-400/40',
  'neon-blue': 'border-blue-400/40',
  'neon-red': 'border-red-400/40',
  'neon-purple': 'border-purple-400/40',
  'neon-cyan': 'border-cyan-400/40',
  sunset: 'border-orange-400/40'
};

export const atmosphereColors = {
  dark: 'rgba(255, 255, 255, 0.02)',
  light: 'rgba(0, 0, 0, 0.02)',
  'gym-neon': 'rgba(163, 230, 53, 0.05)',
  'neon-blue': 'rgba(96, 165, 250, 0.05)',
  'neon-red': 'rgba(248, 113, 113, 0.05)',
  'neon-purple': 'rgba(192, 132, 252, 0.05)',
  'neon-cyan': 'rgba(34, 211, 238, 0.05)',
  sunset: 'rgba(251, 146, 60, 0.05)'
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState('dieta');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const profileRef = doc(db, 'users', u.uid);
        onSnapshot(profileRef, (snap) => {
          if (snap.exists()) {
            setProfile(snap.data() as UserProfile);
          } else {
            const newProfile: UserProfile = {
              uid: u.uid,
              name: u.displayName || 'Usuário',
              theme: 'gym-neon'
            };
            setDoc(profileRef, newProfile);
            setProfile(newProfile);
          }
        });
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  const themeKey = (profile?.theme || 'gym-neon') as keyof typeof themes;
  const themeClass = themes[themeKey];
  const accentClass = accentColors[themeKey];
  const bgAccentClass = bgAccents[themeKey];
  const shadowAccentClass = shadowAccents[themeKey];
  const atmosphereColor = atmosphereColors[themeKey];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity }}
          className={cn(accentClass)}
        >
          <Dumbbell size={48} />
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-black p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full space-y-8 text-center"
        >
          <div className="flex justify-center mb-8">
            <div className={cn("p-4 rounded-full", bgAccentClass + "/10")}>
              <Dumbbell className={cn("w-16 h-16", accentClass)} />
            </div>
          </div>
          <h1 className="text-6xl font-black tracking-tighter text-white">YeeFit</h1>
          <p className="text-zinc-400 text-lg">O próximo nível da sua evolução física, alimentado por IA.</p>
          <button 
            onClick={loginWithGoogle}
            className="w-full flex items-center justify-center gap-3 bg-white text-black font-bold py-4 rounded-2xl hover:bg-zinc-200 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
            Começar Agora com Google
          </button>
        </motion.div>
      </main>
    );
  }

  const tabs = [
    { id: 'dieta', label: 'Dieta', icon: Utensils },
    { id: 'treinos', label: 'Treinos', icon: Dumbbell },
    { id: 'suplementos', label: 'Suplementos', icon: Pill },
    { id: 'cardios', label: 'Cardios', icon: Timer },
    { id: 'evolução', label: 'Evolução', icon: TrendingUp },
    { id: 'config', label: 'Config', icon: SettingsIcon },
  ];

  return (
    <div className={cn("min-h-screen transition-all duration-700 relative overflow-hidden", themeClass)}>
      {/* Atmosphere Background Effect */}
      <div 
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: `radial-gradient(circle at 50% -20%, ${atmosphereColor} 0%, transparent 70%), 
                       radial-gradient(circle at 0% 100%, ${atmosphereColor} 0%, transparent 50%)`
        }}
      />

      {/* Mobile Nav Top */}
      <header className="fixed top-0 left-0 right-0 z-50 p-4 lg:hidden flex justify-between items-center glassmorphism border-b bg-opacity-80">
        <h1 className="text-2xl font-black tracking-tighter">YeeFit</h1>
        <button onClick={logout} className="p-2 opacity-60 hover:opacity-100">
          <LogOut size={20} />
        </button>
      </header>

      {/* Sidebar Desktop */}
      <nav className="fixed left-0 top-0 bottom-0 w-64 p-6 hidden lg:flex flex-col border-r border-zinc-800/50 bg-black/20 backdrop-blur-3xl z-50">
        <div className="flex items-center gap-3 mb-12">
          <div className={cn("p-2 rounded-xl", bgAccentClass + "/10")}>
            <Dumbbell className={cn(accentClass)} />
          </div>
          <h1 className="text-3xl font-black tracking-tighter font-display">YeeFit</h1>
        </div>

        <div className="flex-1 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "w-full flex items-center gap-4 py-3 px-4 rounded-2xl font-bold transition-all group outline-none",
                activeTab === tab.id 
                  ? cn(bgAccentClass, "text-black shadow-lg", shadowAccentClass) 
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              )}
            >
              <tab.icon size={22} className={cn(activeTab === tab.id ? "" : "group-hover:scale-110 transition-transform")} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-auto pt-6 border-t border-zinc-800/50">
          <div className="flex items-center gap-3 mb-6 px-4">
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden border border-zinc-700">
              {user.photoURL ? <img src={user.photoURL} alt={user.displayName || ''} referrerPolicy="no-referrer" /> : <UserIcon size={20} />}
            </div>
            <div>
              <p className="text-sm font-bold truncate max-w-[120px]">{user.displayName}</p>
              <p className={cn("text-xs opacity-60 font-mono", accentClass)}>VERIFIED</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 py-3 px-4 rounded-xl font-bold text-red-400 hover:bg-red-400/10 transition-all"
          >
            <LogOut size={20} />
            Sair
          </button>
        </div>
      </nav>

      {/* Bottom Nav Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden flex justify-around items-center p-2 bg-black/80 backdrop-blur-xl border-t border-zinc-800 pb-safe">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-colors",
              activeTab === tab.id ? accentClass : "text-zinc-500"
            )}
          >
            <tab.icon size={22} />
            <span className="text-[10px] mt-1 font-bold">{tab.label.slice(0, 4)}</span>
          </button>
        ))}
      </nav>

      <main className={cn("relative z-10 lg:ml-64 pt-20 pb-24 lg:pt-0 lg:pb-0 min-h-screen")}>
        <AnimatePresence mode="wait">
          <motion.section
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="p-4 lg:p-12 max-w-6xl mx-auto"
          >
            {activeTab === 'dieta' && <Diet profile={profile} user={user} />}
            {activeTab === 'treinos' && <Workouts profile={profile} user={user} />}
            {activeTab === 'suplementos' && <Supplements profile={profile} user={user} />}
            {activeTab === 'cardios' && <Cardios profile={profile} user={user} />}
            {activeTab === 'evolução' && <Evolution profile={profile} user={user} />}
            {activeTab === 'config' && <Settings profile={profile} user={user} />}
          </motion.section>
        </AnimatePresence>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;900&display=swap');
        
        .font-display {
          font-family: 'Outfit', sans-serif;
        }

        .glassmorphism {
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .pb-safe {
          padding-bottom: env(safe-area-inset-bottom);
        }
      `}</style>
    </div>
  );
}
