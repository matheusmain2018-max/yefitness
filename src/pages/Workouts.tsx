import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Plus, Dumbbell, History, Search, Target, ChevronRight, Edit2, Trash2, Save, X } from 'lucide-react';
import { db } from '../services/firebase';
import { collection, addDoc, query, where, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Workout, ExerciseEntry, UserProfile } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn, accentColors, bgAccents, shadowAccents, borderAccents, bgSoftAccents, hoverBorderAccents } from '../App';

interface Props {
  profile: UserProfile | null;
  user: any;
}

export default function Workouts({ profile, user }: Props) {
  const themeKey = (profile?.theme || 'gym-neon') as keyof typeof accentColors;
  const accentClass = accentColors[themeKey];
  const bgAccentClass = bgAccents[themeKey];
  const shadowAccentClass = shadowAccents[themeKey];
  const borderAccentClass = borderAccents[themeKey];
  const bgSoftAccentClass = bgSoftAccents[themeKey];
  const hoverBorderAccentClass = hoverBorderAccents[themeKey];

  const [exercises, setExercises] = useState<ExerciseEntry[]>([]);
  const [currentEx, setCurrentEx] = useState<ExerciseEntry>({ name: '', weight: 0, sets: 0, reps: 0 });
  const [workoutType, setWorkoutType] = useState<'gym' | 'home'>('gym');
  const [history, setHistory] = useState<Workout[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'workouts'),
      where('userId', '==', user.uid),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setHistory(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Workout)));
    });

    return unsubscribe;
  }, [user]);

  const addExercise = () => {
    if (!currentEx.name) return;
    setExercises([...exercises, currentEx]);
    setCurrentEx({ name: '', weight: 0, sets: 0, reps: 0 });
  };

  const removeExercise = (idx: number) => {
    setExercises(exercises.filter((_, i) => i !== idx));
  };

  const handleSaveWorkout = async () => {
    if (exercises.length === 0) return;
    
    if (editingId) {
      const workoutRef = doc(db, 'workouts', editingId);
      await updateDoc(workoutRef, {
        exercises,
        type: workoutType
      });
      setEditingId(null);
    } else {
      const workout: Omit<Workout, 'id'> = {
        userId: user.uid,
        date: new Date().toISOString().split('T')[0],
        exercises,
        type: workoutType
      };
      await addDoc(collection(db, 'workouts'), workout);
    }
    
    setExercises([]);
    setShowAdd(false);
  };

  const handleEdit = (workout: Workout) => {
    setEditingId(workout.id!);
    setExercises(workout.exercises);
    setWorkoutType(workout.type);
    setShowAdd(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'workouts', id));
      setDeletingId(null);
    } catch (error) {
      console.error('Erro ao excluir treino:', error);
      alert('Erro ao excluir treino. Tente novamente.');
    }
  };

  return (
    <div className="space-y-12">
      <div className="flex justify-between items-end">
        <div className="space-y-4">
          <h2 className="text-5xl font-black tracking-tighter">Treinos</h2>
          <p className="text-zinc-400">Registre sua evolução de carga e densidade de treino.</p>
        </div>
        <button 
          onClick={() => {
            setShowAdd(!showAdd);
            if (showAdd) {
              setEditingId(null);
              setExercises([]);
            }
          }}
          className={cn(
            "flex items-center gap-2 py-3 px-6 rounded-2xl font-black transition-all shadow-lg",
            showAdd ? "bg-zinc-800 text-white" : cn(bgAccentClass, "text-black", shadowAccentClass)
          )}
        >
          {showAdd ? 'Cancelar' : <><Plus size={20} /> Novo Treino</>}
        </button>
      </div>

      {showAdd && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 space-y-8"
        >
          <div className="flex justify-between items-center">
            <div className="flex flex-wrap gap-4">
              <button 
                onClick={() => setWorkoutType('gym')}
                className={cn("px-6 py-2 rounded-xl font-bold transition-all", workoutType === 'gym' ? cn(bgAccentClass, "text-black") : 'bg-black text-zinc-500')}
              >Academia</button>
              <button 
                onClick={() => setWorkoutType('home')}
                className={cn("px-6 py-2 rounded-xl font-bold transition-all", workoutType === 'home' ? cn(bgAccentClass, "text-black") : 'bg-black text-zinc-500')}
              >Em Casa</button>
            </div>
            {editingId && (
              <span className={cn("text-xs font-black px-4 py-2 rounded-full uppercase tracking-widest", bgAccentClass + "/10", accentClass)}>
                Editando Treino
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-black/40 p-6 rounded-3xl border border-zinc-800">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-2">Exercício</label>
              <input 
                type="text" 
                value={currentEx.name}
                onChange={e => setCurrentEx({...currentEx, name: e.target.value})}
                placeholder="Ex: Supino Com Halter"
                className={cn("w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 px-4 focus:outline-none", borderAccentClass)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-2">Carga (kg)</label>
              <input 
                type="number" 
                value={currentEx.weight || ''}
                onChange={e => setCurrentEx({...currentEx, weight: Number(e.target.value)})}
                className={cn("w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 px-4 focus:outline-none", borderAccentClass)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-2">Séries</label>
                <input 
                  type="number" 
                  value={currentEx.sets || ''}
                  onChange={e => setCurrentEx({...currentEx, sets: Number(e.target.value)})}
                  className={cn("w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 px-4 focus:outline-none", borderAccentClass)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-2">Reps</label>
                <input 
                  type="number" 
                  value={currentEx.reps || ''}
                  onChange={e => setCurrentEx({...currentEx, reps: Number(e.target.value)})}
                  className={cn("w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 px-4 focus:outline-none", borderAccentClass)}
                />
              </div>
            </div>
            <button 
              onClick={addExercise}
              className="bg-white text-black font-black py-3 rounded-xl hover:scale-105 active:scale-95 transition-all"
            >Adicionar</button>
          </div>

          <div className="space-y-4">
            {exercises.map((ex, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-zinc-800">
                <div className="flex items-center gap-4">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", bgSoftAccentClass, accentClass)}>
                    <Target size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold">{ex.name}</h4>
                    <p className="text-zinc-500 text-xs">{ex.sets} séries x {ex.reps} reps • {ex.weight}kg</p>
                  </div>
                </div>
                <button onClick={() => removeExercise(i)} className="text-zinc-500 hover:text-red-400 transition-colors">Remover</button>
              </div>
            ))}
          </div>

          {exercises.length > 0 && (
            <button 
              onClick={handleSaveWorkout}
              className={cn(
                "w-full font-black py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2 hover:scale-[1.01] transition-all",
                bgAccentClass, "text-black", shadowAccentClass
              )}
            >
              <Save size={20} />
              {editingId ? 'Salvar Alterações' : 'Finalizar e Salvar Treino'}
            </button>
          )}
        </motion.div>
      )}

      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <History size={20} className="text-zinc-500" />
          <h3 className="font-bold text-lg uppercase tracking-widest text-zinc-500">Histórico de Atividades</h3>
          <div className="h-px bg-zinc-800 flex-1" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {history.map((workout, index) => (
            <motion.div
              key={workout.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "group p-8 bg-zinc-900 border border-zinc-800 rounded-[2.5rem] transition-all relative overflow-hidden",
                hoverBorderAccentClass
              )}
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-sm font-bold text-zinc-500">
                    {format(new Date(workout.date), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                  </p>
                  <p className={cn("text-xs font-black uppercase tracking-widest mt-1", accentClass)}>
                    Treino de {workout.type === 'gym' ? 'Academia' : 'Casa'}
                  </p>
                </div>
                <div className="flex gap-2 lg:opacity-0 group-hover:opacity-100 transition-opacity z-50">
                  {deletingId === workout.id ? (
                    <div className="flex gap-2 animate-in fade-in slide-in-from-right-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(workout.id!);
                        }}
                        className="px-3 py-1 bg-red-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-red-700"
                      >
                        Confirmar
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingId(null);
                        }}
                        className="px-3 py-1 bg-zinc-800 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-zinc-700"
                      >
                        Não
                      </button>
                    </div>
                  ) : (
                    <>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(workout);
                        }}
                        className={cn("p-2 bg-zinc-800 rounded-lg transition-colors flex items-center justify-center hover:text-black", "hover:"+bgAccentClass)}
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (workout.id) {
                            setDeletingId(workout.id);
                          }
                        }}
                        className="p-2 bg-zinc-800 hover:bg-red-500 text-white rounded-lg transition-colors flex items-center justify-center"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {workout.exercises.map((ex, i) => (
                  <div key={i} className="flex justify-between items-center text-sm py-2 border-b border-zinc-800/50 last:border-0">
                    <span className="font-bold">{ex.name}</span>
                    <span className="text-zinc-500 font-mono tracking-tighter">{ex.sets}x{ex.reps} @ {ex.weight}kg</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
