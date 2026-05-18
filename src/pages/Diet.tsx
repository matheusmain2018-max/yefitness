import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, History, Loader2, Calendar as CalendarIcon, Utensils, Trash2, Edit2, X, Check, Search, ChevronLeft, ChevronRight, Info, AlertTriangle } from 'lucide-react';
import { db } from '../services/firebase';
import { collection, addDoc, query, where, orderBy, onSnapshot, Timestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { analyzeMeal } from '../services/gemini';
import { Meal, UserProfile } from '../types';
import { format, isToday, parseISO, addDays, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { clsx } from 'clsx';
import { accentColors, bgAccents, shadowAccents, cn, ringAccents, hoverBorderAccents, hexAccents, bgSoftAccents } from '../App';

interface Props {
  profile: UserProfile | null;
  user: any;
}

export default function Diet({ profile, user }: Props) {
  const themeKey = (profile?.theme || 'gym-neon') as keyof typeof accentColors;
  const accentClass = accentColors[themeKey];
  const bgAccentClass = bgAccents[themeKey];
  const shadowAccentClass = shadowAccents[themeKey];
  const ringAccentClass = ringAccents[themeKey];
  const hoverBorderAccentClass = hoverBorderAccents[themeKey];
  const hexAccent = hexAccents[themeKey];
  const bgSoftAccentClass = bgSoftAccents[themeKey];

  const [description, setDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [history, setHistory] = useState<Meal[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'meals'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Meal));
      setHistory(data);
    });

    return unsubscribe;
  }, [user]);

  const handleAddMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setIsAnalyzing(true);
    try {
      const analysis = await analyzeMeal(description, profile?.healthIssues);
      const meal: Omit<Meal, 'id'> = {
        userId: user.uid,
        date: new Date().toISOString().split('T')[0],
        description,
        calories: analysis.calories,
        protein: analysis.protein,
        carbs: analysis.carbs,
        fat: analysis.fat,
        aiComment: analysis.aiComment,
        aiAdvice: analysis.aiAdvice,
        timestamp: Timestamp.now()
      };
      await addDoc(collection(db, 'meals'), meal);
      setDescription('');
    } catch (error) {
      console.error(error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDeleteMeal = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'meals', id));
      setDeletingId(null);
    } catch (error) {
      console.error(error);
    }
  };

  const handleUpdateMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMeal?.id) return;
    try {
      const { id, ...data } = editingMeal;
      await updateDoc(doc(db, 'meals', id), data);
      setEditingMeal(null);
    } catch (error) {
      console.error(error);
    }
  };

  const selectedEntries = useMemo(() => {
    return history.filter(m => m.date === selectedDate);
  }, [history, selectedDate]);

  const totals = selectedEntries.reduce((acc, curr) => ({
    calories: acc.calories + curr.calories,
    protein: acc.protein + curr.protein,
    carbs: acc.carbs + curr.carbs,
    fat: acc.fat + curr.fat
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const chartData = [
    { name: 'Proteína', value: totals.protein * 4, color: hexAccent },
    { name: 'Carbo', value: totals.carbs * 4, color: '#FB923C' },
    { name: 'Gordura', value: totals.fat * 9, color: '#EF4444' },
  ];

  const groupedHistory = useMemo(() => {
    const groups: Record<string, Meal[]> = {};
    history.forEach(meal => {
      if (!groups[meal.date]) groups[meal.date] = [];
      groups[meal.date].push(meal);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [history]);

  const changeDate = (days: number) => {
    const current = parseISO(selectedDate);
    const updated = addDays(current, days);
    setSelectedDate(updated.toISOString().split('T')[0]);
  };

  const targets = useMemo(() => {
    if (!profile || !profile.weight || !profile.height || !profile.age || !profile.gender) {
      return { calories: 2000, protein: 150, carbs: 250, fat: 65 };
    }

    let bmr = (10 * profile.weight) + (6.25 * profile.height) - (5 * profile.age);
    if (profile.gender === 'male') bmr += 5;
    else bmr -= 161;

    const activityMultipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9
    };

    let tdee = bmr * activityMultipliers[profile.activityLevel || 'moderate'];

    if (profile.goal === 'lose') tdee -= 500;
    else if (profile.goal === 'gain') tdee += 500;

    const protein = profile.weight * 2;
    const fat = profile.weight * 0.8;
    const carbs = (tdee - (protein * 4) - (fat * 9)) / 4;

    return {
      calories: Math.round(tdee),
      protein: Math.round(protein),
      carbs: Math.round(carbs),
      fat: Math.round(fat)
    };
  }, [profile]);

  return (
    <div className="space-y-12 pb-20">
      <div className="flex flex-col lg:flex-row justify-between items-start gap-8">
        <div className="space-y-4 max-w-xl w-full">
          <h2 className="text-5xl font-black tracking-tighter">Dieta Inteligente</h2>
          <p className="text-zinc-400">Escreva o que você comeu e nossa IA calculará os macros para você automaticamente.</p>
          
          <form onSubmit={handleAddMeal} className="relative group">
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: 200g de frango grelhado e 100g de arroz integral"
              className={cn(
                "w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 px-6 pr-14 text-lg focus:outline-none transition-all",
                "focus:ring-2 focus:ring-opacity-50",
                ringAccentClass
              )}
            />
            <button 
              type="submit" 
              disabled={isAnalyzing || !description}
              className={cn(
                "absolute right-2 top-2 p-3 text-black rounded-xl hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all shadow-lg",
                bgAccentClass, shadowAccentClass
              )}
            >
              {isAnalyzing ? <Loader2 size={24} className="animate-spin" /> : <Sparkles size={24} />}
            </button>
          </form>

          {/* Dica do Perfil */}
          {(!profile?.weight || !profile?.height || !profile?.age) && (
            <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex gap-3 items-center">
              <AlertTriangle className="text-orange-500 shrink-0" size={20} />
              <p className="text-xs text-orange-200">Dica: Complete seu perfil em <span className="font-bold underline cursor-pointer">Configurações</span> para gerarmos suas metas personalizadas.</p>
            </div>
          )}
        </div>

        {/* Dashboard de macros por data */}
        <div className="w-full lg:w-96 p-6 bg-zinc-900 rounded-3xl border border-zinc-800 space-y-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-lg text-black", bgAccentClass)}>
                <CalendarIcon size={20} />
              </div>
              <h3 className="font-bold text-xl">{isToday(parseISO(selectedDate)) ? 'Resumo Hoje' : 'Resumo Dia'}</h3>
            </div>
            
            {/* Navegação de Data */}
            <div className="flex items-center gap-2">
              <button 
                onClick={() => changeDate(-1)}
                className="p-2 bg-black/40 border border-zinc-800 rounded-xl hover:bg-zinc-800 transition-colors"
                title="Dia Anterior"
              >
                <ChevronLeft size={16} />
              </button>
              
              <div className="flex-1 flex items-center justify-between bg-black/40 border border-zinc-800 rounded-xl p-2 px-4 shadow-inner relative overflow-hidden group">
                <span className="text-xs font-black uppercase tracking-widest leading-none z-10">
                  {isToday(parseISO(selectedDate)) ? 'Hoje' : format(parseISO(selectedDate), "dd/MM")}
                </span>
                <input 
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full h-full opacity-0 absolute inset-0 cursor-pointer z-50"
                />
                <CalendarIcon size={14} className="text-zinc-500 pointer-events-none group-hover:text-white transition-colors" />
              </div>

              <button 
                onClick={() => changeDate(1)}
                className="p-2 bg-black/40 border border-zinc-800 rounded-xl hover:bg-zinc-800 transition-colors"
                title="Próximo Dia"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-black/40 rounded-2xl border border-zinc-800">
              <div className="flex justify-between items-end mb-2">
                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Calorias</p>
                <p className="text-xs font-bold text-zinc-400">{Math.round(totals.calories)} / {targets.calories} kcal</p>
              </div>
              <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((totals.calories / targets.calories) * 100, 100)}%` }}
                  className={cn("h-full", bgAccentClass)}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <MacroTarget label="Prot" current={totals.protein} target={targets.protein} color={bgAccentClass} />
              <MacroTarget label="Carb" current={totals.carbs} target={targets.carbs} color="bg-orange-400" />
              <MacroTarget label="Gord" current={totals.fat} target={targets.fat} color="bg-red-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Histórico Agrupado */}
      <div className="space-y-12">
        <div className="flex items-center gap-4">
          <div className="h-px bg-zinc-800 flex-1" />
          <h3 className="flex items-center gap-2 font-bold text-zinc-500 uppercase tracking-[0.2em] text-sm">
            <History size={16} />
            Linha do Tempo Nutricional
          </h3>
          <div className="h-px bg-zinc-800 flex-1" />
        </div>

        {groupedHistory.map(([date, meals]) => (
          <section key={date} className="space-y-6">
            <div className="flex items-center gap-3">
              <h4 className={cn("text-sm font-black uppercase tracking-widest px-4 py-2 rounded-full", bgSoftAccentClass, accentClass)}>
                {isToday(parseISO(date)) ? 'Hoje' : format(parseISO(date), "dd 'de' MMMM", { locale: ptBR })}
              </h4>
              <div className="h-px bg-zinc-800 flex-1" />
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-3 py-1 border border-zinc-800 rounded-lg">
                {Math.round(meals.reduce((sum, m) => sum + m.calories, 0))} KCAL
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {meals.map((meal) => (
                <MealCard 
                  key={meal.id} 
                  meal={meal} 
                  onDelete={() => setDeletingId(meal.id!)}
                  onEdit={() => setEditingMeal(meal)}
                  accentClass={accentClass}
                  bgAccentClass={bgAccentClass}
                  hoverBorderAccentClass={hoverBorderAccentClass}
                  isDeleting={deletingId === meal.id}
                  onCancelDelete={() => setDeletingId(null)}
                  onConfirmDelete={() => handleDeleteMeal(meal.id!)}
                  bgSoftAccentClass={bgSoftAccentClass}
                />
              ))}
            </div>
          </section>
        ))}

        {history.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center text-zinc-500">
            <Utensils size={64} className="mb-4 opacity-10" />
            <p className="font-bold tracking-widest uppercase text-xs">Comece a registrar suas refeições</p>
          </div>
        )}
      </div>

      {/* Modal de Edição */}
      <AnimatePresence>
        {editingMeal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-md w-full space-y-6 shadow-2xl"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black tracking-tighter">Editar Refeição</h3>
                <button onClick={() => setEditingMeal(null)} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleUpdateMeal} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-2">Descrição</label>
                  <textarea 
                    value={editingMeal.description}
                    onChange={e => setEditingMeal({...editingMeal, description: e.target.value})}
                    className="w-full bg-black/40 border border-zinc-800 rounded-2xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-lime-400/50 min-h-[100px]"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-2">Calorias (kcal)</label>
                    <input 
                      type="number"
                      value={editingMeal.calories}
                      onChange={e => setEditingMeal({...editingMeal, calories: Number(e.target.value)})}
                      className="w-full bg-black/40 border border-zinc-800 rounded-xl p-3 focus:outline-none font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-2">Proteína (g)</label>
                    <input 
                      type="number"
                      value={editingMeal.protein}
                      onChange={e => setEditingMeal({...editingMeal, protein: Number(e.target.value)})}
                      className="w-full bg-black/40 border border-zinc-800 rounded-xl p-3 focus:outline-none font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-2">Carbos (g)</label>
                    <input 
                      type="number"
                      value={editingMeal.carbs}
                      onChange={e => setEditingMeal({...editingMeal, carbs: Number(e.target.value)})}
                      className="w-full bg-black/40 border border-zinc-800 rounded-xl p-3 focus:outline-none font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-2">Gordura (g)</label>
                    <input 
                      type="number"
                      value={editingMeal.fat}
                      onChange={e => setEditingMeal({...editingMeal, fat: Number(e.target.value)})}
                      className="w-full bg-black/40 border border-zinc-800 rounded-xl p-3 focus:outline-none font-bold"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className={cn("w-full py-4 rounded-2xl font-black transition-all hover:scale-[1.02] active:scale-[0.98]", bgAccentClass, "text-black")}
                >
                  Salvar Alterações
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface MealCardProps {
  meal: Meal;
  onEdit: () => void;
  onDelete: () => void;
  accentClass: string;
  bgAccentClass: string;
  bgSoftAccentClass: string;
  hoverBorderAccentClass: string;
  isDeleting: boolean;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}

function MealCard({ 
  meal, 
  onEdit, 
  onDelete, 
  accentClass, 
  bgAccentClass, 
  bgSoftAccentClass,
  hoverBorderAccentClass,
  isDeleting,
  onCancelDelete,
  onConfirmDelete 
}: MealCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "group relative p-6 bg-zinc-900 border border-zinc-800 rounded-3xl transition-all duration-300", 
        hoverBorderAccentClass,
        isDeleting && "border-red-500/50"
      )}
    >
      <div className="flex justify-between items-start mb-4">
        <div className={cn("px-3 py-1 bg-black rounded-lg text-[10px] font-black uppercase tracking-widest", accentClass)}>
          {Math.round(meal.calories)} kcal
        </div>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={onEdit}
            className="p-1.5 hover:bg-white/5 rounded-lg text-zinc-500 hover:text-white transition-colors"
          >
            <Edit2 size={16} />
          </button>
          <button 
            onClick={onDelete}
            className="p-1.5 hover:bg-red-500/10 rounded-lg text-zinc-500 hover:text-red-400 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <p className="text-lg font-bold mb-6 leading-tight break-words">
        {meal.description}
      </p>

      {/* AI Comment & Advice */}
      {(meal.aiComment || meal.aiAdvice) && (
        <div className="mb-6 space-y-2">
          {meal.aiComment && (
            <div className={cn("p-3 rounded-xl border border-white/5 text-[10px] leading-relaxed flex gap-2 items-start", bgSoftAccentClass)}>
              <Info size={12} className={cn("shrink-0 mt-0.5", accentClass)} />
              <p className="text-zinc-300 italic">{meal.aiComment}</p>
            </div>
          )}
          {meal.aiAdvice && (
            <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/5 text-[10px] leading-relaxed flex gap-2 items-start">
              <AlertTriangle size={12} className="shrink-0 mt-0.5 text-red-500" />
              <p className="text-red-200/80 font-medium">{meal.aiAdvice}</p>
            </div>
          ) }
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <MacroBadge label="P" value={meal.protein} color={bgAccentClass} />
        <MacroBadge label="C" value={meal.carbs} color="bg-orange-400" />
        <MacroBadge label="G" value={meal.fat} color="bg-red-400" />
      </div>

      <AnimatePresence>
        {isDeleting && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/95 rounded-3xl flex flex-col items-center justify-center p-4 text-center z-10 border border-red-500/30"
          >
            <p className="text-sm font-bold mb-4 text-red-100">Excluir refeição?</p>
            <div className="flex gap-3 w-full">
              <button 
                onClick={onCancelDelete}
                className="flex-1 py-2 bg-zinc-800 rounded-xl text-xs font-bold hover:bg-zinc-700 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={onConfirmDelete}
                className="flex-1 py-2 bg-red-500 rounded-xl text-xs font-bold hover:bg-red-600 transition-colors text-white"
              >
                Confirmar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function MacroTarget({ label, current, target, color }: { label: string, current: number, target: number, color: string }) {
  const percent = Math.min((current / target) * 100, 100);
  return (
    <div className="bg-black/40 p-3 rounded-xl border border-zinc-800 flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">{label}</p>
        <p className="text-[10px] font-bold text-white">{Math.round(current)}g</p>
      </div>
      <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          className={cn("h-full", color)}
        />
      </div>
    </div>
  );
}

function MacroBadge({ label, value, color }: { label: string, value: number, color: string }) {
  return (
    <div className="bg-black/40 p-2 rounded-xl border border-zinc-800 flex flex-col items-center">
      <span className={clsx("w-2 h-2 rounded-full mb-1", color)} />
      <p className="text-[10px] font-bold text-zinc-500 uppercase">{label}</p>
      <p className="text-xs font-black">{Math.round(value)}g</p>
    </div>
  );
}
