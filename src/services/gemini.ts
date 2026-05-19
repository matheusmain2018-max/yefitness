import { UserProfile, Meal, Workout, Supplement, Cardio } from "../types";

export async function analyzeMeal(mealDescription: string, healthIssues?: string) {
  const response = await fetch('/api/ai/analyze-meal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mealDescription, healthIssues })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Erro ao analisar refeição');
  }

  return response.json();
}

export async function generateDailyReport(data: {
  profile?: UserProfile | null,
  meals: Meal[],
  workouts: Workout[],
  supplements: Supplement[],
  cardios: Cardio[],
  date: string,
  targets: { calories: number, protein: number, carbs: number, fat: number }
}) {
  const response = await fetch('/api/ai/generate-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Erro ao gerar relatório');
  }

  return response.json();
}

export async function analyzeEvolution(photos: { front?: string, back?: string, side?: string, biceps?: string }) {
  const response = await fetch('/api/ai/analyze-evolution', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ photos })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Erro ao analisar evolução');
  }

  return response.json();
}
