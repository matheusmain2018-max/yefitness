import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Plus, History, Loader2, Calendar as CalendarIcon, Utensils } from 'lucide-react';
import { db } from '../services/firebase';
import { collection, addDoc, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { analyzeMeal } from '../services/gemini';
import { Meal, UserProfile } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { clsx } from 'clsx';
import { accentColors, bgAccents, shadowAccents, cn, ringAccents, hoverBorderAccents, hexAccents } from '../App';

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

  const [description, setDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [history, setHistory] = useState<Meal[]>([]);
  const [todayEntries, setTodayEntries] = useState<Meal[]>([]);

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
      
      const today = new Date().toISOString().split('T')[0];
      setTodayEntries(data.filter(m => m.date === today));
    });

    return unsubscribe;
  }, [user]);

  const handleAddMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setIsAnalyzing(true);
    try {
      const analysis = await analyzeMeal(description);
      const meal: Omit<Meal, 'id'> = {
        userId: user.uid,
        date: new Date().toISOString().split('T')[0],
        description,
        calories: analysis.calories,
        protein: analysis.protein,
        carbs: analysis.carbs,
        fat: analysis.fat,
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

  const totals = todayEntries.reduce((acc, curr) => ({
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

  return (
    <div className="space-y-12">
      <div className="flex flex-col lg:flex-row justify-between items-start gap-8">
        <div className="space-y-4 max-w-xl">
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
        </div>

        {/* Dashboard de Hoje */}
        <div className="w-full lg:w-96 p-6 bg-zinc-900 rounded-3xl border border-zinc-800 space-y-6">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg text-black", bgAccentClass)}>
              <CalendarIcon size={20} />
            </div>
            <h3 className="font-bold text-xl">Resumo Hoje</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-black/40 rounded-2xl border border-zinc-800">
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Calorias</p>
              <p className="text-2xl font-black">{Math.round(totals.calories)}<span className="text-xs text-zinc-500 ml-1">kcal</span></p>
            </div>
            <div className="p-4 bg-black/40 rounded-2xl border border-zinc-800">
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Proteína</p>
              <p className={cn("text-2xl font-black", accentClass)}>{Math.round(totals.protein)}<span className="text-xs text-zinc-500 ml-1">g</span></p>
            </div>
          </div>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Histórico */}
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-px bg-zinc-800 flex-1" />
          <h3 className="flex items-center gap-2 font-bold text-zinc-500 uppercase tracking-[0.2em] text-sm">
            <History size={16} />
            Histórico de Refeições
          </h3>
          <div className="h-px bg-zinc-800 flex-1" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {history.length === 0 ? (
            <div className="col-span-full py-12 flex flex-col items-center justify-center text-zinc-500">
              <Utensils size={48} className="mb-4 opacity-20" />
              <p>Nenhuma refeição registrada ainda.</p>
            </div>
          ) : (
            history.map((meal, index) => (
              <motion.div
                key={meal.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className={cn("p-6 bg-zinc-900 border border-zinc-800 rounded-3xl transition-colors", hoverBorderAccentClass)}
              >
                <div className="flex justify-between items-start mb-4">
                  <p className="text-xs font-bold text-zinc-500">
                    {format(new Date(meal.date), "dd 'de' MMMM", { locale: ptBR })}
                  </p>
                  <div className={cn("px-3 py-1 bg-black rounded-lg text-[10px] font-black uppercase tracking-widest", accentClass)}>
                    {Math.round(meal.calories)} kcal
                  </div>
                </div>
                <p className="text-lg font-bold mb-4 line-clamp-2">{meal.description}</p>
                <div className="grid grid-cols-3 gap-2">
                  <MacroBadge label="P" value={meal.protein} color={bgAccentClass} />
                  <MacroBadge label="C" value={meal.carbs} color="bg-orange-400" />
                  <MacroBadge label="G" value={meal.fat} color="bg-red-400" />
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function MacroBadge({ label, value, color }: { label: string, value: number, color: string }) {
  return (
    <div className="bg-black/40 p-2 rounded-xl border border-zinc-800 flex flex-col items-center">
      <span className={clsx("w-2 h-2 rounded-full mb-1", color)} />
      <p className="text-[10px] font-bold text-zinc-500 uppercase">{label}</p>
      <p className="text-sm font-black">{Math.round(value)}g</p>
    </div>
  );
}
