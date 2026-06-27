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

