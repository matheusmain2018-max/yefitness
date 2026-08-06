import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users, ShieldCheck, Search, Eye, Utensils, Camera, Calendar,
  TrendingUp, X, CheckSquare, RefreshCw, ChevronRight, User as UserIcon,
  Flame, Award, Scale, AlertCircle
} from 'lucide-react';
import { db } from '../services/firebase';
import { collection, getDocs, doc, getDoc, query, where, orderBy } from 'firebase/firestore';
import { UserProfile, EvolutionRecord, Meal } from '../types';
import { cn, accentColors, bgAccents } from '../App';

interface Props {
  profile: UserProfile | null;
  user: any;
}

interface UserWithData {
  profile: UserProfile;
  customDiet?: any;
  loggedMeals?: Meal[];
  evolutionLogs: EvolutionRecord[];
  isLoadingDetails?: boolean;
}

export default function AdminDashboard({ profile, user }: Props) {
  const themeKey = (profile?.theme || 'neon-red') as keyof typeof accentColors;
  const accentClass = accentColors[themeKey];
  const bgAccentClass = bgAccents[themeKey];

  const [usersList, setUsersList] = useState<UserWithData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithData | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<'diets' | 'evolution'>('diets');
  const [selectedImageModal, setSelectedImageModal] = useState<string | null>(null);

  // Load all users from Firestore
  const loadAllUsers = async () => {
    setIsLoading(true);
    try {
      const usersRef = collection(db, 'users');
      const snap = await getDocs(usersRef);
      
      const loaded: UserWithData[] = [];
      for (const docSnap of snap.docs) {
        const uProfile = docSnap.data() as UserProfile;
        loaded.push({
          profile: uProfile,
          evolutionLogs: [],
          isLoadingDetails: false
        });
      }

      setUsersList(loaded);
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.email === 'matheusmain2018@gmail.com') {
      loadAllUsers();
    }
  }, [user]);

  // Load specific user details when clicked (Custom Diet, Logged Meals, Evolution Records)
  const handleSelectUser = async (u: UserWithData) => {
    setSelectedUser(u);
    setActiveModalTab('diets');

    if (u.customDiet !== undefined || u.loggedMeals !== undefined) {
      // Already loaded
      return;
    }

    try {
      // 1. Custom Diet
      const customDietRef = doc(db, 'users', u.profile.uid, 'custom_diet_plan', 'default');
      const customSnap = await getDoc(customDietRef);
      const customDietData = customSnap.exists() ? customSnap.data() : null;

      // 2. Logged AI Meals from 'meals' collection
      const mealsRef = collection(db, 'meals');
      const mealsQuery = query(mealsRef, where('userId', '==', u.profile.uid));
      const mealsSnap = await getDocs(mealsQuery);
      const userMeals: Meal[] = mealsSnap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as Meal[];
      userMeals.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

      // 3. Evolution logs from 'evolution' collection
      const evolRef = collection(db, 'evolution');
      const evolQuery = query(evolRef, where('userId', '==', u.profile.uid));
      const evolSnap = await getDocs(evolQuery);
      const evolLogs: EvolutionRecord[] = evolSnap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as EvolutionRecord[];

      // Sort logs descending by date
      evolLogs.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

      const updatedUser: UserWithData = {
        ...u,
        customDiet: customDietData,
        loggedMeals: userMeals,
        evolutionLogs: evolLogs
      };

      setSelectedUser(updatedUser);
      setUsersList(prev => prev.map(item => item.profile.uid === u.profile.uid ? updatedUser : item));
    } catch (err) {
      console.error('Erro ao carregar detalhes do usuário:', err);
    }
  };

  const filteredUsers = usersList.filter(u => {
    const q = searchQuery.toLowerCase();
    const name = (u.profile.name || '').toLowerCase();
    const uid = (u.profile.uid || '').toLowerCase();
    return name.includes(q) || uid.includes(q);
  });

  // Verify Admin Access
  if (user?.email !== 'matheusmain2018@gmail.com') {
    return (
      <div className="py-24 text-center max-w-md mx-auto space-y-4">
        <ShieldCheck className="w-16 h-16 text-red-500 mx-auto" />
        <h2 className="text-2xl font-black text-white">Acesso Restrito</h2>
        <p className="text-zinc-400 text-sm">
          Apenas a conta de administração <strong className="text-white">matheusmain2018@gmail.com</strong> tem acesso a este painel exclusivo.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-28 relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className={cn("px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest text-black flex items-center gap-1.5", bgAccentClass)}>
              <ShieldCheck className="w-3.5 h-3.5" />
              Painel do Administrador
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-zinc-900 border border-zinc-800 text-zinc-300">
              {usersList.length} Usuários
            </span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-black tracking-tight text-white">
            Supervisão Geral
          </h2>
          <p className="text-zinc-400 text-sm mt-1 max-w-xl">
            Acompanhe em tempo real as dietas personalizadas, refeições registradas e fotos de evolução física de todos os usuários logados.
          </p>
        </div>

        <button
          type="button"
          onClick={loadAllUsers}
          disabled={isLoading}
          className="px-4 py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all"
        >
          <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          <span>Atualizar Dados</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar usuário por nome..."
          className="w-full bg-zinc-900/90 border border-zinc-800 focus:border-red-500/60 pl-11 pr-4 py-3.5 rounded-2xl text-sm text-white placeholder-zinc-500 outline-none transition-all"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-zinc-400 hover:text-white rounded-xl"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Users List Grid */}
      {isLoading ? (
        <div className="py-20 text-center text-zinc-500 space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-red-500" />
          <p className="text-sm font-bold">Carregando usuários e perfis...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="py-16 text-center bg-zinc-900/40 border border-zinc-800 rounded-3xl space-y-2">
          <Users className="w-12 h-12 text-zinc-600 mx-auto" />
          <p className="text-zinc-400 text-sm font-medium">
            Nenhum usuário encontrado para "{searchQuery}".
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredUsers.map(item => {
            const anyProfile = item.profile as any;
            const targetKcal = anyProfile.customCalories || anyProfile.targetCalories || 2000;
            return (
              <div
                key={item.profile.uid}
                className="bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 p-5 rounded-3xl flex flex-col justify-between space-y-5 transition-all shadow-lg group"
              >
                {/* User Identity Info */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg text-black", bgAccentClass)}>
                      {(item.profile.name || 'U')[0].toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white group-hover:text-red-400 transition-colors">
                        {item.profile.name || 'Usuário Sem Nome'}
                      </h3>
                      <span className="text-[11px] text-zinc-500 font-mono block truncate max-w-[180px]">
                        ID: {item.profile.uid.slice(0, 10)}...
                      </span>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase bg-zinc-800 text-zinc-300">
                    {item.profile.goal === 'lose' ? 'Perder Peso' : item.profile.goal === 'gain' ? 'Ganha Massa' : 'Manutenção'}
                  </span>
                </div>

                {/* Stats pill bar */}
                <div className="grid grid-cols-3 gap-2 bg-zinc-950 p-3 rounded-2xl border border-zinc-800 text-center">
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase block">Meta kcal</span>
                    <span className="text-sm font-black text-white font-mono">
                      {targetKcal}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase block">Atividade</span>
                    <span className="text-xs font-bold text-zinc-300 truncate block">
                      {item.profile.activityLevel || 'mod.'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase block">Tema</span>
                    <span className="text-xs font-bold text-red-400 uppercase block">
                      {item.profile.theme || 'neon-red'}
                    </span>
                  </div>
                </div>

                {/* View details button */}
                <button
                  type="button"
                  onClick={() => handleSelectUser(item)}
                  className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-zinc-950 hover:bg-red-500/10 text-zinc-300 hover:text-red-400 border border-zinc-800 hover:border-red-500/30 transition-all flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4 text-red-400" />
                  <span>Inspecionar Dietas & Evolução</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: INSPECT SELECTED USER */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedUser(null)}
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative z-10 w-full max-w-4xl bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-zinc-800 pb-5">
                <div className="flex items-center gap-4">
                  <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl text-black", bgAccentClass)}>
                    {(selectedUser.profile.name || 'U')[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-red-400">
                        Inspecionando Usuário
                      </span>
                      <span className="text-xs text-zinc-500 font-mono">
                        ({selectedUser.profile.uid})
                      </span>
                    </div>
                    <h3 className="text-2xl font-black text-white">
                      {selectedUser.profile.name || 'Sem Nome'}
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="p-2.5 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Tabs */}
              <div className="flex items-center gap-3 border-b border-zinc-800/80 pb-3">
                <button
                  type="button"
                  onClick={() => setActiveModalTab('diets')}
                  className={cn(
                    "px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all",
                    activeModalTab === 'diets'
                      ? cn(bgAccentClass, "text-black shadow-lg")
                      : "bg-zinc-950 text-zinc-400 hover:text-white"
                  )}
                >
                  <Utensils className="w-4 h-4" />
                  <span>Dietas & Refeições ({selectedUser.loggedMeals?.length || 0})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveModalTab('evolution')}
                  className={cn(
                    "px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all",
                    activeModalTab === 'evolution'
                      ? cn(bgAccentClass, "text-black shadow-lg")
                      : "bg-zinc-950 text-zinc-400 hover:text-white"
                  )}
                >
                  <Camera className="w-4 h-4" />
                  <span>Fotos de Evolução ({selectedUser.evolutionLogs?.length || 0})</span>
                </button>
              </div>

              {/* TAB 1: DIETS */}
              {activeModalTab === 'diets' && (
                <div className="space-y-6">
                  {/* Custom Diet Plan */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="w-4 h-4 text-red-400" />
                      <h4 className="text-base font-black text-white uppercase tracking-wider">
                        Minha Dieta Personalizada
                      </h4>
                    </div>

                    {!selectedUser.customDiet || !selectedUser.customDiet.meals || selectedUser.customDiet.meals.length === 0 ? (
                      <div className="p-6 text-center bg-zinc-950 border border-zinc-800/60 rounded-2xl">
                        <p className="text-zinc-500 text-xs font-medium">
                          O usuário ainda não montou sua dieta personalizada.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedUser.customDiet.meals.map((meal: any) => (
                          <div
                            key={meal.id}
                            className="bg-zinc-950 border border-zinc-800/80 p-4 rounded-2xl space-y-3"
                          >
                            <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2">
                              <span className="text-sm font-black text-white">
                                {meal.name}
                              </span>
                              <span className="text-xs text-zinc-400 font-mono">
                                {meal.time || '00:00'}
                              </span>
                            </div>

                            {!meal.items || meal.items.length === 0 ? (
                              <p className="text-zinc-600 text-xs italic">Nenhum alimento inserido</p>
                            ) : (
                              <div className="space-y-2">
                                {meal.items.map((it: any) => (
                                  <div
                                    key={it.id}
                                    className="flex items-center justify-between text-xs bg-zinc-900/60 px-3 py-2 rounded-xl"
                                  >
                                    <div>
                                      <span className="font-bold text-zinc-200 block">
                                        {it.name}
                                      </span>
                                      <span className="text-[10px] text-zinc-500 font-mono">
                                        {it.quantity} • {it.calories} kcal
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 font-mono text-[11px] font-bold">
                                      <span className="text-emerald-400">P:{it.protein}g</span>
                                      <span className="text-amber-400">C:{it.carbs}g</span>
                                      <span className="text-blue-400">G:{it.fat}g</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Logged AI Meals */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-2">
                      <Flame className="w-4 h-4 text-red-400" />
                      <h4 className="text-base font-black text-white uppercase tracking-wider">
                        Refeições Registradas & Analisadas pela IA
                      </h4>
                    </div>

                    {!selectedUser.loggedMeals || selectedUser.loggedMeals.length === 0 ? (
                      <div className="p-6 text-center bg-zinc-950 border border-zinc-800/60 rounded-2xl">
                        <p className="text-zinc-500 text-xs font-medium">
                          O usuário ainda não registrou refeições no diário IA.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedUser.loggedMeals.map((meal) => (
                          <div
                            key={meal.id}
                            className="bg-zinc-950 border border-zinc-800/80 p-4 rounded-2xl space-y-3"
                          >
                            <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2">
                              <span className="text-xs text-zinc-400 font-mono font-bold">
                                📅 {meal.date}
                              </span>
                              <span className="text-xs text-red-400 font-mono font-bold">
                                {meal.calories} kcal
                              </span>
                            </div>
                            <p className="text-xs text-white leading-relaxed font-bold">
                              {meal.description}
                            </p>
                            <div className="flex items-center gap-3 font-mono text-[11px] font-bold bg-zinc-900/60 px-3 py-1.5 rounded-lg">
                              <span className="text-emerald-400">P: {meal.protein}g</span>
                              <span className="text-amber-400">C: {meal.carbs}g</span>
                              <span className="text-blue-400">G: {meal.fat}g</span>
                            </div>
                            {meal.aiComment && (
                              <p className="text-[11px] text-zinc-400 italic">
                                "{meal.aiComment}"
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: EVOLUTION PHOTOS */}
              {activeModalTab === 'evolution' && (
                <div className="space-y-6">
                  {!selectedUser.evolutionLogs || selectedUser.evolutionLogs.length === 0 ? (
                    <div className="p-12 text-center bg-zinc-950 border border-zinc-800/60 rounded-3xl space-y-3">
                      <Camera className="w-10 h-10 text-zinc-600 mx-auto" />
                      <p className="text-zinc-400 text-sm font-bold">
                        Nenhum registro de evolução ou foto enviada por este usuário.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {selectedUser.evolutionLogs.map((log) => (
                        <div
                          key={log.id}
                          className="bg-zinc-950 border border-zinc-800 p-5 rounded-3xl space-y-4"
                        >
                          {/* Log date header */}
                          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-red-400" />
                              <span className="text-sm font-black text-white">
                                Registro de: {log.date || 'Data não especificada'}
                              </span>
                            </div>
                          </div>

                          {/* Photos Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {/* Frente */}
                            <div className="space-y-2">
                              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block text-center">
                                Frente
                              </span>
                              {log.photos?.front ? (
                                <div
                                  onClick={() => setSelectedImageModal(log.photos.front!)}
                                  className="aspect-[3/4] bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 cursor-pointer hover:opacity-90 transition-opacity"
                                >
                                  <img
                                    src={log.photos.front}
                                    alt="Evolução - Frente"
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="aspect-[3/4] bg-zinc-900/50 rounded-2xl border border-zinc-800/50 flex items-center justify-center text-xs text-zinc-600">
                                  Sem foto frente
                                </div>
                              )}
                            </div>

                            {/* Lado / Perfil */}
                            <div className="space-y-2">
                              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block text-center">
                                Perfil / Lado
                              </span>
                              {log.photos?.side ? (
                                <div
                                  onClick={() => setSelectedImageModal(log.photos.side!)}
                                  className="aspect-[3/4] bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 cursor-pointer hover:opacity-90 transition-opacity"
                                >
                                  <img
                                    src={log.photos.side}
                                    alt="Evolução - Perfil"
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="aspect-[3/4] bg-zinc-900/50 rounded-2xl border border-zinc-800/50 flex items-center justify-center text-xs text-zinc-600">
                                  Sem foto perfil
                                </div>
                              )}
                            </div>

                            {/* Costas */}
                            <div className="space-y-2">
                              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block text-center">
                                Costas
                              </span>
                              {log.photos?.back ? (
                                <div
                                  onClick={() => setSelectedImageModal(log.photos.back!)}
                                  className="aspect-[3/4] bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 cursor-pointer hover:opacity-90 transition-opacity"
                                >
                                  <img
                                    src={log.photos.back}
                                    alt="Evolução - Costas"
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="aspect-[3/4] bg-zinc-900/50 rounded-2xl border border-zinc-800/50 flex items-center justify-center text-xs text-zinc-600">
                                  Sem foto costas
                                </div>
                              )}
                            </div>

                            {/* Bíceps */}
                            <div className="space-y-2">
                              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block text-center">
                                Bíceps
                              </span>
                              {log.photos?.biceps ? (
                                <div
                                  onClick={() => setSelectedImageModal(log.photos.biceps!)}
                                  className="aspect-[3/4] bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 cursor-pointer hover:opacity-90 transition-opacity"
                                >
                                  <img
                                    src={log.photos.biceps}
                                    alt="Evolução - Bíceps"
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="aspect-[3/4] bg-zinc-900/50 rounded-2xl border border-zinc-800/50 flex items-center justify-center text-xs text-zinc-600">
                                  Sem foto bíceps
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Measurements */}
                          {log.measurements && Object.keys(log.measurements).length > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2">
                              {log.measurements.chest && (
                                <div className="bg-zinc-900 px-3 py-2 rounded-xl text-xs">
                                  <span className="text-zinc-500 block text-[10px]">Peitoral</span>
                                  <strong className="text-white">{log.measurements.chest} cm</strong>
                                </div>
                              )}
                              {log.measurements.waist && (
                                <div className="bg-zinc-900 px-3 py-2 rounded-xl text-xs">
                                  <span className="text-zinc-500 block text-[10px]">Cintura</span>
                                  <strong className="text-white">{log.measurements.waist} cm</strong>
                                </div>
                              )}
                              {log.measurements.biceps && (
                                <div className="bg-zinc-900 px-3 py-2 rounded-xl text-xs">
                                  <span className="text-zinc-500 block text-[10px]">Bíceps</span>
                                  <strong className="text-white">{log.measurements.biceps} cm</strong>
                                </div>
                              )}
                              {log.measurements.thigh && (
                                <div className="bg-zinc-900 px-3 py-2 rounded-xl text-xs">
                                  <span className="text-zinc-500 block text-[10px]">Coxa</span>
                                  <strong className="text-white">{log.measurements.thigh} cm</strong>
                                </div>
                              )}
                            </div>
                          )}

                          {log.aiAnalysis && (
                            <div className="bg-zinc-900/80 p-3.5 rounded-xl border border-zinc-800 text-xs text-zinc-300 leading-relaxed">
                              <strong className="text-red-400 block mb-1">Análise da IA:</strong>
                              {log.aiAnalysis}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FULLSCREEN IMAGE MODAL */}
      <AnimatePresence>
        {selectedImageModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-lg">
            <button
              type="button"
              onClick={() => setSelectedImageModal(null)}
              className="absolute top-6 right-6 p-3 bg-zinc-900 text-white rounded-full hover:bg-zinc-800 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={selectedImageModal}
              alt="Ampliada"
              referrerPolicy="no-referrer"
              className="max-w-full max-h-[90vh] object-contain rounded-2xl border border-zinc-800"
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
