import React, { useState } from 'react';
import { motion } from 'motion/react';
import { User, Palette, Weight, Ruler, AlertCircle, Save, Target, Activity } from 'lucide-react';
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
    age: profile?.age || 0,
    gender: profile?.gender || 'male' as 'male' | 'female',
    goal: profile?.goal || 'maintain' as 'lose' | 'maintain' | 'gain',
    activityLevel: profile?.activityLevel || 'moderate' as 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active',
    healthIssues: profile?.healthIssues || '',
    theme: profile?.theme || 'gym-neon'
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Sync with profile when it first loads
  React.useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        weight: profile.weight || 0,
        height: profile.height || 0,
        age: profile.age || 0,
        gender: profile.gender || 'male',
        goal: profile.goal || 'maintain',
        activityLevel: profile.activityLevel || 'moderate',
        healthIssues: profile.healthIssues || '',
        theme: profile.theme || 'gym-neon'
      });
    }
  }, [profile?.uid]); // Update only when user changes or first load

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.uid) {
      console.warn('User not found');
      return;
    }
    
    setIsSaving(true);
    setSaveStatus('idle');
    
    // Clean data object to ensure no undefined values are sent to Firestore
    const dataToSave = {
      name: formData.name || '',
      weight: Number(formData.weight) || 0,
      height: Number(formData.height) || 0,
      age: Number(formData.age) || 0,
      gender: formData.gender,
      goal: formData.goal,
      activityLevel: formData.activityLevel,
      healthIssues: formData.healthIssues || '',
      theme: formData.theme || 'gym-neon'
    };

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, dataToSave);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveStatus('error');
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
    <div className="space-y-12 max-w-2xl pb-20">
      <div className="space-y-4">
        <h2 className="text-5xl font-black tracking-tighter">Configurações</h2>
        <p className="text-zinc-400">Personalize sua experiência e dados biométricos.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-12">
        {/* Perfil & Biometria */}
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
            
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 ml-1">Peso (kg)</label>
                <input 
                  type="number" 
                  value={formData.weight || ''}
                  onChange={e => setFormData({...formData, weight: Number(e.target.value)})}
                  className={cn("w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 px-4 focus:outline-none focus:ring-2", ringAccentClass)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 ml-1">Altura (cm)</label>
                <input 
                  type="number" 
                  value={formData.height || ''}
                  onChange={e => setFormData({...formData, height: Number(e.target.value)})}
                  className={cn("w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 px-4 focus:outline-none focus:ring-2", ringAccentClass)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 ml-1">Idade</label>
                <input 
                  type="number" 
                  value={formData.age || ''}
                  onChange={e => setFormData({...formData, age: Number(e.target.value)})}
                  className={cn("w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 px-4 focus:outline-none focus:ring-2", ringAccentClass)}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 ml-2">Gênero</label>
              <select 
                value={formData.gender}
                onChange={e => setFormData({...formData, gender: e.target.value as any})}
                className={cn("w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 px-6 focus:outline-none focus:ring-2 appearance-none", ringAccentClass)}
              >
                <option value="male">Masculino</option>
                <option value="female">Feminino</option>
              </select>
            </div>
          </div>
        </section>

        {/* Metas e Atividade */}
        <section className="space-y-6">
          <div className={cn("flex items-center gap-2 font-black tracking-widest text-xs uppercase", accentClass)}>
            <Target size={16} /> Metas & Estilo de Vida
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 ml-2">Objetivo Principal</label>
              <select 
                value={formData.goal}
                onChange={e => setFormData({...formData, goal: e.target.value as any})}
                className={cn("w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 px-6 focus:outline-none focus:ring-2 appearance-none", ringAccentClass)}
              >
                <option value="lose">Emagrecer / Definição</option>
                <option value="maintain">Manter Peso / Saúde</option>
                <option value="gain">Ganhar Peso / Massa</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 ml-2">Nível de Atividade</label>
              <select 
                value={formData.activityLevel}
                onChange={e => setFormData({...formData, activityLevel: e.target.value as any})}
                className={cn("w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 px-6 focus:outline-none focus:ring-2 appearance-none", ringAccentClass)}
              >
                <option value="sedentary">Sedentário (pouco exercício)</option>
                <option value="light">Leve (1-3 dias/semana)</option>
                <option value="moderate">Moderado (3-5 dias/semana)</option>
                <option value="active">Ativo (6-7 dias/semana)</option>
                <option value="very_active">Muito Ativo (Atleta/Trabalho pesado)</option>
              </select>
            </div>
          </div>
        </section>

        {/* Saúde */}
        <section className="space-y-6">
          <div className={cn("flex items-center gap-2 font-black tracking-widest text-xs uppercase", accentClass)}>
            <AlertCircle size={16} /> Saúde & Observações
          </div>
          <div className="space-y-2">
            <textarea 
              value={formData.healthIssues}
              onChange={e => setFormData({...formData, healthIssues: e.target.value})}
              placeholder="Diabetes, Pressão Alta, Intolerâncias, Lesões..."
              className={cn("w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 px-6 min-h-[100px] focus:outline-none focus:ring-2", ringAccentClass)}
            />
          </div>
        </section>

        {/* Tema */}
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
            saveStatus === 'success' ? 'bg-green-500 text-white' : 
            saveStatus === 'error' ? 'bg-red-500 text-white' :
            cn(bgAccentClass, "text-black", shadowAccentClass)
          )}
        >
          {isSaving ? (
            <span className="flex items-center gap-2">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                <Save size={20} />
              </motion.div>
              Salvando...
            </span>
          ) : saveStatus === 'success' ? (
            'Alterações Salvas!'
          ) : saveStatus === 'error' ? (
            'Erro ao Salvar'
          ) : (
            <>
              <Save size={20} />
              Salvar Alterações
            </>
          )}
        </button>
      </form>
    </div>
  );
}
