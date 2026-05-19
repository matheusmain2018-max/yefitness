import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Utensils, Dumbbell, Pill, Timer, Sparkles, Loader2, CheckCircle2, XCircle, Info } from 'lucide-react';
import { db } from '../services/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { generateDailyReport } from '../services/gemini';
import { Meal, Workout, Supplement, Cardio, UserProfile } from '../types';
import { format, isToday, parseISO, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn, accentColors, bgAccents, ringAccents, bgSoftAccents } from '../App';
import ReactMarkdown from 'react-markdown';

interface Props {
  profile: UserProfile | null;
  user: any;
}

export default function Diary({ profile, user }: Props) {
  const themeKey = (profile?.theme || 'gym-neon') as keyof typeof accentColors;
  const accentClass = accentColors[themeKey];
  const bgAccentClass = bgAccents[themeKey];
  const ringAccentClass = ringAccents[themeKey];
  const bgSoftAccentClass = bgSoftAccents[themeKey];

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [cardios, setCardios] = useState<Cardio[]>([]);
  const [report, setReport] = useState<any | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    return {
      calories: Math.round(tdee),
      protein: Math.round(profile.weight * 2),
      carbs: Math.round((tdee - (profile.weight * 2 * 4) - (profile.weight * 0.8 * 9)) / 4),
      fat: Math.round(profile.weight * 0.8)
    };
  }, [profile]);

  useEffect(() => {
    if (!user) return;

    const unsubscribes = [
      onSnapshot(query(collection(db, 'meals'), where('userId', '==', user.uid), where('date', '==', selectedDate)), (snap) => {
        setMeals(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Meal)));
      }),
      onSnapshot(query(collection(db, 'workouts'), where('userId', '==', user.uid), where('date', '==', selectedDate)), (snap) => {
        setWorkouts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Workout)));
      }),
      onSnapshot(query(collection(db, 'supplements'), where('userId', '==', user.uid)), (snap) => {
        setSupplements(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Supplement)));
      }),
      onSnapshot(query(collection(db, 'cardios'), where('userId', '==', user.uid)), (snap) => {
        setCardios(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cardio)));
      })
    ];

    setReport(null);

    return () => unsubscribes.forEach(unsub => unsub());
  }, [user, selectedDate]);

  const dailyTotals = useMemo(() => {
    return meals.reduce((acc, curr) => ({
      calories: acc.calories + curr.calories,
      protein: acc.protein + curr.protein,
      carbs: acc.carbs + curr.carbs,
      fat: acc.fat + curr.fat
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  }, [meals]);

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const data = await generateDailyReport({
        profile,
        meals,
        workouts,
        supplements,
        cardios,
        date: selectedDate,
        targets
      });
      setReport(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao gerar relatório. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  const changeDate = (days: number) => {
    const current = parseISO(selectedDate);
    const updated = addDays(current, days);
    setSelectedDate(updated.toISOString().split('T')[0]);
  };

  return (
    <div className="space-y-12 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start gap-8">
        <div className="space-y-4 max-w-xl w-full">
          <h2 className="text-5xl font-black tracking-tighter">Diário de Bordo</h2>
          <p className="text-zinc-400">Visão consolidada de toda a sua jornada diária: dieta, treino e hábitos.</p>
          
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 p-2 rounded-2xl">
                <button onClick={() => changeDate(-1)} className="p-2 hover:bg-zinc-800 rounded-xl transition-colors">
                  <ChevronLeft size={20} />
                </button>
                <div className="relative overflow-hidden px-4 py-1">
                  <span className="text-sm font-black uppercase tracking-widest whitespace-nowrap">
                    {isToday(parseISO(selectedDate)) ? 'Hoje, ' : ''}
                    {format(parseISO(selectedDate), "dd 'de' MMMM", { locale: ptBR })}
                  </span>
                  <input 
                    type="date" 
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
                <button onClick={() => changeDate(1)} className="p-2 hover:bg-zinc-800 rounded-xl transition-colors">
                  <ChevronRight size={20} />
                </button>
             </div>
             <div className={cn("p-4 rounded-2xl font-black text-xs uppercase tracking-tighter shadow-lg", bgAccentClass, "text-black")}>
                {meals.length + workouts.length + supplements.filter(s => s.checks[selectedDate]).length} Atividades
             </div>
          </div>
        </div>

        <button 
          onClick={handleGenerateReport}
          disabled={isGenerating}
          className={cn(
            "w-full md:w-auto px-8 py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all hover:scale-105 active:scale-95 disabled:opacity-50",
            bgAccentClass, "text-black shadow-xl"
          )}
        >
          {isGenerating ? <Loader2 className="animate-spin" /> : <Sparkles />}
          Gerar Relatório IA
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex gap-3 items-center text-red-400 text-sm mb-8">
           <XCircle size={20} />
           <p>{error}</p>
        </div>
      )}

      {report && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "p-8 rounded-[2.5rem] border border-opacity-20 shadow-2xl space-y-8", 
            bgSoftAccentClass, 
            report.status === 'success' ? "border-green-500/30" : 
            report.status === 'warning' ? "border-yellow-500/30" : "border-red-500/30"
          )}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className={accentClass} size={20} />
                <h3 className="text-sm font-black uppercase tracking-[0.2em] opacity-60 text-white">Análise do YeeBot</h3>
              </div>
              <h4 className="text-2xl font-black tracking-tight">{report.quickSummary}</h4>
            </div>
            
            <div className="flex gap-4">
              <ScoreCard label="Dieta" score={report.scores.diet} accent={accentClass} />
              <ScoreCard label="Treino" score={report.scores.training} accent="text-orange-400" />
              <ScoreCard label="Hábitos" score={report.scores.habits} accent="text-purple-400" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div className="prose prose-invert max-w-none prose-p:text-zinc-300 prose-strong:text-white prose-p:leading-relaxed bg-black/40 p-6 rounded-3xl border border-white/5">
              <ReactMarkdown>{report.analysis}</ReactMarkdown>
            </div>
            
            <div className="space-y-6">
              <div className="p-6 bg-white/5 rounded-3xl border border-white/5 space-y-4">
                <div className="flex items-center gap-3">
                  <Info className={accentClass} size={18} />
                  <h4 className="font-bold text-sm uppercase tracking-widest leading-none">Dica para Amanhã</h4>
                </div>
                <p className="text-zinc-300 text-sm leading-relaxed">{report.advice}</p>
              </div>

              {/* Gráfico de Erro (Visualização Simplificada de Macros vs Targets) */}
              <div className="p-6 bg-black/60 rounded-3xl border border-white/5 space-y-4">
                 <h4 className="text-[10px] font-black uppercase tracking-widest opacity-50">Equilíbrio Nutricional</h4>
                 <div className="space-y-3">
                    <SimpleProgress label="Calorias" current={dailyTotals.calories} target={targets.calories} />
                    <SimpleProgress label="Proteínas" current={dailyTotals.protein} target={targets.protein} />
                    <SimpleProgress label="Carbos" current={dailyTotals.carbs} target={targets.carbs} />
                 </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Coluna 1: Nutrição */}
        <section className="bg-zinc-900/50 p-8 rounded-[2.5rem] border border-zinc-800 space-y-8">
          <div className="flex items-center gap-3">
            <Utensils className={accentClass} size={24} />
            <h3 className="text-xl font-black uppercase tracking-tight">Nutrição</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-black/40 p-4 rounded-2xl border border-zinc-800">
               <p className="text-[10px] font-bold text-zinc-500 uppercase mb-1">Calorias</p>
               <p className="text-2xl font-black">{Math.round(dailyTotals.calories)} <small className="text-[10px] text-zinc-500">kcal</small></p>
            </div>
            <div className="bg-black/40 p-4 rounded-2xl border border-zinc-800">
               <p className="text-[10px] font-bold text-zinc-500 uppercase mb-1">Proteína</p>
               <p className="text-2xl font-black text-lime-400">{Math.round(dailyTotals.protein)}g</p>
            </div>
          </div>

          <div className="space-y-3">
            {meals.map(meal => (
              <div key={meal.id} className="flex justify-between items-center p-4 bg-black/20 rounded-xl border border-white/5">
                <span className="text-sm font-medium">{meal.description}</span>
                <span className="text-xs font-bold text-zinc-500">{meal.calories} kcal</span>
              </div>
            ))}
            {meals.length === 0 && <p className="text-center text-zinc-600 text-xs py-4 italic">Nenhuma refeição registrada.</p>}
          </div>
        </section>

        {/* Coluna 2: Atividade & Hábitos */}
        <div className="space-y-8">
          <section className="bg-zinc-900/50 p-8 rounded-[2.5rem] border border-zinc-800 space-y-6">
            <div className="flex items-center gap-3">
              <Dumbbell className={accentClass} size={24} />
              <h3 className="text-xl font-black uppercase tracking-tight">Treinos</h3>
            </div>
            <div className="space-y-3">
              {workouts.map(w => (
                <div key={w.id} className="p-4 bg-black/20 rounded-xl border border-white/5 flex gap-4">
                   <div className={cn("p-2 rounded-lg text-black", bgAccentClass)}>
                      <Dumbbell size={16} />
                   </div>
                   <div>
                      <p className="text-sm font-bold capitalize">Treino {w.type === 'gym' ? 'na Academia' : 'em Casa'}</p>
                      <p className="text-[10px] text-zinc-500">{w.exercises.length} exercícios realizados</p>
                   </div>
                </div>
              ))}
              {workouts.length === 0 && <p className="text-center text-zinc-600 text-xs py-4 italic">Nenhum treino hoje.</p>}
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <section className="bg-zinc-900/50 p-6 rounded-[2.5rem] border border-zinc-800 space-y-4">
                <div className="flex items-center gap-2">
                   <Pill className="text-purple-400" size={20} />
                   <h4 className="text-sm font-black uppercase">Suplementos</h4>
                </div>
                <div className="space-y-2">
                   {supplements.map(s => (
                     <div key={s.id} className="flex items-center justify-between gap-2">
                        <span className="text-xs text-zinc-300 truncate">{s.name}</span>
                        {s.checks[selectedDate] ? (
                          <CheckCircle2 size={16} className="text-green-500" />
                        ) : (
                          <XCircle size={16} className="text-zinc-700" />
                        )}
                     </div>
                   ))}
                </div>
             </section>

             <section className="bg-zinc-900/50 p-6 rounded-[2.5rem] border border-zinc-800 space-y-4">
                <div className="flex items-center gap-2">
                   <Timer className="text-blue-400" size={20} />
                   <h4 className="text-sm font-black uppercase">Cardio</h4>
                </div>
                <div className="space-y-2">
                   {cardios.map(c => (
                     <div key={c.id} className="flex items-center justify-between gap-2">
                        <span className="text-xs text-zinc-300 truncate">{c.name}</span>
                        {c.checks[selectedDate] ? (
                          <CheckCircle2 size={16} className="text-green-500" />
                        ) : (
                          <XCircle size={16} className="text-zinc-700" />
                        )}
                     </div>
                   ))}
                </div>
             </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScoreCard({ label, score, accent }: { label: string, score: number, accent: string }) {
  return (
    <div className="flex flex-col items-center gap-1 min-w-[70px]">
      <div className="relative w-14 h-14">
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="28" cy="28" r="24" className="stroke-white/5 fill-none" strokeWidth="4" />
          <motion.circle 
            cx="28" cy="28" r="24" 
            className={cn("fill-none stroke-current", accent)} 
            strokeWidth="4" 
            strokeDasharray="150.79" 
            initial={{ strokeDashoffset: 150.79 }}
            animate={{ strokeDashoffset: 150.79 - (score / 100) * 150.79 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] font-black">{score}%</span>
        </div>
      </div>
      <span className="text-[9px] font-black uppercase tracking-widest opacity-50">{label}</span>
    </div>
  );
}

function SimpleProgress({ label, current, target }: { label: string, current: number, target: number }) {
  const percent = Math.min((current/target) * 100, 100);
  const diff = current - target;
  const isOk = Math.abs(diff) < (target * 0.1); // 10% margin
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] items-center">
        <span className="text-zinc-500 font-bold uppercase">{label}</span>
        <span className={cn("font-black", diff > target * 0.1 ? "text-red-400" : isOk ? "text-green-400" : "text-yellow-400")}>
          {Math.round(percent)}%
        </span>
      </div>
      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          className={cn("h-full", diff > target * 0.1 ? "bg-red-400" : isOk ? "bg-green-400" : "bg-yellow-400")}
        />
      </div>
    </div>
  );
}
