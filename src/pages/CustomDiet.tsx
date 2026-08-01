import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckSquare, Plus, Trash2, Sparkles, Calendar, Edit2, Check, X,
  Utensils, Flame, RefreshCw, AlertCircle, Info, ChevronDown, ChevronUp,
  FileText, Save, Award, ArrowRight, ClipboardList, CheckCircle2
} from 'lucide-react';
import { db, auth } from '../services/firebase';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, orderBy, getDocs } from 'firebase/firestore';
import { calculateDayMacros } from '../services/gemini';
import { CustomDietPlan, CustomDietDayLog, CustomDietMeal, CustomDietFoodItem, UserProfile } from '../types';
import {
  accentColors, bgAccents, shadowAccents, cn, ringAccents,
  hoverBorderAccents, bgSoftAccents, borderSoftAccents
} from '../App';

const quickFoodSuggestions = [
  { name: 'Arroz branco ou integral', quantity: '150g cozido', calories: 195, protein: 4, carbs: 43, fat: 1 },
  { name: 'Feijão carioca ou preto', quantity: '100g cozido', calories: 75, protein: 5, carbs: 14, fat: 0 },
  { name: 'Peito de frango grelhado', quantity: '150g', calories: 245, protein: 46, carbs: 0, fat: 5 },
  { name: 'Patinho moído', quantity: '150g', calories: 280, protein: 44, carbs: 0, fat: 10 },
  { name: 'Ovos mexidos ou cozidos', quantity: '3 unidades', calories: 210, protein: 18, carbs: 2, fat: 14 },
  { name: 'Salada verde + azeite', quantity: '1 prato', calories: 50, protein: 1, carbs: 3, fat: 4 },
  { name: 'Banana prata + aveia', quantity: '1 un + 30g', calories: 180, protein: 5, carbs: 36, fat: 2 },
  { name: 'Whey Protein (1 scoop)', quantity: '30g', calories: 120, protein: 24, carbs: 3, fat: 1 },
  { name: 'Tapioca com queijo', quantity: '50g + 30g', calories: 210, protein: 8, carbs: 28, fat: 7 },
  { name: 'Iogurte natural desnatado', quantity: '170g', calories: 85, protein: 8, carbs: 10, fat: 0 }
];

const quickMealSuggestions = [
  { name: 'Café da Manhã', time: '08:00' },
  { name: 'Lanche da Manhã', time: '10:30' },
  { name: 'Almoço', time: '12:30' },
  { name: 'Lanche da Tarde', time: '16:00' },
  { name: 'Pré-Treino', time: '18:00' },
  { name: 'Pós-Treino', time: '19:30' },
  { name: 'Jantar', time: '20:30' },
  { name: 'Ceia', time: '22:30' }
];

interface Props {
  profile: UserProfile | null;
  user: any;
}

export default function CustomDiet({ profile, user }: Props) {
  const themeKey = (profile?.theme || 'gym-neon') as keyof typeof accentColors;
  const accentClass = accentColors[themeKey];
  const bgAccentClass = bgAccents[themeKey];
  const shadowAccentClass = shadowAccents[themeKey];
  const bgSoftAccentClass = bgSoftAccents[themeKey];
  const borderSoftAccentClass = borderSoftAccents[themeKey];

  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [mode, setMode] = useState<'checklist' | 'freetext'>('checklist');

  // Custom Diet Plan state
  const [plan, setPlan] = useState<CustomDietPlan>({
    userId: user?.uid || '',
    title: 'Minha Dieta Personalizada',
    meals: [
      {
        id: 'meal_1',
        name: 'Café da Manhã',
        time: '08:00',
        items: [
          { id: 'item_1', name: '3 Ovos mexidos', quantity: '3 unidades', calories: 210, protein: 18, carbs: 2, fat: 14 },
          { id: 'item_2', name: 'Pão integral com requeijão', quantity: '2 fatias', calories: 160, protein: 6, carbs: 26, fat: 3 },
          { id: 'item_3', name: 'Café preto sem açúcar', quantity: '1 xícara', calories: 5, protein: 0, carbs: 1, fat: 0 }
        ]
      },
      {
        id: 'meal_2',
        name: 'Almoço',
        time: '12:30',
        items: [
          { id: 'item_4', name: 'Arroz branco ou integral', quantity: '150g cozido', calories: 195, protein: 4, carbs: 43, fat: 1 },
          { id: 'item_5', name: 'Feijão carioca', quantity: '100g cozido', calories: 75, protein: 5, carbs: 14, fat: 0 },
          { id: 'item_6', name: 'Peito de frango grelhado ou patinho', quantity: '150g', calories: 245, protein: 46, carbs: 0, fat: 5 },
          { id: 'item_7', name: 'Salada verde à vontade + azeite', quantity: '1 prato', calories: 50, protein: 1, carbs: 3, fat: 4 }
        ]
      },
      {
        id: 'meal_3',
        name: 'Lanche / Pré-treino',
        time: '16:30',
        items: [
          { id: 'item_8', name: 'Banana prata com aveia', quantity: '1 un + 30g', calories: 180, protein: 5, carbs: 36, fat: 2 },
          { id: 'item_9', name: 'Whey Protein (opcional)', quantity: '1 scoop (30g)', calories: 120, protein: 24, carbs: 3, fat: 1 }
        ]
      },
      {
        id: 'meal_4',
        name: 'Jantar',
        time: '20:30',
        items: [
          { id: 'item_10', name: 'Carne magra ou frango grelhado', quantity: '150g', calories: 240, protein: 44, carbs: 0, fat: 6 },
          { id: 'item_11', name: 'Batata doce ou arroz', quantity: '150g cozido', calories: 130, protein: 2, carbs: 30, fat: 0 }
        ]
      }
    ]
  });

  // Daily Log state (checks & free text)
  const [dayLog, setDayLog] = useState<CustomDietDayLog>({
    userId: user?.uid || '',
    date: selectedDate,
    checkedItemIds: [],
    freeTextReport: '',
    aiCalculatedMacros: null
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [isCalculatingAI, setIsCalculatingAI] = useState(false);
  const [isCalculatingSingleFoodAI, setIsCalculatingSingleFoodAI] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New meal form state
  const [isAddingMeal, setIsAddingMeal] = useState(false);
  const [newMealName, setNewMealName] = useState('');
  const [newMealTime, setNewMealTime] = useState('');

  // New food item form state per meal
  const [addingFoodToMealId, setAddingFoodToMealId] = useState<string | null>(null);
  const [newFoodName, setNewFoodName] = useState('');
  const [newFoodQuantity, setNewFoodQuantity] = useState('');
  const [newFoodCalories, setNewFoodCalories] = useState('');
  const [newFoodProtein, setNewFoodProtein] = useState('');
  const [newFoodCarbs, setNewFoodCarbs] = useState('');
  const [newFoodFat, setNewFoodFat] = useState('');

  // Edit meal state
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [editMealName, setEditMealName] = useState('');
  const [editMealTime, setEditMealTime] = useState('');

  // Edit food item state
  const [editingFood, setEditingFood] = useState<{ mealId: string; item: CustomDietFoodItem } | null>(null);
  const [editFoodName, setEditFoodName] = useState('');
  const [editFoodQuantity, setEditFoodQuantity] = useState('');
  const [editFoodCalories, setEditFoodCalories] = useState('');
  const [editFoodProtein, setEditFoodProtein] = useState('');
  const [editFoodCarbs, setEditFoodCarbs] = useState('');
  const [editFoodFat, setEditFoodFat] = useState('');

  // Free text report state
  const [freeText, setFreeText] = useState('');

  // 1. Load custom diet plan & selected day log
  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Load custom plan
        const planRef = doc(db, 'users', user.uid, 'custom_diet_plan', 'default');
        const planSnap = await getDoc(planRef);
        if (planSnap.exists()) {
          const data = planSnap.data() as CustomDietPlan;
          if (data.meals && Array.isArray(data.meals)) {
            setPlan(data);
          }
        } else {
          // Save default initial plan
          await setDoc(planRef, {
            ...plan,
            userId: user.uid,
            updatedAt: serverTimestamp()
          });
        }

        // Load day log for selectedDate
        const dayRef = doc(db, 'users', user.uid, 'custom_diet_days', selectedDate);
        const daySnap = await getDoc(dayRef);
        if (daySnap.exists()) {
          const data = daySnap.data() as CustomDietDayLog;
          setDayLog({
            userId: user.uid,
            date: selectedDate,
            checkedItemIds: data.checkedItemIds || [],
            freeTextReport: data.freeTextReport || '',
            aiCalculatedMacros: data.aiCalculatedMacros || null
          });
          setFreeText(data.freeTextReport || '');
        } else {
          setDayLog({
            userId: user.uid,
            date: selectedDate,
            checkedItemIds: [],
            freeTextReport: '',
            aiCalculatedMacros: null
          });
          setFreeText('');
        }
      } catch (err: any) {
        console.error("Erro ao carregar dieta personalizada:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user, selectedDate]);

  // Save plan to firestore
  const savePlanToFirestore = async (updatedPlan: CustomDietPlan) => {
    if (!user) return;
    setIsSavingPlan(true);
    try {
      const planRef = doc(db, 'users', user.uid, 'custom_diet_plan', 'default');
      await setDoc(planRef, {
        ...updatedPlan,
        userId: user.uid,
        updatedAt: serverTimestamp()
      });
    } catch (err: any) {
      console.error("Erro ao salvar plano:", err);
      setError("Não foi possível salvar as alterações da dieta.");
    } finally {
      setIsSavingPlan(false);
    }
  };

  // Save day log to firestore
  const saveDayLogToFirestore = async (updatedDayLog: CustomDietDayLog) => {
    if (!user) return;
    try {
      const dayRef = doc(db, 'users', user.uid, 'custom_diet_days', selectedDate);
      await setDoc(dayRef, {
        ...updatedDayLog,
        userId: user.uid,
        updatedAt: serverTimestamp()
      });
    } catch (err: any) {
      console.error("Erro ao salvar log do dia:", err);
    }
  };

  // Toggle item checkbox
  const handleToggleItem = async (itemId: string) => {
    const currentChecked = dayLog.checkedItemIds || [];
    const isChecked = currentChecked.includes(itemId);
    const updatedChecked = isChecked
      ? currentChecked.filter(id => id !== itemId)
      : [...currentChecked, itemId];

    const updatedDayLog: CustomDietDayLog = {
      ...dayLog,
      checkedItemIds: updatedChecked
    };

    setDayLog(updatedDayLog);
    await saveDayLogToFirestore(updatedDayLog);
  };

  // Add new meal
  const handleAddMeal = async () => {
    if (!newMealName.trim()) return;
    const newMeal: CustomDietMeal = {
      id: `meal_${Date.now()}`,
      name: newMealName.trim(),
      time: newMealTime.trim() || undefined,
      items: []
    };
    const updatedPlan: CustomDietPlan = {
      ...plan,
      meals: [...plan.meals, newMeal]
    };
    setPlan(updatedPlan);
    setNewMealName('');
    setNewMealTime('');
    setIsAddingMeal(false);
    await savePlanToFirestore(updatedPlan);
  };

  // Remove meal
  const handleRemoveMeal = async (mealId: string) => {
    const updatedPlan: CustomDietPlan = {
      ...plan,
      meals: plan.meals.filter(m => m.id !== mealId)
    };
    setPlan(updatedPlan);
    await savePlanToFirestore(updatedPlan);
  };

  // Estimar macros automaticamente com IA para o novo alimento no formulário
  const handleEstimateNewFoodAI = async () => {
    if (!newFoodName.trim() || isCalculatingSingleFoodAI) return;
    setIsCalculatingSingleFoodAI(true);
    setError(null);
    try {
      const itemStr = `${newFoodName.trim()} (${newFoodQuantity.trim() || '1 porção média'})`;
      const result = await calculateDayMacros({
        items: [itemStr],
        profile
      });
      const aiItem = result?.breakdown?.[0];
      if (aiItem) {
        setNewFoodCalories(String(Math.round(aiItem.calories || 0)));
        setNewFoodProtein(String(Math.round(aiItem.protein || 0)));
        setNewFoodCarbs(String(Math.round(aiItem.carbs || 0)));
        setNewFoodFat(String(Math.round(aiItem.fat || 0)));
      }
    } catch (err: any) {
      console.error("Erro ao estimar macros com IA:", err);
      setError("Falha ao estimar macros automaticamente. Tente novamente.");
    } finally {
      setIsCalculatingSingleFoodAI(false);
    }
  };

  // Estimar macros automaticamente com IA para o alimento sendo editado
  const handleEstimateEditFoodAI = async () => {
    if (!editFoodName.trim() || isCalculatingSingleFoodAI) return;
    setIsCalculatingSingleFoodAI(true);
    setError(null);
    try {
      const itemStr = `${editFoodName.trim()} (${editFoodQuantity.trim() || '1 porção média'})`;
      const result = await calculateDayMacros({
        items: [itemStr],
        profile
      });
      const aiItem = result?.breakdown?.[0];
      if (aiItem) {
        setEditFoodCalories(String(Math.round(aiItem.calories || 0)));
        setEditFoodProtein(String(Math.round(aiItem.protein || 0)));
        setEditFoodCarbs(String(Math.round(aiItem.carbs || 0)));
        setEditFoodFat(String(Math.round(aiItem.fat || 0)));
      }
    } catch (err: any) {
      console.error("Erro ao recalcular macros com IA:", err);
      setError("Falha ao estimar macros com IA. Tente novamente.");
    } finally {
      setIsCalculatingSingleFoodAI(false);
    }
  };

  // Add food to meal (automaticamente calcula com a IA se os macros não forem informados)
  const handleAddFood = async (mealId: string) => {
    if (!newFoodName.trim()) return;

    let cal = newFoodCalories ? Number(newFoodCalories) : undefined;
    let prot = newFoodProtein ? Number(newFoodProtein) : undefined;
    let carb = newFoodCarbs ? Number(newFoodCarbs) : undefined;
    let ft = newFoodFat ? Number(newFoodFat) : undefined;

    // Se os macros não foram informados, calcula automaticamente com a IA agora mesmo
    if (cal === undefined && !isCalculatingSingleFoodAI) {
      setIsCalculatingSingleFoodAI(true);
      try {
        const itemStr = `${newFoodName.trim()} (${newFoodQuantity.trim() || '1 porção média'})`;
        const result = await calculateDayMacros({
          items: [itemStr],
          profile
        });
        const aiItem = result?.breakdown?.[0];
        if (aiItem) {
          cal = Math.round(aiItem.calories || 0);
          prot = Math.round(aiItem.protein || 0);
          carb = Math.round(aiItem.carbs || 0);
          ft = Math.round(aiItem.fat || 0);
        }
      } catch (err: any) {
        console.error("Erro ao calcular macros com IA ao adicionar alimento:", err);
      } finally {
        setIsCalculatingSingleFoodAI(false);
      }
    }

    const newItem: CustomDietFoodItem = {
      id: `item_${Date.now()}`,
      name: newFoodName.trim(),
      quantity: newFoodQuantity.trim() || undefined,
      calories: cal,
      protein: prot,
      carbs: carb,
      fat: ft
    };

    const updatedPlan: CustomDietPlan = {
      ...plan,
      meals: plan.meals.map(m => {
        if (m.id === mealId) {
          return { ...m, items: [...m.items, newItem] };
        }
        return m;
      })
    };

    setPlan(updatedPlan);
    setNewFoodName('');
    setNewFoodQuantity('');
    setNewFoodCalories('');
    setNewFoodProtein('');
    setNewFoodCarbs('');
    setNewFoodFat('');
    setAddingFoodToMealId(null);
    await savePlanToFirestore(updatedPlan);
  };

  // Remove food from meal
  const handleRemoveFood = async (mealId: string, itemId: string) => {
    const updatedPlan: CustomDietPlan = {
      ...plan,
      meals: plan.meals.map(m => {
        if (m.id === mealId) {
          return {
            ...m,
            items: m.items.filter(item => item.id !== itemId)
          };
        }
        return m;
      })
    };
    setPlan(updatedPlan);
    await savePlanToFirestore(updatedPlan);
  };

  // Start editing a meal
  const handleStartEditMeal = (meal: CustomDietMeal) => {
    setEditingMealId(meal.id);
    setEditMealName(meal.name);
    setEditMealTime(meal.time || '');
  };

  // Save edited meal
  const handleSaveEditMeal = async (mealId: string) => {
    if (!editMealName.trim()) return;
    const updatedPlan: CustomDietPlan = {
      ...plan,
      meals: plan.meals.map(m => {
        if (m.id === mealId) {
          return {
            ...m,
            name: editMealName.trim(),
            time: editMealTime.trim() || undefined
          };
        }
        return m;
      })
    };
    setPlan(updatedPlan);
    setEditingMealId(null);
    await savePlanToFirestore(updatedPlan);
  };

  // Start editing a food item
  const handleStartEditFood = (mealId: string, item: CustomDietFoodItem) => {
    setEditingFood({ mealId, item });
    setEditFoodName(item.name);
    setEditFoodQuantity(item.quantity || '');
    setEditFoodCalories(item.calories !== undefined ? String(item.calories) : '');
    setEditFoodProtein(item.protein !== undefined ? String(item.protein) : '');
    setEditFoodCarbs(item.carbs !== undefined ? String(item.carbs) : '');
    setEditFoodFat(item.fat !== undefined ? String(item.fat) : '');
  };

  // Save edited food item
  const handleSaveEditFood = async () => {
    if (!editingFood || !editFoodName.trim()) return;
    const { mealId, item } = editingFood;

    let cal = editFoodCalories ? Number(editFoodCalories) : undefined;
    let prot = editFoodProtein ? Number(editFoodProtein) : undefined;
    let carb = editFoodCarbs ? Number(editFoodCarbs) : undefined;
    let ft = editFoodFat ? Number(editFoodFat) : undefined;

    // Se as calorias ficarem vazias, calcula automaticamente usando a IA
    if (cal === undefined && !isCalculatingSingleFoodAI) {
      setIsCalculatingSingleFoodAI(true);
      try {
        const itemStr = `${editFoodName.trim()} (${editFoodQuantity.trim() || '1 porção média'})`;
        const result = await calculateDayMacros({
          items: [itemStr],
          profile
        });
        const aiItem = result?.breakdown?.[0];
        if (aiItem) {
          cal = Math.round(aiItem.calories || 0);
          prot = Math.round(aiItem.protein || 0);
          carb = Math.round(aiItem.carbs || 0);
          ft = Math.round(aiItem.fat || 0);
        }
      } catch (err: any) {
        console.error("Erro ao calcular macros com IA ao editar alimento:", err);
      } finally {
        setIsCalculatingSingleFoodAI(false);
      }
    }

    const updatedItem: CustomDietFoodItem = {
      ...item,
      name: editFoodName.trim(),
      quantity: editFoodQuantity.trim() || undefined,
      calories: cal,
      protein: prot,
      carbs: carb,
      fat: ft
    };

    const updatedPlan: CustomDietPlan = {
      ...plan,
      meals: plan.meals.map(m => {
        if (m.id === mealId) {
          return {
            ...m,
            items: m.items.map(i => i.id === item.id ? updatedItem : i)
          };
        }
        return m;
      })
    };

    setPlan(updatedPlan);
    setEditingFood(null);
    await savePlanToFirestore(updatedPlan);
  };

  // Apply quick food suggestion
  const handleApplyQuickSuggestion = (suggestion: typeof quickFoodSuggestions[0]) => {
    setNewFoodName(suggestion.name);
    setNewFoodQuantity(suggestion.quantity);
    setNewFoodCalories(String(suggestion.calories));
    setNewFoodProtein(String(suggestion.protein));
    setNewFoodCarbs(String(suggestion.carbs));
    setNewFoodFat(String(suggestion.fat));
  };

  // Calculate AI macros for free text report
  const handleCalculateFreeTextMacros = async () => {
    if (!freeText.trim() || isCalculatingAI) return;
    setIsCalculatingAI(true);
    setError(null);
    try {
      const result = await calculateDayMacros({
        textReport: freeText,
        profile
      });

      const updatedDayLog: CustomDietDayLog = {
        ...dayLog,
        freeTextReport: freeText,
        aiCalculatedMacros: result
      };

      setDayLog(updatedDayLog);
      await saveDayLogToFirestore(updatedDayLog);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro ao calcular macros com IA.");
    } finally {
      setIsCalculatingAI(false);
    }
  };

  // Calculate AI macros for a meal automatically
  const handleCalculateMealAI = async (mealId: string) => {
    const meal = plan.meals.find(m => m.id === mealId);
    if (!meal || meal.items.length === 0 || isCalculatingAI) return;

    setIsCalculatingAI(true);
    setError(null);
    try {
      const namesList = meal.items.map(item => `${item.name} (${item.quantity || '1 porção'})`);
      const result = await calculateDayMacros({
        items: namesList,
        profile
      });

      if (result && result.breakdown) {
        const updatedMeals = plan.meals.map(m => {
          if (m.id === mealId) {
            const updatedItems = m.items.map((item, idx) => {
              const aiItem = result.breakdown?.[idx] || result.breakdown?.[0];
              if (aiItem) {
                return {
                  ...item,
                  calories: Math.round(aiItem.calories || item.calories || 0),
                  protein: Math.round(aiItem.protein || item.protein || 0),
                  carbs: Math.round(aiItem.carbs || item.carbs || 0),
                  fat: Math.round(aiItem.fat || item.fat || 0)
                };
              }
              return item;
            });
            return { ...m, items: updatedItems };
          }
          return m;
        });

        const updatedPlan = { ...plan, meals: updatedMeals };
        setPlan(updatedPlan);
        await savePlanToFirestore(updatedPlan);
      }
    } catch (err: any) {
      console.error(err);
      setError("Não foi possível estimar macros automaticamente. Tente novamente.");
    } finally {
      setIsCalculatingAI(false);
    }
  };

  // Cumulative macros from checked items today
  const allItems = plan.meals.flatMap(m => m.items);
  const totalItemsCount = allItems.length;
  const checkedItemsCount = (dayLog.checkedItemIds || []).filter(id => allItems.some(item => item.id === id)).length;
  const checklistProgress = totalItemsCount > 0 ? Math.round((checkedItemsCount / totalItemsCount) * 100) : 0;

  const cumulativeCheckedMacros = allItems
    .filter(item => (dayLog.checkedItemIds || []).includes(item.id))
    .reduce((acc, item) => ({
      calories: acc.calories + (item.calories || 0),
      protein: acc.protein + (item.protein || 0),
      carbs: acc.carbs + (item.carbs || 0),
      fat: acc.fat + (item.fat || 0)
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  // Total macros of the whole custom diet plan
  const planTotalMacros = allItems.reduce((acc, item) => ({
    calories: acc.calories + (item.calories || 0),
    protein: acc.protein + (item.protein || 0),
    carbs: acc.carbs + (item.carbs || 0),
    fat: acc.fat + (item.fat || 0)
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={cn("px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full", bgSoftAccentClass, accentClass)}>
              Sua Dieta / Seu Checklist
            </span>
          </div>
          <h2 className="text-4xl font-black tracking-tighter uppercase font-display">Minha Dieta Personalizada</h2>
          <p className="text-zinc-400 text-sm">
            Monte os alimentos que você quiser comer ou escreva livremente o que fez no dia para calcular macros com IA.
          </p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2 bg-zinc-900/80 border border-zinc-800/80 px-4 py-2 rounded-2xl">
          <Calendar size={16} className={accentClass} />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent text-white text-xs font-bold outline-none cursor-pointer"
          />
        </div>
      </div>

      {/* Toggle Mode Button Group */}
      <div className="flex rounded-2xl bg-zinc-900/70 border border-zinc-800 p-1.5 gap-2 max-w-lg">
        <button
          onClick={() => setMode('checklist')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
            mode === 'checklist'
              ? cn(bgAccentClass, "text-black shadow-lg", shadowAccentClass)
              : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
          )}
        >
          <CheckSquare size={16} />
          Checklist Diário da Minha Dieta
        </button>
        <button
          onClick={() => setMode('freetext')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
            mode === 'freetext'
              ? cn(bgAccentClass, "text-black shadow-lg", shadowAccentClass)
              : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
          )}
        >
          <Sparkles size={16} />
          Relato Livre & Cálculo IA
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-red-400 text-xs font-semibold">
          <AlertCircle className="shrink-0 mt-0.5" size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* MODE 1: CHECKLIST DIÁRIO DA DIETA PERSONALIZADA */}
      {mode === 'checklist' && (
        <div className="space-y-6">
          {/* Progress Bar & Realtime Macro Tracker Card */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-3xl p-6 shadow-xl backdrop-blur-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/60 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Progresso de Hoje ({selectedDate})</span>
                <div className="flex items-center gap-3 mt-1">
                  <h3 className="text-2xl font-black text-white">
                    {checkedItemsCount} de {totalItemsCount} Itens Concluídos
                  </h3>
                  <span className={cn("text-sm font-black px-2.5 py-0.5 rounded-lg", bgSoftAccentClass, accentClass)}>
                    {checklistProgress}%
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {checkedItemsCount > 0 && (
                  <button
                    onClick={async () => {
                      const resetLog = { ...dayLog, checkedItemIds: [] };
                      setDayLog(resetLog);
                      await saveDayLogToFirestore(resetLog);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 text-xs font-bold transition-all border border-zinc-700"
                  >
                    <RefreshCw size={12} />
                    Reiniciar Hoje
                  </button>
                )}
                <button
                  onClick={() => setIsAddingMeal(true)}
                  className={cn("flex items-center gap-1.5 px-4 py-2 rounded-xl text-black font-black text-xs transition-all cursor-pointer hover:scale-105 active:scale-95", bgAccentClass, shadowAccentClass)}
                >
                  <Plus size={16} />
                  Nova Refeição
                </button>
              </div>
            </div>

            {/* Progress line */}
            <div className="w-full h-3 bg-zinc-800/80 rounded-full overflow-hidden">
              <motion.div
                className={cn("h-full rounded-full transition-all duration-500", bgAccentClass)}
                style={{ width: `${checklistProgress}%` }}
              />
            </div>

            {/* Macros Consumed so far today vs Plan Total */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="bg-black/30 p-3.5 rounded-2xl border border-zinc-800/50 text-center">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Calorias Ingeridas</p>
                <p className={cn("text-xl font-black mt-0.5", accentClass)}>
                  {cumulativeCheckedMacros.calories} <span className="text-xs text-zinc-500 font-bold">/ {planTotalMacros.calories} kcal</span>
                </p>
              </div>
              <div className="bg-black/30 p-3.5 rounded-2xl border border-zinc-800/50 text-center">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Proteína</p>
                <p className="text-xl font-black mt-0.5 text-blue-400">
                  {cumulativeCheckedMacros.protein}g <span className="text-xs text-zinc-500 font-bold">/ {planTotalMacros.protein}g</span>
                </p>
              </div>
              <div className="bg-black/30 p-3.5 rounded-2xl border border-zinc-800/50 text-center">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Carboidratos</p>
                <p className="text-xl font-black mt-0.5 text-amber-400">
                  {cumulativeCheckedMacros.carbs}g <span className="text-xs text-zinc-500 font-bold">/ {planTotalMacros.carbs}g</span>
                </p>
              </div>
              <div className="bg-black/30 p-3.5 rounded-2xl border border-zinc-800/50 text-center">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Gorduras</p>
                <p className="text-xl font-black mt-0.5 text-red-400">
                  {cumulativeCheckedMacros.fat}g <span className="text-xs text-zinc-500 font-bold">/ {planTotalMacros.fat}g</span>
                </p>
              </div>
            </div>
          </div>

          {/* New Meal Modal / Form */}
          <AnimatePresence>
            {isAddingMeal && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-zinc-900/90 border border-zinc-800 p-6 rounded-3xl space-y-4 shadow-xl"
              >
                <h4 className="text-base font-black uppercase text-white">Criar Nova Refeição na Minha Dieta</h4>
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-zinc-400 block">💡 Escolha rápido ou digite um nome:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {quickMealSuggestions.map((sug, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setNewMealName(sug.name);
                          setNewMealTime(sug.time);
                        }}
                        className="px-3 py-1 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-bold border border-zinc-700 transition-all"
                      >
                        + {sug.name} ({sug.time})
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-zinc-400 mb-1 block">Nome da Refeição</label>
                    <input
                      type="text"
                      placeholder="Ex: Almoço, Ceia, Lanche da Tarde..."
                      value={newMealName}
                      onChange={(e) => setNewMealName(e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 px-4 py-2.5 rounded-xl text-sm text-white font-bold outline-none focus:border-zinc-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-400 mb-1 block">Horário (Opcional)</label>
                    <input
                      type="text"
                      placeholder="Ex: 12:30 ou 16:00"
                      value={newMealTime}
                      onChange={(e) => setNewMealTime(e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 px-4 py-2.5 rounded-xl text-sm text-white font-bold outline-none focus:border-zinc-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setIsAddingMeal(false)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleAddMeal}
                    disabled={!newMealName.trim()}
                    className={cn(
                      "px-5 py-2 rounded-xl text-black font-black text-xs transition-all",
                      newMealName.trim() ? bgAccentClass : "bg-zinc-700 text-zinc-500 cursor-not-allowed"
                    )}
                  >
                    Adicionar Refeição
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Meals Checklist Cards */}
          <div className="space-y-4">
            {plan.meals.map((meal) => {
              const mealItemsCheckedCount = meal.items.filter(i => (dayLog.checkedItemIds || []).includes(i.id)).length;
              const isMealAllChecked = meal.items.length > 0 && mealItemsCheckedCount === meal.items.length;

              const mealMacros = meal.items.reduce((acc, item) => ({
                calories: acc.calories + (item.calories || 0),
                protein: acc.protein + (item.protein || 0),
                carbs: acc.carbs + (item.carbs || 0),
                fat: acc.fat + (item.fat || 0)
              }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

              return (
                <div
                  key={meal.id}
                  className={cn(
                    "bg-zinc-900/60 border rounded-3xl p-6 transition-all space-y-4",
                    isMealAllChecked
                      ? "border-emerald-500/30 bg-emerald-950/10"
                      : "border-zinc-800/80 hover:border-zinc-700"
                  )}
                >
                  {/* Meal header */}
                  {editingMealId === meal.id ? (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-zinc-950/80 p-4 rounded-2xl border border-zinc-700">
                      <div className="flex flex-col sm:flex-row items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={editMealName}
                          onChange={(e) => setEditMealName(e.target.value)}
                          placeholder="Nome da refeição (ex: Almoço)"
                          className="bg-zinc-800 border border-zinc-600 px-3 py-2 rounded-xl text-sm text-white font-bold outline-none flex-1 w-full"
                        />
                        <input
                          type="text"
                          value={editMealTime}
                          onChange={(e) => setEditMealTime(e.target.value)}
                          placeholder="Horário (ex: 12:30)"
                          className="bg-zinc-800 border border-zinc-600 px-3 py-2 rounded-xl text-sm text-white font-bold outline-none w-full sm:w-32"
                        />
                      </div>
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => setEditingMealId(null)}
                          className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => handleSaveEditMeal(meal.id)}
                          className={cn("px-4 py-2 rounded-xl text-black font-black text-xs", bgAccentClass)}
                        >
                          Salvar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-3 h-3 rounded-full", isMealAllChecked ? "bg-emerald-400" : bgAccentClass)} />
                        <div>
                          <h4 className="text-lg font-black text-white flex items-center gap-2">
                            {meal.name}
                            {meal.time && (
                              <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-lg font-bold font-mono">
                                {meal.time}
                              </span>
                            )}
                          </h4>
                          <p className="text-xs text-zinc-400 font-bold">
                            {mealItemsCheckedCount} de {meal.items.length} itens marcados
                            {mealMacros.calories > 0 && (
                              <span className="text-zinc-500 font-mono"> • Total: {mealMacros.calories} kcal ({mealMacros.protein}g P)</span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Meal actions */}
                      <div className="flex items-center gap-2">
                        {meal.items.length > 0 && (
                          <button
                            onClick={() => handleCalculateMealAI(meal.id)}
                            disabled={isCalculatingAI}
                            className={cn(
                              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border",
                              isCalculatingAI
                                ? "bg-zinc-800 text-zinc-500 border-zinc-700"
                                : cn(bgSoftAccentClass, accentClass, borderSoftAccentClass, "hover:bg-opacity-20")
                            )}
                            title="Estimar calorias e macros automaticamente usando IA"
                          >
                            <Sparkles size={13} />
                            {isCalculatingAI ? "Calculando..." : "Calcular Macros IA"}
                          </button>
                        )}
                        <button
                          onClick={() => setAddingFoodToMealId(meal.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-all border border-zinc-700"
                        >
                          <Plus size={13} />
                          Alimento
                        </button>
                        <button
                          onClick={() => handleStartEditMeal(meal)}
                          className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
                          title="Editar nome ou horário da refeição"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => handleRemoveMeal(meal.id)}
                          className="p-1.5 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                          title="Excluir refeição"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Food items checklist for this meal */}
                  <div className="space-y-2">
                    {meal.items.length === 0 ? (
                      <p className="text-xs text-zinc-500 italic font-bold py-2">
                        Nenhum alimento cadastrado nesta refeição. Clique em "+ Alimento" para adicionar o que você come aqui.
                      </p>
                    ) : (
                      meal.items.map((item) => {
                        const isChecked = (dayLog.checkedItemIds || []).includes(item.id);
                        const isEditingThisFood = editingFood?.item.id === item.id;

                        if (isEditingThisFood) {
                          return (
                            <div
                              key={item.id}
                              className="p-4 bg-zinc-950/90 border-2 border-zinc-700 rounded-2xl space-y-3"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black uppercase text-zinc-300">
                                  Alterando Alimento
                                </span>
                                <button
                                  onClick={() => setEditingFood(null)}
                                  className="text-zinc-500 hover:text-white"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[10px] font-bold text-zinc-400 block mb-0.5">Alimento</label>
                                  <input
                                    type="text"
                                    value={editFoodName}
                                    onChange={(e) => setEditFoodName(e.target.value)}
                                    placeholder="Ex: Ovos mexidos, Arroz..."
                                    className="w-full bg-zinc-800 border border-zinc-700 px-3 py-1.5 rounded-xl text-xs text-white font-bold outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-zinc-400 block mb-0.5">Quantidade</label>
                                  <input
                                    type="text"
                                    value={editFoodQuantity}
                                    onChange={(e) => setEditFoodQuantity(e.target.value)}
                                    placeholder="Ex: 150g, 3 unidades..."
                                    className="w-full bg-zinc-800 border border-zinc-700 px-3 py-1.5 rounded-xl text-xs text-white font-bold outline-none"
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                <div>
                                  <label className="text-[10px] font-bold text-zinc-400 block mb-0.5">Calorias (kcal)</label>
                                  <input
                                    type="number"
                                    value={editFoodCalories}
                                    onChange={(e) => setEditFoodCalories(e.target.value)}
                                    className="w-full bg-zinc-800 border border-zinc-700 px-3 py-1.5 rounded-xl text-xs text-white font-bold outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-zinc-400 block mb-0.5">Proteína (g)</label>
                                  <input
                                    type="number"
                                    value={editFoodProtein}
                                    onChange={(e) => setEditFoodProtein(e.target.value)}
                                    className="w-full bg-zinc-800 border border-zinc-700 px-3 py-1.5 rounded-xl text-xs text-white font-bold outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-zinc-400 block mb-0.5">Carbos (g)</label>
                                  <input
                                    type="number"
                                    value={editFoodCarbs}
                                    onChange={(e) => setEditFoodCarbs(e.target.value)}
                                    className="w-full bg-zinc-800 border border-zinc-700 px-3 py-1.5 rounded-xl text-xs text-white font-bold outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-zinc-400 block mb-0.5">Gorduras (g)</label>
                                  <input
                                    type="number"
                                    value={editFoodFat}
                                    onChange={(e) => setEditFoodFat(e.target.value)}
                                    className="w-full bg-zinc-800 border border-zinc-700 px-3 py-1.5 rounded-xl text-xs text-white font-bold outline-none"
                                  />
                                </div>
                              </div>
                              <div className="flex justify-end gap-2 pt-1">
                                <button
                                  onClick={() => setEditingFood(null)}
                                  className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold"
                                >
                                  Cancelar
                                </button>
                                <button
                                  onClick={handleSaveEditFood}
                                  className={cn("px-4 py-1.5 rounded-xl text-black font-black text-xs", bgAccentClass)}
                                >
                                  Salvar Alterações
                                </button>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={item.id}
                            onClick={() => handleToggleItem(item.id)}
                            className={cn(
                              "flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer group",
                              isChecked
                                ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-100"
                                : "bg-zinc-900/60 border-zinc-800/80 text-zinc-200 hover:border-zinc-700"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  "w-6 h-6 rounded-xl flex items-center justify-center border transition-all shrink-0",
                                  isChecked
                                    ? "bg-emerald-500 border-emerald-400 text-black"
                                    : "border-zinc-700 bg-zinc-800/80 text-transparent group-hover:border-zinc-500"
                                )}
                              >
                                <Check size={14} strokeWidth={3} />
                              </div>
                              <div>
                                <p className={cn("text-sm font-bold", isChecked && "line-through opacity-80")}>
                                  {item.name}
                                </p>
                                {item.quantity && (
                                  <p className="text-xs text-zinc-400 font-medium">
                                    {item.quantity}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              {(item.calories || item.protein || item.carbs || item.fat) ? (
                                <div className="text-right font-mono text-xs hidden sm:block">
                                  <span className={cn("font-black", isChecked ? "text-emerald-300" : accentClass)}>
                                    {item.calories || 0} kcal
                                  </span>
                                  <span className="text-zinc-500 block text-[10px]">
                                    P: {item.protein || 0}g | C: {item.carbs || 0}g | G: {item.fat || 0}g
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[10px] text-zinc-500 italic hidden sm:block font-bold">
                                  Sem macros
                                </span>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartEditFood(meal.id, item);
                                }}
                                className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-all opacity-70 group-hover:opacity-100"
                                title="Alterar alimento"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveFood(meal.id, item.id);
                                }}
                                className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-70 group-hover:opacity-100"
                                title="Remover item"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Add Food modal inside meal card */}
                  <AnimatePresence>
                    {addingFoodToMealId === meal.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="pt-2 border-t border-zinc-800/80 space-y-3"
                      >
                        <h5 className="text-xs font-black uppercase text-zinc-300">Adicionar Alimento em {meal.name}</h5>
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-bold text-zinc-400 block">
                            💡 Sugestões rápidas (clique para preencher):
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {quickFoodSuggestions.map((sug, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => handleApplyQuickSuggestion(sug)}
                                className="px-2.5 py-1 rounded-xl bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 hover:text-white text-[11px] font-bold border border-zinc-700/80 transition-all"
                              >
                                + {sug.name.split(' ou ')[0]} ({sug.quantity})
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Alimento (ex: Ovos mexidos, Arroz integral...)"
                            value={newFoodName}
                            onChange={(e) => setNewFoodName(e.target.value)}
                            className="bg-zinc-800 border border-zinc-700 px-3.5 py-2 rounded-xl text-xs text-white font-bold outline-none"
                          />
                          <input
                            type="text"
                            placeholder="Quantidade (ex: 3 un, 150g, 2 fatias...)"
                            value={newFoodQuantity}
                            onChange={(e) => setNewFoodQuantity(e.target.value)}
                            className="bg-zinc-800 border border-zinc-700 px-3.5 py-2 rounded-xl text-xs text-white font-bold outline-none"
                          />
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <input
                            type="number"
                            placeholder="Calorias (kcal)"
                            value={newFoodCalories}
                            onChange={(e) => setNewFoodCalories(e.target.value)}
                            className="bg-zinc-800 border border-zinc-700 px-3 py-2 rounded-xl text-xs text-white font-bold outline-none"
                          />
                          <input
                            type="number"
                            placeholder="Proteína (g)"
                            value={newFoodProtein}
                            onChange={(e) => setNewFoodProtein(e.target.value)}
                            className="bg-zinc-800 border border-zinc-700 px-3 py-2 rounded-xl text-xs text-white font-bold outline-none"
                          />
                          <input
                            type="number"
                            placeholder="Carbos (g)"
                            value={newFoodCarbs}
                            onChange={(e) => setNewFoodCarbs(e.target.value)}
                            className="bg-zinc-800 border border-zinc-700 px-3 py-2 rounded-xl text-xs text-white font-bold outline-none"
                          />
                          <input
                            type="number"
                            placeholder="Gorduras (g)"
                            value={newFoodFat}
                            onChange={(e) => setNewFoodFat(e.target.value)}
                            className="bg-zinc-800 border border-zinc-700 px-3 py-2 rounded-xl text-xs text-white font-bold outline-none"
                          />
                        </div>
                        <div className="flex justify-between items-center pt-1">
                          <span className="text-[11px] text-zinc-400 font-bold">
                            💡 Você pode deixar macros em branco e clicar em "Calcular Macros IA" depois!
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setAddingFoodToMealId(null)}
                              className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-all"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => handleAddFood(meal.id)}
                              disabled={!newFoodName.trim()}
                              className={cn(
                                "px-4 py-1.5 rounded-xl text-black font-black text-xs transition-all",
                                newFoodName.trim() ? bgAccentClass : "bg-zinc-700 text-zinc-500 cursor-not-allowed"
                              )}
                            >
                              Adicionar
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODE 2: RELATO LIVRE DO DIA & CÁLCULO IA DE MACROS */}
      {mode === 'freetext' && (
        <div className="space-y-6">
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-3xl p-6 md:p-8 shadow-xl backdrop-blur-sm space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
              <div className="flex items-center gap-3">
                <div className={cn("p-2.5 rounded-2xl", bgSoftAccentClass)}>
                  <Sparkles className={accentClass} size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">Relato Livre do Dia ({selectedDate})</h3>
                  <p className="text-zinc-400 text-xs font-bold">
                    Escreva como foi sua alimentação hoje com as suas palavras. A IA calculará calorias e macros!
                  </p>
                </div>
              </div>
            </div>

            {/* Textarea for free text report */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-zinc-300 block">
                O que você comeu hoje?
              </label>
              <textarea
                rows={5}
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                placeholder="Ex: No café comi 2 ovos mexidos, 2 fatias de pão integral e café sem açúcar. No almoço comi 200g de patinho moído, 150g de arroz integral e salada verde. A tarde tomei um scoop de whey com banana..."
                className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-zinc-700 rounded-2xl p-4 text-sm text-zinc-100 placeholder-zinc-500 outline-none font-medium leading-relaxed transition-all resize-none"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
              <span className="text-xs text-zinc-400 font-bold">
                ⚡ Dica: Você pode informar a quantidade aproximada para precisão máxima.
              </span>
              <button
                onClick={handleCalculateFreeTextMacros}
                disabled={!freeText.trim() || isCalculatingAI}
                className={cn(
                  "flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-black font-black text-sm transition-all shadow-xl cursor-pointer hover:scale-105 active:scale-95",
                  freeText.trim() && !isCalculatingAI ? cn(bgAccentClass, shadowAccentClass) : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                )}
              >
                <Sparkles size={18} />
                {isCalculatingAI ? "Calculando Macros com IA..." : "Calcular Macros do Meu Dia"}
              </button>
            </div>
          </div>

          {/* AI Calculation Results Display */}
          {dayLog.aiCalculatedMacros && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-zinc-900/80 border border-zinc-800/80 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div className="flex items-center gap-2">
                  <Award className={accentClass} size={22} />
                  <h4 className="text-xl font-black text-white">Resultado Nutricional do Seu Dia</h4>
                </div>
                <span className={cn("text-xs font-black px-3 py-1 rounded-xl uppercase tracking-wider", bgSoftAccentClass, accentClass)}>
                  Análise LOUtrista IA
                </span>
              </div>

              {/* Total macros banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-black/40 p-4 rounded-2xl border border-zinc-800/60 text-center">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Calorias Totais</p>
                  <p className={cn("text-2xl font-black mt-1", accentClass)}>
                    {Math.round(dayLog.aiCalculatedMacros.totalCalories)} kcal
                  </p>
                </div>
                <div className="bg-black/40 p-4 rounded-2xl border border-zinc-800/60 text-center">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Proteína (g)</p>
                  <p className="text-2xl font-black mt-1 text-blue-400">
                    {Math.round(dayLog.aiCalculatedMacros.totalProtein)}g
                  </p>
                </div>
                <div className="bg-black/40 p-4 rounded-2xl border border-zinc-800/60 text-center">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Carboidratos (g)</p>
                  <p className="text-2xl font-black mt-1 text-amber-400">
                    {Math.round(dayLog.aiCalculatedMacros.totalCarbs)}g
                  </p>
                </div>
                <div className="bg-black/40 p-4 rounded-2xl border border-zinc-800/60 text-center">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Gorduras (g)</p>
                  <p className="text-2xl font-black mt-1 text-red-400">
                    {Math.round(dayLog.aiCalculatedMacros.totalFat)}g
                  </p>
                </div>
              </div>

              {/* LOUtrista Evaluation */}
              <div className="bg-zinc-950/60 border border-zinc-800 p-5 rounded-2xl space-y-2">
                <h5 className="text-xs font-black uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                  <Info size={14} className={accentClass} />
                  Parecer Nutricional LOUtrista
                </h5>
                <p className="text-sm text-zinc-200 font-medium leading-relaxed">
                  {dayLog.aiCalculatedMacros.evaluation}
                </p>
              </div>

              {/* Breakdown by food/meal */}
              {dayLog.aiCalculatedMacros.breakdown && dayLog.aiCalculatedMacros.breakdown.length > 0 && (
                <div className="space-y-3">
                  <h5 className="text-xs font-black uppercase tracking-wider text-zinc-400">
                    Detalhamento dos Alimentos e Refeições Identificados
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {dayLog.aiCalculatedMacros.breakdown.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-4 bg-zinc-900/70 border border-zinc-800/80 rounded-2xl flex justify-between items-center"
                      >
                        <span className="text-sm font-bold text-zinc-100">{item.name}</span>
                        <div className="text-right font-mono text-xs">
                          <span className={cn("font-black block", accentClass)}>
                            {Math.round(item.calories || 0)} kcal
                          </span>
                          <span className="text-zinc-500 text-[10px]">
                            P: {Math.round(item.protein || 0)}g | C: {Math.round(item.carbs || 0)}g | G: {Math.round(item.fat || 0)}g
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tips */}
              {dayLog.aiCalculatedMacros.tips && dayLog.aiCalculatedMacros.tips.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h5 className="text-xs font-black uppercase tracking-wider text-zinc-400">Dicas para o Seu Próximo Dia</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {dayLog.aiCalculatedMacros.tips.map((tip, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-zinc-300 bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/50 font-bold">
                        <CheckCircle2 size={14} className={cn("shrink-0 mt-0.5", accentClass)} />
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
