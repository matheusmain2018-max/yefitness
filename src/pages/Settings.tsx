import React, { useState } from 'react';
import { motion } from 'motion/react';
import { User, Palette, Weight, Ruler, AlertCircle, Save } from 'lucide-react';
import { db } from '../services/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { UserProfile } from '../types';
import { cn, accentColors, bgAccents, shadowAccents, ringAccents, borderAccents } from '../App';

interface Props {
  profile: UserProfile | null;
  user: any;
}

export default function Settings({ profile, user }: Props) {
  const themeKey = (profile?.theme || 'gym-neon') as keyof typeof accentColors;
  const accentClass = accentColors[themeKey];
  const bgAccentClass = bgAccents[themeKey];
  const shadowAccentClass = shadowAccents[themeKey];
  const ringAccentClass = ringAccents[themeKey];
  const [formData, setFormData] = useState({
    name: profile?.name || '',
    weight: profile?.weight || 0,
    height: profile?.height || 0,
    healthIssues: profile?.healthIssues || '',
    theme: profile?.theme || 'gym-neon'
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), formData);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const themeOptions = [
    { id: 'gym-neon', label: 'Neon Lima', preview: 'bg-black border-lime-400' },
    { id: 'neon-blue', label: 'Neon Azul', preview: 'bg-black border-blue-400' },
    { id: 'neon-red', label: 'Neon Vermelho', preview: 'bg-black border-red-400' },
    { id: 'neon-purple', label: 'Neon Roxo', preview: 'bg-black border-purple-400' },
    { id: 'neon-cyan', label: 'Neon Ciano', preview: 'bg-black border-cyan-400' },
    { id: 'dark', label: 'Eclipse Dark', preview: 'bg-zinc-950 border-zinc-700' },
    { id: 'light', label: 'Clean White', preview: 'bg-white border-zinc-200' },
    { id: 'sunset', label: 'Sunset Glow', preview: 'bg-orange-50 border-orange-200' },
  ];

  return (
    <div className="space-y-12 max-w-2xl">
      <div className="space-y-4">
        <h2 className="text-5xl font-black tracking-tighter">Configurações</h2>
        <p className="text-zinc-400">Personalize sua experiência e dados biométricos.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-10">
        <section className="space-y-6">
          <div className={cn("flex items-center gap-2 font-black tracking-widest text-xs uppercase", accentClass)}>
            <User size={16} /> Perfil & Biometria
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 ml-2">Seu Nome</label>
              <input 
                type="text" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className={cn("w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 px-6 focus:outline-none focus:ring-2", ringAccentClass)}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 ml-2">Peso (kg)</label>
                <input 
                  type="number" 
                  value={formData.weight || ''}
                  onChange={e => setFormData({...formData, weight: Number(e.target.value)})}
                  className={cn("w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 px-6 focus:outline-none focus:ring-2", ringAccentClass)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 ml-2">Altura (cm)</label>
                <input 
                  type="number" 
                  value={formData.height || ''}
                  onChange={e => setFormData({...formData, height: Number(e.target.value)})}
                  className={cn("w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 px-6 focus:outline-none focus:ring-2", ringAccentClass)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-bold text-zinc-500 ml-2">
              <AlertCircle size={14} /> Problemas de Saúde / Observações
            </label>
            <textarea 
              value={formData.healthIssues}
              onChange={e => setFormData({...formData, healthIssues: e.target.value})}
              placeholder="Diabetes, Pressão Alta, Lesões..."
              className={cn("w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 px-6 min-h-[100px] focus:outline-none focus:ring-2", ringAccentClass)}
            />
          </div>
        </section>

        <section className="space-y-6">
          <div className={cn("flex items-center gap-2 font-black tracking-widest text-xs uppercase", accentClass)}>
            <Palette size={16} /> Aparência & Tema
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {themeOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setFormData({...formData, theme: opt.id as any})}
                className={cn(
                  "flex flex-col items-center gap-3 p-4 rounded-3xl border-2 transition-all",
                  formData.theme === opt.id 
                    ? cn("bg-black border-opacity-40", borderAccents[opt.id as keyof typeof borderAccents].replace('focus:', '')) 
                    : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
                )}
              >
                <div className={cn("w-12 h-12 rounded-full border-2 shadow-inner", opt.preview)} />
                <span className="text-[10px] font-black uppercase tracking-widest">{opt.label}</span>
              </button>
            ))}
          </div>
        </section>

        <button 
          type="submit"
          disabled={isSaving}
          className={cn(
            "w-full font-black py-4 rounded-2xl shadow-xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50",
            bgAccentClass, "text-black", shadowAccentClass
          )}
        >
          <Save size={20} />
          {isSaving ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </form>
    </div>
  );
}
