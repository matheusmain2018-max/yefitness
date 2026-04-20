import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Plus, Pill, CheckCircle2, Circle, Clock, Trash2 } from 'lucide-react';
import { db } from '../services/firebase';
import { collection, addDoc, query, where, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Supplement, UserProfile } from '../types';
import { format } from 'date-fns';
import { cn, accentColors, bgAccents, shadowAccents, borderAccents, hoverBorderAccents, bgSoftAccents, borderSoftAccents } from '../App';

interface Props {
  profile: UserProfile | null;
  user: any;
}

export default function Supplements({ profile, user }: Props) {
  const themeKey = (profile?.theme || 'gym-neon') as keyof typeof accentColors;
  const accentClass = accentColors[themeKey];
  const bgAccentClass = bgAccents[themeKey];
  const shadowAccentClass = shadowAccents[themeKey];
  const borderAccentClass = borderAccents[themeKey];
  const hoverBorderAccentClass = hoverBorderAccents[themeKey];
  const bgSoftAccentClass = bgSoftAccents[themeKey];
  const borderSoftAccentClass = borderSoftAccents[themeKey];

  const [items, setItems] = useState<Supplement[]>([]);
  const [name, setName] = useState('');
  const [time, setTime] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'supplements'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snap) => {
      setItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Supplement)));
    });
    return unsubscribe;
  }, [user]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !time) return;
    const item: Omit<Supplement, 'id'> = {
      userId: user.uid,
      name,
      time,
      checks: {}
    };
    await addDoc(collection(db, 'supplements'), item);
    setName('');
    setTime('');
    setShowAdd(false);
  };

  const toggleCheck = async (item: Supplement) => {
    const itemRef = doc(db, 'supplements', item.id!);
    const newChecks = { ...item.checks, [today]: !item.checks[today] };
    await updateDoc(itemRef, { checks: newChecks });
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'supplements', id));
      setDeletingId(null);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="space-y-12">
      <div className="flex justify-between items-end">
        <div className="space-y-4">
          <h2 className="text-5xl font-black tracking-tighter">Suplementos</h2>
          <p className="text-zinc-400">Gerencie sua rotina diária de suplementação.</p>
        </div>
        <button 
          onClick={() => setShowAdd(!showAdd)}
          className={cn(
            "flex items-center gap-2 py-3 px-6 rounded-2xl font-black transition-all",
            showAdd ? "bg-zinc-800 text-white" : cn(bgAccentClass, "text-black shadow-lg", shadowAccentClass)
          )}
        >
          {showAdd ? 'Cancelar' : <><Plus size={20} /> Novo</>}
        </button>
      </div>

      {showAdd && (
        <motion.form 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          onSubmit={handleAdd}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-zinc-900 p-6 rounded-3xl border border-zinc-800"
        >
          <input 
            type="text" 
            placeholder="Nome (Ex: Creatina)" 
            value={name}
            onChange={e => setName(e.target.value)}
            className={cn("w-full bg-black border border-zinc-800 rounded-xl py-3 px-4 focus:outline-none", borderAccentClass)}
          />
          <input 
            type="time" 
            value={time}
            onChange={e => setTime(e.target.value)}
            className={cn("w-full bg-black border border-zinc-800 rounded-xl py-3 px-4 focus:outline-none", borderAccentClass)}
          />
          <button className="bg-white text-black font-black rounded-xl hover:bg-zinc-200">Salvar Suplemento</button>
        </motion.form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item) => (
          <motion.div
            key={item.id}
            layout
            className={cn(
              "p-6 rounded-[2rem] border transition-all flex flex-col justify-between h-48",
              item.checks[today] 
                ? cn(bgSoftAccentClass, borderSoftAccentClass) 
                : cn("bg-zinc-900 border-zinc-800", hoverBorderAccentClass)
            )}
          >
            <div className="flex justify-between items-start">
              <div className="p-3 bg-black rounded-2xl">
                <Pill className={item.checks[today] ? cn(accentClass) : "text-zinc-500"} />
              </div>
              
              {deletingId === item.id ? (
                <div className="flex gap-2 animate-in fade-in slide-in-from-right-1">
                  <button 
                    onClick={() => handleDelete(item.id!)}
                    className="text-[10px] font-black uppercase text-red-500 hover:text-red-400"
                  >Confirmar</button>
                  <button 
                    onClick={() => setDeletingId(null)}
                    className="text-[10px] font-black uppercase text-zinc-500 hover:text-zinc-400"
                  >Não</button>
                </div>
              ) : (
                <button 
                  onClick={() => setDeletingId(item.id!)}
                  className="text-zinc-700 hover:text-red-400 transition-colors"
                  title="Excluir"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>

            <div className="space-y-1">
              <h4 className="text-xl font-bold">{item.name}</h4>
              <div className="flex items-center gap-2 text-zinc-500 text-sm">
                <Clock size={14} />
                <span>{item.time}</span>
              </div>
            </div>

            <button
              onClick={() => toggleCheck(item)}
              className={cn(
                "w-full mt-4 py-3 rounded-xl flex items-center justify-center gap-2 font-black transition-all",
                item.checks[today]
                  ? cn(bgAccentClass, "text-black")
                  : "bg-black text-white hover:bg-zinc-800"
              )}
            >
              {item.checks[today] ? <><CheckCircle2 size={20} /> Tomado!</> : <><Circle size={20} /> Marcar como Tomado</>}
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
