import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Moon, Sun, Clock, Sparkles, CheckCircle2,
  HeartPulse, Info, ChevronLeft, ChevronRight,
  Trash2, Loader2, ShieldAlert, Award, Zap
} from 'lucide-react';
import { db } from '../services/firebase';
import { doc, getDoc, setDoc, collection, query, getDocs, serverTimestamp } from 'firebase/firestore';
import { analyzeSleep } from '../services/gemini';
import { UserProfile, SleepLog } from '../types';
import { format, isToday, parseISO, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn, accentColors, bgAccents, bgSoftAccents } from '../App';

interface Props {
  profile: UserProfile | null;
  user: any;
}

function calculateSleepDuration(bedtime: string, waketime: string): { hours: number; minutes: number; totalHours: number; text: string } {
  if (!bedtime || !waketime) return { hours: 0, minutes: 0, totalHours: 0, text: '--' };
  const [bH, bM] = bedtime.split(':').map(Number);
  const [wH, wM] = waketime.split(':').map(Number);

  let bedMinutes = bH * 60 + bM;
  let wakeMinutes = wH * 60 + wM;

  if (wakeMinutes <= bedMinutes) {
    wakeMinutes += 24 * 60;
  }

  const diffMinutes = wakeMinutes - bedMinutes;
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  const totalHours = Number((diffMinutes / 60).toFixed(1));

  return {
    hours,
    minutes,
    totalHours,
    text: `${hours}h ${minutes > 0 ? `${minutes}m` : ''}`
  };
}

export default function Sleep({ profile, user }: Props) {
  const themeKey = (profile?.theme || 'gym-neon') as keyof typeof accentColors;
  const accentClass = accentColors[themeKey];
  const bgAccentClass = bgAccents[themeKey];
  const bgSoftAccentClass = bgSoftAccents[themeKey];

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [bedtime, setBedtime] = useState('23:00');
  const [waketime, setWaketime] = useState('07:00');
  const [quality, setQuality] = useState<'excellent' | 'good' | 'regular' | 'poor'>('good');
  const [notes, setNotes] = useState('');
  const [aiReport, setAiReport] = useState<SleepLog['aiReport']>(null);

  const [historyLogs, setHistoryLogs] = useState<SleepLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const duration = useMemo(() => calculateSleepDuration(bedtime, waketime), [bedtime, waketime]);

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const dayRef = doc(db, 'users', user.uid, 'sleep_logs', selectedDate);
        const docSnap = await getDoc(dayRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as SleepLog;
          setBedtime(data.bedtime || '23:00');
          setWaketime(data.waketime || '07:00');
          setQuality(data.quality || 'good');
          setNotes(data.notes || '');
          setAiReport(data.aiReport || null);
        } else {
          setBedtime('23:00');
          setWaketime('07:00');
          setQuality('good');
          setNotes('');
          setAiReport(null);
        }

        const logsQuery = query(
          collection(db, 'users', user.uid, 'sleep_logs')
        );
        const logsSnap = await getDocs(logsQuery);
        const logs = logsSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as SleepLog))
          .sort((a, b) => b.date.localeCompare(a.date));

        setHistoryLogs(logs.slice(0, 10));
      } catch (err: any) {
        console.error('Erro ao carregar dados de sono:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user, selectedDate]);

  const changeDate = (days: number) => {
    const current = parseISO(selectedDate);
    const updated = addDays(current, days);
    setSelectedDate(updated.toISOString().split('T')[0]);
  };

  const handleSave = async (reportToSave?: SleepLog['aiReport']) => {
    if (!user) return;
    setIsSaving(true);
    setError(null);
    setSuccessMsg(null);

    const updatedLog: SleepLog = {
      userId: user.uid,
      date: selectedDate,
      bedtime,
      waketime,
      quality,
      notes: notes.trim(),
      aiReport: reportToSave !== undefined ? reportToSave : aiReport,
      timestamp: serverTimestamp()
    };

    try {
      const dayRef = doc(db, 'users', user.uid, 'sleep_logs', selectedDate);
      await setDoc(dayRef, updatedLog);

      setHistoryLogs(prev => {
        const filtered = prev.filter(l => l.date !== selectedDate);
        const next = [updatedLog, ...filtered].sort((a, b) => b.date.localeCompare(a.date));
        return next.slice(0, 10);
      });

      setSuccessMsg('Registro de sono salvo com sucesso!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Erro ao salvar sono:', err);
      setError('Falha ao salvar registro de sono. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAnalyze = async () => {
    if (!user || isAnalyzing) return;
    setIsAnalyzing(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const report = await analyzeSleep({
        bedtime,
        waketime,
        date: selectedDate,
        quality,
        notes,
        profile
      });

      setAiReport(report);
      await handleSave(report);
    } catch (err: any) {
      console.error('Erro no relatório de sono:', err);
      setError(err.message || 'Erro ao gerar relatório. Verifique sua conexão e tente novamente.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRemoveLog = async (dateToDelete: string) => {
    if (!user) return;
    try {
      const dayRef = doc(db, 'users', user.uid, 'sleep_logs', dateToDelete);
      await setDoc(dayRef, { deleted: true }, { merge: true });
      setHistoryLogs(prev => prev.filter(l => l.date !== dateToDelete));
      if (dateToDelete === selectedDate) {
        setBedtime('23:00');
        setWaketime('07:00');
        setQuality('good');
        setNotes('');
        setAiReport(null);
      }
    } catch (err) {
      console.error('Erro ao remover registro:', err);
    }
  };

  const optimalSchedules = [
    {
      bed: '21:30',
      wake: '05:30',
      badge: 'Matinal Ideal',
      desc: 'Ótimo para quem treina cedo e quer acordar com mais disposição.'
    },
    {
      bed: '22:00',
      wake: '06:00',
      badge: 'Recomendado',
      desc: 'Equilíbrio ideal entre descanso profundo e energia para o dia.'
    },
    {
      bed: '22:30',
      wake: '06:30',
      badge: 'Alta Recuperação',
      desc: 'Sincronizado com o ciclo de sono noturno e controle de apetite.'
    },
    {
      bed: '23:00',
      wake: '07:00',
      badge: 'Limite Saudável',
      desc: 'Última janela recomendada para não afetar o ânimo do dia seguinte.'
    }
  ];

  return (
    <div className="space-y-8 pb-24">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className={cn("px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest text-black", bgAccentClass)}>
              Acompanhamento Diário
            </span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-black tracking-tight text-white">
            Seu Sono
          </h2>
          <p className="text-zinc-400 text-sm mt-1 max-w-xl">
            Registre seus horários de dormir e acordar e gere um relatório simples para melhorar seu descanso.
          </p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-3 self-stretch sm:self-auto">
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 p-2 rounded-2xl">
            <button
              type="button"
              onClick={() => changeDate(-1)}
              className="p-2 hover:bg-zinc-800 rounded-xl transition-colors text-zinc-400 hover:text-white"
              title="Dia anterior"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="relative overflow-hidden px-4 py-1 text-center min-w-[170px]">
              <span className="text-sm font-black uppercase tracking-wider whitespace-nowrap text-white">
                {isToday(parseISO(selectedDate)) ? 'Hoje, ' : ''}
                {format(parseISO(selectedDate), "dd 'de' MMM", { locale: ptBR })}
              </span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>
            <button
              type="button"
              onClick={() => changeDate(1)}
              className="p-2 hover:bg-zinc-800 rounded-xl transition-colors text-zinc-400 hover:text-white"
              title="Próximo dia"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-3">
          <ShieldAlert size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-center gap-3">
          <CheckCircle2 size={18} className="shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (7 cols) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-8">
          {/* Daily Sleep Log Form */}
          <div className="bg-zinc-900/80 border border-zinc-800 p-6 lg:p-8 rounded-3xl space-y-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
              <div className="flex items-center gap-3">
                <div className={cn("p-2.5 rounded-2xl text-black", bgAccentClass)}>
                  <Moon size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Horário de Sono do Dia</h3>
                  <p className="text-xs text-zinc-400">
                    Noite de {format(parseISO(selectedDate), "dd/MM/yyyy")}
                  </p>
                </div>
              </div>

              {/* Live duration Badge */}
              <div className="flex flex-col items-end">
                <span className="text-[11px] font-bold text-zinc-500 uppercase">Duração</span>
                <span className={cn(
                  "text-xl font-black font-mono",
                  duration.totalHours < 6 ? "text-red-400" :
                  duration.totalHours < 7 ? "text-amber-400" :
                  "text-emerald-400"
                )}>
                  {duration.text}
                </span>
              </div>
            </div>

            {/* Input Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                  <Moon size={14} className="text-zinc-400" />
                  Horário que dormiu
                </label>
                <input
                  type="time"
                  value={bedtime}
                  onChange={(e) => setBedtime(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 focus:border-zinc-500 px-4 py-3 rounded-2xl text-white font-black text-lg font-mono outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                  <Sun size={14} className="text-zinc-400" />
                  Horário que acordou
                </label>
                <input
                  type="time"
                  value={waketime}
                  onChange={(e) => setWaketime(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 focus:border-zinc-500 px-4 py-3 rounded-2xl text-white font-black text-lg font-mono outline-none transition-all"
                />
              </div>
            </div>

            {/* Quality selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-300 block">
                Como foi a noite?
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'excellent', label: '⭐⭐⭐⭐ Excelente' },
                  { id: 'good', label: '⭐⭐⭐ Boa' },
                  { id: 'regular', label: '⭐⭐ Regular' },
                  { id: 'poor', label: '⭐ Ruim / Picado' }
                ].map((item) => {
                  const isSelected = quality === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setQuality(item.id as any)}
                      className={cn(
                        "py-2.5 px-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                        isSelected
                          ? cn(bgAccentClass, "text-black border-transparent font-black shadow-lg")
                          : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
                      )}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300 block">
                Observação curta (opcional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Acordei à noite, usei celular até tarde..."
                className="w-full bg-zinc-950 border border-zinc-700 focus:border-zinc-500 px-4 py-2.5 rounded-2xl text-sm text-white placeholder-zinc-600 outline-none transition-all"
              />
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleSave()}
                disabled={isSaving || isAnalyzing}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-all border border-zinc-700 flex items-center justify-center gap-2"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
                Salvar
              </button>

              <button
                type="button"
                onClick={handleAnalyze}
                disabled={isAnalyzing || isSaving}
                className={cn(
                  "w-full sm:w-auto px-6 py-3 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2 shadow-lg",
                  isAnalyzing
                    ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                    : cn(bgAccentClass, "text-black hover:scale-[1.02] active:scale-[0.98]")
                )}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Gerando Relatório...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Gerar Relatório
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Report Section - Short and clean */}
          {aiReport ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-zinc-900/90 border border-zinc-800 p-6 rounded-3xl space-y-5 shadow-2xl relative"
            >
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
                <div className="flex items-center gap-3">
                  <div className={cn("p-2.5 rounded-2xl text-black", bgAccentClass)}>
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">Relatório do Sono</h3>
                    <p className="text-xs text-zinc-400">
                      {bedtime} → {waketime} ({duration.text})
                    </p>
                  </div>
                </div>

                {/* Score */}
                <div className="flex items-center gap-2 bg-zinc-950 px-3.5 py-1.5 rounded-2xl border border-zinc-800">
                  <Award className={cn(
                    "w-5 h-5",
                    aiReport.circadianScore >= 80 ? "text-emerald-400" :
                    aiReport.circadianScore >= 60 ? "text-amber-400" : "text-red-400"
                  )} />
                  <span className="text-base font-black text-white font-mono">
                    {aiReport.circadianScore}/100
                  </span>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
                <h4 className="text-xs font-black uppercase text-zinc-400 mb-1 flex items-center gap-1.5">
                  <Info size={14} className="text-blue-400" />
                  Como foi sua noite
                </h4>
                <p className="text-sm text-zinc-200 font-medium leading-snug">
                  {aiReport.summary}
                </p>
              </div>

              {/* Energy & Recovery */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-1">
                  <h4 className="text-xs font-black uppercase text-amber-400 flex items-center gap-1.5">
                    Energia & Disposição
                  </h4>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {aiReport.cortisolAnalysis}
                  </p>
                </div>

                <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-1">
                  <h4 className="text-xs font-black uppercase text-purple-400 flex items-center gap-1.5">
                    Recuperação Muscular
                  </h4>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {aiReport.hormoneImpact}
                  </p>
                </div>
              </div>

              {/* Recommendations */}
              {aiReport.recommendations && aiReport.recommendations.length > 0 && (
                <div className="space-y-2.5 pt-1">
                  <h4 className="text-xs font-black uppercase text-zinc-400 flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-400" />
                    Dicas Práticas
                  </h4>
                  <div className="space-y-2">
                    {aiReport.recommendations.map((rec, i) => (
                      <div key={i} className="flex items-center gap-3 bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                        <span className={cn("w-5 h-5 rounded-lg flex items-center justify-center shrink-0 font-black text-[11px] text-black", bgAccentClass)}>
                          {i + 1}
                        </span>
                        <p className="text-xs text-zinc-200 font-medium">
                          {rec}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ) : null}

          {/* History */}
          {historyLogs.length > 0 && (
            <div className="bg-zinc-900/60 border border-zinc-800/80 p-6 rounded-3xl space-y-4">
              <h4 className="text-sm font-black uppercase tracking-wider text-zinc-400">
                Histórico de Sono
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800 text-[11px] font-black uppercase text-zinc-500">
                      <th className="py-2 px-3">Data</th>
                      <th className="py-2 px-3">Dormiu</th>
                      <th className="py-2 px-3">Acordou</th>
                      <th className="py-2 px-3">Duração</th>
                      <th className="py-2 px-3">Qualidade</th>
                      <th className="py-2 px-3">Score</th>
                      <th className="py-2 px-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-xs text-zinc-300 font-medium">
                    {historyLogs.map((log) => {
                      const dur = calculateSleepDuration(log.bedtime, log.waketime);
                      const isCurr = log.date === selectedDate;
                      return (
                        <tr
                          key={log.date}
                          onClick={() => setSelectedDate(log.date)}
                          className={cn(
                            "cursor-pointer transition-colors hover:bg-zinc-800/40",
                            isCurr ? "bg-zinc-800/60 text-white font-bold" : ""
                          )}
                        >
                          <td className="py-2.5 px-3 font-mono">
                            {format(parseISO(log.date), "dd/MM")}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-zinc-400">
                            {log.bedtime}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-zinc-400">
                            {log.waketime}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={cn(
                              "font-mono font-bold",
                              dur.totalHours < 7 ? "text-amber-400" : "text-emerald-400"
                            )}>
                              {dur.text}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            {log.quality === 'excellent' && '⭐⭐⭐⭐ Excelente'}
                            {log.quality === 'good' && '⭐⭐⭐ Boa'}
                            {log.quality === 'regular' && '⭐⭐ Regular'}
                            {log.quality === 'poor' && '⭐ Ruim'}
                          </td>
                          <td className="py-2.5 px-3">
                            {log.aiReport?.circadianScore ? (
                              <span className={cn(
                                "px-2 py-0.5 rounded-lg font-black font-mono text-[11px]",
                                log.aiReport.circadianScore >= 80 ? "bg-emerald-500/10 text-emerald-400" :
                                log.aiReport.circadianScore >= 60 ? "bg-amber-500/10 text-amber-400" :
                                "bg-red-500/10 text-red-400"
                              )}>
                                {log.aiReport.circadianScore}
                              </span>
                            ) : (
                              <span className="text-zinc-600">--</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => handleRemoveLog(log.date)}
                              className="p-1 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                              title="Remover"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right Column (5 cols): Simple Correct Schedules List & Brief Tips */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6">
          {/* Optimal Sleep & Wake Schedules Card */}
          <div className="bg-zinc-900/90 border border-zinc-800 p-6 rounded-3xl space-y-5 shadow-xl">
            <div className="flex items-center gap-3 border-b border-zinc-800/80 pb-4">
              <div className={cn("p-2.5 rounded-2xl text-black", bgAccentClass)}>
                <Clock size={20} />
              </div>
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-wide">
                  Horários Recomendados
                </h3>
                <p className="text-xs text-zinc-400">
                  Melhores horários para dormir e acordar
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {optimalSchedules.map((sched, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition-all space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black font-mono text-white">
                        {sched.bed}
                      </span>
                      <span className="text-zinc-500 text-xs">→</span>
                      <span className="text-base font-black font-mono text-emerald-400">
                        {sched.wake}
                      </span>
                    </div>
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider",
                      idx === 0 ? "bg-purple-500/10 text-purple-400" :
                      idx === 1 ? "bg-emerald-500/10 text-emerald-400" :
                      idx === 2 ? "bg-blue-500/10 text-blue-400" :
                      "bg-amber-500/10 text-amber-400"
                    )}>
                      {sched.badge}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 font-medium">
                    {sched.desc}
                  </p>
                </div>
              ))}
            </div>

            <div className="bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800">
              <span className="text-[11px] font-bold text-zinc-300 block mb-0.5">
                💡 Dica de rotina
              </span>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Manter o mesmo horário de dormir todos os dias ajuda seu corpo a acordar com mais energia e facilidade.
              </p>
            </div>
          </div>

          {/* Simple Sleep Hygiene List */}
          <div className="bg-zinc-900/90 border border-zinc-800 p-6 rounded-3xl space-y-4 shadow-xl">
            <h3 className="text-sm font-black uppercase tracking-wide text-white flex items-center gap-2">
              <Zap size={16} className="text-yellow-400" />
              Bons Hábitos Antes de Dormir
            </h3>

            <ul className="space-y-2.5 text-xs text-zinc-300">
              <li className="flex items-center gap-2.5 bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                <span className={cn("w-2 h-2 rounded-full shrink-0", bgAccentClass)} />
                <span>Reduzir uso de celular ou TV 1 hora antes.</span>
              </li>
              <li className="flex items-center gap-2.5 bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                <span className={cn("w-2 h-2 rounded-full shrink-0", bgAccentClass)} />
                <span>Deixar o quarto o mais escuro possível.</span>
              </li>
              <li className="flex items-center gap-2.5 bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                <span className={cn("w-2 h-2 rounded-full shrink-0", bgAccentClass)} />
                <span>Manter o ambiente fresco e ventilado.</span>
              </li>
              <li className="flex items-center gap-2.5 bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                <span className={cn("w-2 h-2 rounded-full shrink-0", bgAccentClass)} />
                <span>Jantar pelo menos 2 a 3 horas antes de deitar.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
