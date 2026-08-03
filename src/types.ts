export interface UserProfile {
  uid: string;
  name: string;
  weight?: number;
  height?: number;
  age?: number;
  gender?: 'male' | 'female';
  goal?: 'lose' | 'maintain' | 'gain';
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  healthIssues?: string;
  theme: 'dark' | 'light' | 'gym-neon' | 'sunset' | 'neon-blue' | 'neon-red' | 'neon-purple' | 'neon-cyan';
}

export interface Meal {
  id?: string;
  userId: string;
  date: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  aiComment?: string;
  aiAdvice?: string;
  timestamp: any;
}

export interface ExerciseEntry {
  name: string;
  weight: number;
  sets: number;
  reps: number;
  duration?: number;
  distance?: number;
}

export interface Workout {
  id?: string;
  userId: string;
  date: string;
  exercises: ExerciseEntry[];
  type: 'home' | 'gym' | 'cardio';
}

export interface Supplement {
  id?: string;
  userId: string;
  name: string;
  time: string;
  checks: Record<string, boolean>;
}

export interface Cardio {
  id?: string;
  userId: string;
  name: string;
  duration: number;
  checks: Record<string, boolean>;
}

export interface EvolutionRecord {
  id?: string;
  userId: string;
  date: string;
  photos: {
    front?: string;
    back?: string;
    biceps?: string;
    side?: string;
  };
  measurements?: {
    chest?: number;
    waist?: number;
    biceps?: number;
    thigh?: number;
  };
  aiAnalysis?: string;
}

export interface NutriPanel {
  type: 'diet' | 'food_swap' | 'macros' | 'tips' | 'general';
  title: string;
  subtitle?: string;
  dietPlan?: {
    dailyCalories: number;
    dailyProtein: number;
    dailyCarbs: number;
    dailyFat: number;
    meals: {
      name: string;
      time?: string;
      foods: string[];
      calories?: number;
      protein?: number;
    }[];
  };
  swaps?: {
    original: string;
    replacement: string;
    reason: string;
    benefit: string;
  }[];
  macros?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    notes?: string;
  };
  items?: {
    title: string;
    description: string;
  }[];
}

export interface NutriMessage {
  id?: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  panel?: NutriPanel | null;
  timestamp: any;
}

export interface CustomDietFoodItem {
  id: string;
  name: string;
  quantity?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export interface CustomDietMeal {
  id: string;
  name: string;
  time?: string;
  items: CustomDietFoodItem[];
}

export interface CustomDietPlan {
  id?: string;
  userId: string;
  title: string;
  meals: CustomDietMeal[];
  updatedAt?: any;
}

export interface CustomDietDayLog {
  id?: string;
  userId: string;
  date: string; // YYYY-MM-DD format
  checkedItemIds: string[]; // Lista de IDs de itens marcados no checklist do dia
  freeTextReport?: string; // Relato livre do dia (o que o usuário comeu no dia)
  aiCalculatedMacros?: {
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
    evaluation: string;
    tips?: string[];
    breakdown?: {
      name: string;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    }[];
  } | null;
  updatedAt?: any;
}

export interface SleepLog {
  id?: string;
  userId: string;
  date: string; // YYYY-MM-DD
  bedtime: string; // ex: "23:00"
  waketime: string; // ex: "07:00"
  quality?: 'excellent' | 'good' | 'regular' | 'poor';
  notes?: string;
  aiReport?: {
    summary: string;
    cortisolAnalysis: string;
    hormoneImpact: string;
    circadianScore: number;
    recommendations: string[];
  } | null;
  timestamp?: any;
}



