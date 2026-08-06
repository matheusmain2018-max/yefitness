import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Utensils, 
  Dumbbell, 
  Pill, 
  TrendingUp, 
  Settings as SettingsIcon,
  LogOut,
  User as UserIcon,
  Zap,
  BookOpen,
  Apple,
  CheckSquare,
  Moon,
  Salad,
  ShieldCheck
} from 'lucide-react';
import { auth, loginWithGoogle, logout, db } from './services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { UserProfile } from './types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Pages
import Diet from './pages/Diet';
import CustomDiet from './pages/CustomDiet';
import Diary from './pages/Diary';
import Sleep from './pages/Sleep';
import Workouts from './pages/Workouts';
import Supplements from './pages/Supplements';
import Evolution from './pages/Evolution';
import Settings from './pages/Settings';
import LOUtrista from './pages/LOUtrista';
import Foods from './pages/Foods';
import AdminDashboard from './pages/AdminDashboard';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const themes = {
  dark: 'bg-[#050000] text-white selection:bg-red-500/30 font-sans',
  light: 'bg-[#050000] text-white selection:bg-red-500/30 font-sans',
  'gym-neon': 'bg-[#050000] text-white selection:bg-red-500/30 font-sans',
  'neon-blue': 'bg-[#050000] text-white selection:bg-red-500/30 font-sans',
  'neon-red': 'bg-[#050000] text-white selection:bg-red-500/30 font-sans',
  'neon-purple': 'bg-[#050000] text-white selection:bg-red-500/30 font-sans',
  'neon-cyan': 'bg-[#050000] text-white selection:bg-red-500/30 font-sans',
  sunset: 'bg-[#050000] text-white selection:bg-red-500/30 font-sans'
};

export const accentColors = {
  dark: 'text-red-400',
  light: 'text-red-400',
  'gym-neon': 'text-red-400',
  'neon-blue': 'text-red-400',
  'neon-red': 'text-red-400',
  'neon-purple': 'text-red-400',
  'neon-cyan': 'text-red-400',
  sunset: 'text-red-400'
};

export const bgAccents = {
  dark: 'bg-red-400',
  light: 'bg-red-400',
  'gym-neon': 'bg-red-400',
  'neon-blue': 'bg-red-400',
  'neon-red': 'bg-red-400',
  'neon-purple': 'bg-red-400',
  'neon-cyan': 'bg-red-400',
  sunset: 'bg-red-400'
};

export const shadowAccents = {
  dark: 'shadow-red-400/20',
  light: 'shadow-red-400/20',
  'gym-neon': 'shadow-red-400/20',
  'neon-blue': 'shadow-red-400/20',
  'neon-red': 'shadow-red-400/20',
  'neon-purple': 'shadow-red-400/20',
  'neon-cyan': 'shadow-red-400/20',
  sunset: 'shadow-red-400/20'
};

export const borderAccents = {
  dark: 'focus:border-red-400',
  light: 'focus:border-red-400',
  'gym-neon': 'focus:border-red-400',
  'neon-blue': 'focus:border-red-400',
  'neon-red': 'focus:border-red-400',
  'neon-purple': 'focus:border-red-400',
  'neon-cyan': 'focus:border-red-400',
  sunset: 'focus:border-red-400'
};

export const ringAccents = {
  dark: 'focus:ring-red-400',
  light: 'focus:ring-red-400',
  'gym-neon': 'focus:ring-red-400',
  'neon-blue': 'focus:ring-red-400',
  'neon-red': 'focus:ring-red-400',
  'neon-purple': 'focus:ring-red-400',
  'neon-cyan': 'focus:ring-red-400',
  sunset: 'focus:ring-red-400'
};

export const hoverBorderAccents = {
  dark: 'hover:border-red-400/30',
  light: 'hover:border-red-400/30',
  'gym-neon': 'hover:border-red-400/30',
  'neon-blue': 'hover:border-red-400/30',
  'neon-red': 'hover:border-red-400/30',
  'neon-purple': 'hover:border-red-400/30',
  'neon-cyan': 'hover:border-red-400/30',
  sunset: 'hover:border-red-400/30'
};

export const hexAccents = {
  dark: '#F87171',
  light: '#F87171',
  'gym-neon': '#F87171',
  'neon-blue': '#F87171',
  'neon-red': '#F87171',
  'neon-purple': '#F87171',
  'neon-cyan': '#F87171',
  sunset: '#F87171'
};

export const bgSoftAccents = {
  dark: 'bg-red-400/10',
  light: 'bg-red-400/10',
  'gym-neon': 'bg-red-400/10',
  'neon-blue': 'bg-red-400/10',
  'neon-red': 'bg-red-400/10',
  'neon-purple': 'bg-red-400/10',
  'neon-cyan': 'bg-red-400/10',
  sunset: 'bg-red-400/10'
};

export const borderSoftAccents = {
  dark: 'border-red-400/40',
  light: 'border-red-400/40',
  'gym-neon': 'border-red-400/40',
  'neon-blue': 'border-red-400/40',
  'neon-red': 'border-red-400/40',
  'neon-purple': 'border-red-400/40',
  'neon-cyan': 'border-red-400/40',
  sunset: 'border-red-400/40'
};

export const atmosphereColors = {
  dark: 'rgba(248, 113, 113, 0.05)',
  light: 'rgba(248, 113, 113, 0.05)',
  'gym-neon': 'rgba(248, 113, 113, 0.05)',
  'neon-blue': 'rgba(248, 113, 113, 0.05)',
  'neon-red': 'rgba(248, 113, 113, 0.05)',
  'neon-purple': 'rgba(248, 113, 113, 0.05)',
  'neon-cyan': 'rgba(248, 113, 113, 0.05)',
  sunset: 'rgba(248, 113, 113, 0.05)'
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState('custom_diet');
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
              theme: 'neon-red'
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

  const themeKey = (profile?.theme || 'neon-red') as keyof typeof themes;
  const themeClass = themes[themeKey];
  const accentClass = accentColors[themeKey];
  const bgAccentClass = bgAccents[themeKey];
  const shadowAccentClass = shadowAccents[themeKey];
  const atmosphereColor = atmosphereColors[themeKey];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className={cn(accentClass, "p-4")}
        >
          <Zap size={48} fill="currentColor" className="opacity-80" />
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
            <div className={cn("p-6 rounded-3xl", bgAccentClass + "/10", "border border-" + accentClass.split('-')[1] + "-400/20")}>
              <Zap className={cn("w-16 h-16", accentClass)} fill="currentColor" />
            </div>
          </div>
          <h1 className="text-6xl font-black tracking-tighter text-white">LOU FIT</h1>
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

  const baseTabs = [
    { id: 'custom_diet', label: 'Dieta & Refeições', icon: Utensils },
    { id: 'alimentos', label: 'Alimentos', icon: Salad },
    { id: 'loutrista', label: 'LOUtrista', icon: Apple },
    { id: 'diario', label: 'Diário', icon: BookOpen },
    { id: 'sono', label: 'Sono', icon: Moon },
    { id: 'treinos', label: 'Treinos', icon: Dumbbell },
    { id: 'suplementos', label: 'Suplementos', icon: Pill },
    { id: 'evolução', label: 'Evolução', icon: TrendingUp },
    { id: 'config', label: 'Config', icon: SettingsIcon },
  ];

  const tabs = user?.email === 'matheusmain2018@gmail.com'
    ? [{ id: 'admin', label: 'Supervisão Admin', icon: ShieldCheck }, ...baseTabs]
    : baseTabs;

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
        <h1 className="text-2xl font-black tracking-tighter">LOU FIT</h1>
        <button onClick={logout} className="p-2 opacity-60 hover:opacity-100">
          <LogOut size={20} />
        </button>
      </header>

      {/* Sidebar Desktop */}
      <nav className="fixed left-0 top-0 bottom-0 w-64 p-6 hidden lg:flex flex-col border-r border-zinc-800/50 bg-black/20 backdrop-blur-3xl z-50">
        <div className="flex items-center gap-3 mb-12">
          <div className={cn("p-2.5 rounded-xl flex items-center justify-center", bgAccentClass + "/10")}>
            <Zap className={cn(accentClass)} size={24} fill="currentColor" />
          </div>
          <h1 className="text-3xl font-black tracking-tighter font-display">LOU FIT</h1>
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
            {activeTab === 'admin' && <AdminDashboard profile={profile} user={user} />}
            {(activeTab === 'custom_diet' || activeTab === 'dieta') && <CustomDiet profile={profile} user={user} />}
            {activeTab === 'alimentos' && <Foods profile={profile} user={user} />}
            {activeTab === 'loutrista' && <LOUtrista profile={profile} user={user} />}
            {activeTab === 'diario' && <Diary profile={profile} user={user} />}
            {activeTab === 'sono' && <Sleep profile={profile} user={user} />}
            {activeTab === 'treinos' && <Workouts profile={profile} user={user} />}
            {activeTab === 'suplementos' && <Supplements profile={profile} user={user} />}
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
