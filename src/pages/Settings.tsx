import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { User, Weight, Ruler, AlertCircle, Save, Target, Activity, Flame, Sparkles, Scale, HeartPulse, Info } from 'lucide-react';
import { db } from '../services/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { UserProfile } from '../types';
import { cn, accentColors, bgAccents, shadowAccents, ringAccents, bgSoftAccents, borderSoftAccents } from '../App';

interface Props {
  profile: UserProfile | null;
  user: any;
}

export function calculateMetabolics(
  weight: number,
  height: number,
  age: number,
  gender: 'male' | 'female',
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active',
  goal: 'lose' | 'maintain' | 'gain'
) {
  if (!weight || !height || !age || weight <= 0 || height <= 0 || age <= 0) {
    return null;
  }

  // 1. IMC
  const heightM = height / 100;
  const bmi = Number((weight / (heightM * heightM)).toFixed(1));

  let bmiCategory = 'Peso Normal';
  let bmiColor = 'text-green-400 bg-green-500/10 border-green-500/20';
  if (bmi < 18.5) {
    bmiCategory = 'Abaixo do peso';
    bmiColor = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
  } else if (bmi < 25) {
    bmiCategory = 'Peso ideal';
    bmiColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
  } else if (bmi < 30) {
    bmiCategory = 'Sobrepeso';
    bmiColor = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
  } else {
    bmiCategory = 'Obesidade';
    bmiColor = 'text-red-400 bg-red-500/10 border-red-500/20';
  }

  // 2. TMB (Mifflin-St Jeor)
  let bmr = (10 * weight) + (6.25 * height) - (5 * age);
  if (gender === 'male') {
    bmr += 5;
  } else {
    bmr -= 161;
  }
  bmr = Math.round(bmr);

  // 3. TDEE
  const activityMultipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };
  const mult = activityMultipliers[activityLevel] || 1.55;
  const tdee = Math.round(bmr * mult);

  // 4. Target Calories according to goal
  let targetCalories = tdee;
  if (goal === 'lose') {
    targetCalories = Math.max(1200, Math.round(tdee - 500));
  } else if (goal === 'gain') {
    targetCalories = Math.round(tdee + 350);
  }

  // 5. Target Macros
  const targetProtein = Math.round(weight * 2.0); // 2g/kg
  const proteinCalories = targetProtein * 4;
  const targetFat = Math.round((targetCalories * 0.25) / 9); // 25% fats
  const fatCalories = targetFat * 9;
  const carbCalories = Math.max(0, targetCalories - proteinCalories - fatCalories);
  const targetCarbs = Math.round(carbCalories / 4);

  return {
    bmi,
    bmiCategory,
    bmiColor,
    bmr,
    tdee,
    targetCalories,
    targetProtein,
    targetCarbs,
    targetFat,
  };
}

export default function Settings({ profile, user }: Props) {
  const themeKey = (profile?.theme || 'neon-red') as keyof typeof accentColors;
  const accentClass = accentColors[themeKey];
  const bgAccentClass = bgAccents[themeKey];
  const shadowAccentClass = shadowAccents[themeKey];
  const ringAccentClass = ringAccents[themeKey];
  const bgSoftAccentClass = bgSoftAccents[themeKey];
  const borderSoftAccentClass = borderSoftAccents[themeKey];

  const [formData, setFormData] = useState({
    name: profile?.name || '',
    weight: profile?.weight || 0,
    height: profile?.height || 0,
    age: profile?.age || 0,
    gender: profile?.gender || 'male' as 'male' | 'female',
    goal: profile?.goal || 'maintain' as 'lose' | 'maintain' | 'gain',
    activityLevel: profile?.activityLevel || 'moderate' as 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active',
    healthIssues: profile?.healthIssues || '',
    theme: 'neon-red' as any
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
        theme: 'neon-red'
      });
    }
  }, [profile?.uid]);

  // Compute live metabolic values
  const metabolics = useMemo(() => {
    return calculateMetabolics(
      Number(formData.weight),
      Number(formData.height),
      Number(formData.age),
      formData.gender,
      formData.activityLevel,
      formData.goal
    );
  }, [formData.weight, formData.height, formData.age, formData.gender, formData.activityLevel, formData.goal]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.uid) {
      console.warn('User not found');
      return;
    }
    
    setIsSaving(true);
    setSaveStatus('idle');
    
    const dataToSave: any = {
      name: formData.name || '',
      weight: Number(formData.weight) || 0,
      height: Number(formData.height) || 0,
      age: Number(formData.age) || 0,
      gender: formData.gender,
      goal: formData.goal,
      activityLevel: formData.activityLevel,
      healthIssues: formData.healthIssues || '',
      theme: 'neon-red'
    };

    if (metabolics) {
      dataToSave.bmi = metabolics.bmi;
      dataToSave.bmr = metabolics.bmr;
      dataToSave.tdee = metabolics.tdee;
      dataToSave.targetCalories = metabolics.targetCalories;
      dataToSave.targetProtein = metabolics.targetProtein;
      dataToSave.targetCarbs = metabolics.targetCarbs;
      dataToSave.targetFat = metabolics.targetFat;
    }

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

  return (
    <div className="space-y-12 max-w-2xl pb-20">
      <div className="space-y-4">
        <h2 className="text-5xl font-black tracking-tighter">Configurações</h2>
        <p className="text-zinc-400">Personalize sua experiência e dados biométricos.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-10">
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
                  step="0.1"
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
                <option value="lose">Emagrecer / Definição (-500 kcal)</option>
                <option value="maintain">Manter Peso / Saúde (Manutenção)</option>
                <option value="gain">Ganhar Peso / Massa (+350 kcal)</option>
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

        {/* CÁLCULO METABÓLICO AUTOMÁTICO IA */}
        <section className="p-6 rounded-3xl bg-zinc-900/90 border border-zinc-800/80 space-y-6 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("p-2.5 rounded-2xl", bgSoftAccentClass)}>
                <Sparkles size={20} className={accentClass} />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                  Cálculo Metabólico IA
                </h3>
                <p className="text-xs text-zinc-400">Calculado automaticamente com base no seu perfil</p>
              </div>
            </div>
            {metabolics && (
              <span className={cn("px-3 py-1 text-xs font-bold rounded-full border", metabolics.bmiColor)}>
                {metabolics.bmiCategory}
              </span>
            )}
          </div>

          {metabolics ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-zinc-950/60 p-4 rounded-2xl border border-zinc-800/60">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">IMC</span>
                  <p className="text-2xl font-black text-white mt-1">{metabolics.bmi}</p>
                  <span className="text-[10px] text-zinc-400">kg/m²</span>
                </div>

                <div className="bg-zinc-950/60 p-4 rounded-2xl border border-zinc-800/60">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">Basal (TMB)</span>
                  <p className="text-2xl font-black text-amber-400 mt-1">{metabolics.bmr}</p>
                  <span className="text-[10px] text-zinc-400">kcal em repouso</span>
                </div>

                <div className="bg-zinc-950/60 p-4 rounded-2xl border border-zinc-800/60">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">Gasto Total (TDEE)</span>
                  <p className="text-2xl font-black text-orange-400 mt-1">{metabolics.tdee}</p>
                  <span className="text-[10px] text-zinc-400">kcal gastas/dia</span>
                </div>

                <div className={cn("p-4 rounded-2xl border bg-zinc-950/80", borderSoftAccentClass)}>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Meta p/ Dieta</span>
                  <p className={cn("text-2xl font-black mt-1", accentClass)}>{metabolics.targetCalories}</p>
                  <span className="text-[10px] text-zinc-400">kcal recomendadas</span>
                </div>
              </div>

              {/* Macros Recomendados */}
              <div className="bg-zinc-950/80 p-4 rounded-2xl border border-zinc-800/80 space-y-3">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span className="font-bold text-zinc-300">Macros diários sugeridos para o seu objetivo:</span>
                  <span className="text-[10px] text-zinc-500">Gera metas automáticas na dieta</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
                    <span className="text-[10px] uppercase font-bold text-zinc-500 block">Proteína</span>
                    <span className="text-base font-black text-sky-400">{metabolics.targetProtein}g</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
                    <span className="text-[10px] uppercase font-bold text-zinc-500 block">Carboidratos</span>
                    <span className="text-base font-black text-orange-400">{metabolics.targetCarbs}g</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
                    <span className="text-[10px] uppercase font-bold text-zinc-500 block">Gorduras</span>
                    <span className="text-base font-black text-red-400">{metabolics.targetFat}g</span>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-zinc-400 bg-zinc-950/40 p-3 rounded-xl border border-zinc-800/50 flex items-center gap-2">
                <Info size={14} className={accentClass} />
                <span>Ao clicar em "Salvar Alterações", esta meta de <b>{metabolics.targetCalories} kcal</b> será aplicada diretamente no seu plano de dieta!</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-zinc-500 italic">
              Preencha seu peso, altura e idade acima para calcular seu IMC, metabolismo basal e meta diária automaticamente.
            </p>
          )}
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
            'Alterações & Metas Aplicadas com Sucesso!'
          ) : saveStatus === 'error' ? (
            'Erro ao Salvar'
          ) : (
            <>
              <Save size={20} />
              Salvar Alterações & Aplicar na Dieta
            </>
          )}
        </button>
      </form>
    </div>
  );
}
