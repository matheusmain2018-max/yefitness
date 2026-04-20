export interface UserProfile {
  uid: string;
  name: string;
  weight?: number;
  height?: number;
  healthIssues?: string;
  theme: 'dark' | 'light' | 'gym-neon' | 'sunset';
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
  timestamp: any;
}

export interface ExerciseEntry {
  name: string;
  weight: number;
  sets: number;
  reps: number;
}

export interface Workout {
  id?: string;
  userId: string;
  date: string;
  exercises: ExerciseEntry[];
  type: 'home' | 'gym';
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
