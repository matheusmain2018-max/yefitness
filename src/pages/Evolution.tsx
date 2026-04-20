import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Camera, Image as ImageIcon, History, Sparkles, Loader2, Plus, Ruler, ChevronRight, Trash2 } from 'lucide-react';
import { db } from '../services/firebase';
import { collection, addDoc, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { analyzeEvolution } from '../services/gemini';
import { EvolutionRecord, UserProfile } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn, accentColors, bgAccents, shadowAccents, borderAccents, borderSoftAccents } from '../App';
import { doc, deleteDoc } from 'firebase/firestore';

interface Props {
  profile: UserProfile | null;
  user: any;
}

export default function Evolution({ profile, user }: Props) {
  const themeKey = (profile?.theme || 'gym-neon') as keyof typeof accentColors;
  const accentClass = accentColors[themeKey];
  const bgAccentClass = bgAccents[themeKey];
  const shadowAccentClass = shadowAccents[themeKey];
  const borderAccentClass = borderAccents[themeKey];
  const borderSoftAccentClass = borderSoftAccents[themeKey];

  const [history, setHistory] = useState<EvolutionRecord[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<EvolutionRecord['photos']>({});
  const [measurements, setMeasurements] = useState<NonNullable<EvolutionRecord['measurements']>>({
    chest: 0, waist: 0, biceps: 0, thigh: 0
  });

  const measurementLabels: Record<string, string> = {
    chest: 'Peitoral',
    waist: 'Cintura',
    biceps: 'Bíceps',
    thigh: 'Coxa'
  };

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'evolution'),
      where('userId', '==', user.uid),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setHistory(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as EvolutionRecord)));
    });

    return unsubscribe;
  }, [user]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: keyof EvolutionRecord['photos']) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotos(prev => ({ ...prev, [type]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (Object.keys(photos).length === 0) return;
    
    setIsAnalyzing(true);
    try {
      const analysis = await analyzeEvolution(photos);
      const record: Omit<EvolutionRecord, 'id'> = {
        userId: user.uid,
        date: new Date().toISOString().split('T')[0],
        photos,
        measurements,
        aiAnalysis: analysis
      };
      await addDoc(collection(db, 'evolution'), record);
      setShowAdd(false);
      setPhotos({});
      setMeasurements({ chest: 0, waist: 0, biceps: 0, thigh: 0 });
    } catch (error) {
      console.error(error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'evolution', id));
      setDeletingId(null);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="space-y-12">
      <div className="flex justify-between items-end">
        <div className="space-y-4">
          <h2 className="text-5xl font-black tracking-tighter">Evolução</h2>
          <p className="text-zinc-400">Capture seu progresso e deixe a IA analisar os resultados.</p>
        </div>
        <button 
          onClick={() => setShowAdd(!showAdd)}
          className={cn(
            "flex items-center gap-2 py-3 px-6 rounded-2xl font-black transition-all",
            showAdd ? "bg-zinc-800 text-white" : cn(bgAccentClass, "text-black shadow-lg", shadowAccentClass)
          )}
        >
          {showAdd ? 'Cancelar' : <><Plus size={20} /> Nova Atualização</>}
        </button>
      </div>

      {showAdd && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 space-y-10"
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <PhotoUpload label="Frente" value={photos.front} onChange={(e) => handleFileUpload(e, 'front')} themeKey={themeKey} />
            <PhotoUpload label="Costas" value={photos.back} onChange={(e) => handleFileUpload(e, 'back')} themeKey={themeKey} />
            <PhotoUpload label="Lado" value={photos.side} onChange={(e) => handleFileUpload(e, 'side')} themeKey={themeKey} />
            <PhotoUpload label="Bíceps" value={photos.biceps} onChange={(e) => handleFileUpload(e, 'biceps')} themeKey={themeKey} />
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Ruler className={accentClass} size={20} />
              <h3 className="font-bold text-xl">Medidas Corporais (cm)</h3>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.keys(measurements).map((key) => (
                <div key={key} className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-2">
                    {measurementLabels[key] || key}
                  </label>
                  <input 
                    type="number" 
                    value={measurements[key as keyof typeof measurements] || ''}
                    onChange={e => setMeasurements({ ...measurements, [key]: Number(e.target.value) })}
                    className={cn("w-full bg-black border border-zinc-800 rounded-xl py-3 px-4 focus:outline-none", borderAccentClass)}
                  />
                </div>
              ))}
            </div>
          </div>

          <button 
            onClick={handleSave}
            disabled={isAnalyzing}
            className={cn(
              "w-full font-black py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all",
              bgAccentClass, "text-black", shadowAccentClass
            )}
          >
            {isAnalyzing ? (
              <><Loader2 className="animate-spin" size={20} /> Analisando com IA...</>
            ) : (
              <><Sparkles size={20} /> Salvar e Analisar Evolução</>
            )}
          </button>
        </motion.div>
      )}

      {history.length > 0 && (
        <div className="space-y-12">
          {history.map((record, index) => (
            <motion.div 
              key={record.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden"
            >
              <div className="p-8 border-b border-zinc-800 flex justify-between items-center bg-black/40">
                <div className="flex items-center gap-4">
                  <div className={cn("w-12 h-12 text-black rounded-2xl flex items-center justify-center", bgAccentClass)}>
                    <History size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black">{format(new Date(record.date), "dd 'de' MMMM", { locale: ptBR })}</h3>
                    <p className="text-zinc-500 text-sm font-mono uppercase">Registro #{history.length - index}</p>
                  </div>
                </div>
                
                {deletingId === record.id ? (
                  <div className="flex gap-2 animate-in fade-in slide-in-from-right-2">
                    <button 
                      onClick={() => handleDelete(record.id!)}
                      className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-700"
                    >Confirmar Exclusão</button>
                    <button 
                      onClick={() => setDeletingId(null)}
                      className="px-4 py-2 bg-zinc-800 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-zinc-700"
                    >Não</button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setDeletingId(record.id!)}
                    className="p-3 text-zinc-500 hover:text-red-500 transition-colors"
                    title="Excluir Registro"
                  >
                    <Trash2 size={24} />
                  </button>
                )}
              </div>

              <div className="p-8 space-y-8">
                <div className="grid grid-cols-4 gap-4">
                  {Object.entries(record.photos).map(([key, src]) => (
                    src && (
                      <div key={key} className="space-y-2">
                        <div className="aspect-[3/4] rounded-2xl overflow-hidden border border-zinc-800 group relative">
                          <img src={src} alt={key} className="w-full h-full object-cover transition-transform group-hover:scale-110" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white">{key}</span>
                          </div>
                        </div>
                      </div>
                    )
                  ))}
                </div>

                {record.aiAnalysis && (
                  <div className={cn("border p-6 rounded-3xl space-y-4 bg-black/5", borderSoftAccentClass)}>
                    <div className={cn("flex items-center gap-2 font-black", accentClass)}>
                      <Sparkles size={18} />
                      IA FEEDBACK
                    </div>
                    <p className="text-zinc-300 leading-relaxed italic">{record.aiAnalysis}</p>
                  </div>
                )}

                {record.measurements && (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {Object.entries(record.measurements).map(([key, val]) => (
                      <div key={key} className="bg-black/40 p-4 rounded-2xl border border-zinc-800">
                        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">
                          {measurementLabels[key] || key}
                        </p>
                        <p className="text-xl font-black">{val} <span className="text-xs text-zinc-600">cm</span></p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function PhotoUpload({ label, value, onChange, themeKey }: { label: string, value?: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, themeKey: keyof typeof accentColors }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const borderClass = borderAccents[themeKey].replace('focus:', '');

  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-2">{label}</label>
      <div 
        onClick={() => inputRef.current?.click()}
        className={cn(
          "aspect-[3/4] rounded-3xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden",
          value ? cn("bg-zinc-800 border-opacity-40", borderClass) : "border-zinc-800 hover:border-zinc-700 bg-black/40"
        )}
      >
        <input type="file" ref={inputRef} className="hidden" accept="image/*" onChange={onChange} />
        {value ? (
          <img src={value} alt={label} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-zinc-600">
            <Camera size={32} />
            <span className="text-xs font-bold">Enviar Foto</span>
          </div>
        )}
      </div>
    </div>
  );
}
