import { UserProfile, Meal, Workout, Supplement, Cardio } from "../types";

export async function analyzeMeal(mealDescription: string, healthIssues?: string) {
  const response = await fetch('/api/ai/analyze-meal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mealDescription, healthIssues })
  });

  if (!response.ok) {
    const text = await response.text();
    let errorMsg = 'Erro ao analisar refeição';
    try {
      const errorData = JSON.parse(text);
      errorMsg = errorData.error || errorMsg;
    } catch {
      errorMsg = `Erro do servidor (${response.status}): ${text.substring(0, 100)}`;
    }
    throw new Error(errorMsg);
  }

  const resultText = await response.text();
  try {
    return JSON.parse(resultText);
  } catch (err) {
    console.error("Failed to parse AI response:", resultText);
    throw new Error("Resposta da IA inválida. Tente novamente.");
  }
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
    const text = await response.text();
    let errorMsg = 'Erro ao gerar relatório';
    try {
      const errorData = JSON.parse(text);
      errorMsg = errorData.error || errorMsg;
    } catch {
      errorMsg = `Erro do servidor (${response.status}): ${text.substring(0, 100)}`;
    }
    throw new Error(errorMsg);
  }

  const resultText = await response.text();
  try {
    return JSON.parse(resultText);
  } catch (err) {
    console.error("Failed to parse AI response:", resultText);
    throw new Error("Resposta da IA inválida. Tente novamente.");
  }
}

export async function analyzeWorkouts(data: {
  profile: UserProfile | null,
  workouts: Workout[],
  cardios: Cardio[],
  date: string
}) {
  const response = await fetch('/api/ai/analyze-workouts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const text = await response.text();
    let errorMsg = 'Erro ao analisar treinos';
    try {
      const errorData = JSON.parse(text);
      errorMsg = errorData.error || errorMsg;
    } catch {
      errorMsg = `Erro do servidor (${response.status}): ${text.substring(0, 100)}`;
    }
    throw new Error(errorMsg);
  }

  const resultText = await response.text();
  try {
    return JSON.parse(resultText);
  } catch (err) {
    console.error("Failed to parse AI response:", resultText);
    throw new Error("Resposta da IA inválida. Tente novamente.");
  }
}

export async function analyzeEvolution(photos: { front?: string, back?: string, side?: string, biceps?: string }) {
  const response = await fetch('/api/ai/analyze-evolution', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ photos })
  });

  if (!response.ok) {
    const text = await response.text();
    let errorMsg = 'Erro ao analisar evolução';
    try {
      const errorData = JSON.parse(text);
      errorMsg = errorData.error || errorMsg;
    } catch {
      errorMsg = `Erro do servidor (${response.status}): ${text.substring(0, 100)}`;
    }
    throw new Error(errorMsg);
  }

  const resultText = await response.text();
  try {
    return JSON.parse(resultText);
  } catch (err) {
    // For evolution, it might be plain text
    return resultText;
  }
}

export async function sendLOUtristaMessage(messages: { role: 'user' | 'assistant'; content: string }[], profile: UserProfile | null) {
  const response = await fetch('/api/ai/nutri-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, profile })
  });

  if (!response.ok) {
    const text = await response.text();
    let errorMsg = 'Erro ao conversar com LOUtrista';
    try {
      const errorData = JSON.parse(text);
      errorMsg = errorData.error || errorMsg;
    } catch {
      errorMsg = `Erro do servidor (${response.status}): ${text.substring(0, 100)}`;
    }
    throw new Error(errorMsg);
  }

  const resultText = await response.text();
  try {
    return JSON.parse(resultText);
  } catch (err) {
    console.error("Failed to parse LOUtrista response:", resultText);
    throw new Error("Resposta inválida do LOUtrista. Tente novamente.");
  }
}

export async function calculateDayMacros(payload: { textReport?: string; items?: string[]; profile?: UserProfile | null }) {
  const response = await fetch('/api/ai/calculate-day-macros', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const text = await response.text();
    let errorMsg = 'Erro ao calcular macros do dia';
    try {
      const errorData = JSON.parse(text);
      errorMsg = errorData.error || errorMsg;
    } catch {
      errorMsg = `Erro do servidor (${response.status}): ${text.substring(0, 100)}`;
    }
    throw new Error(errorMsg);
  }

  const resultText = await response.text();
  try {
    return JSON.parse(resultText);
  } catch (err) {
    console.error("Failed to parse macro calculation response:", resultText);
    throw new Error("Resposta inválida da IA. Tente novamente.");
  }
}

export async function analyzeSleep(payload: {
  bedtime: string;
  waketime: string;
  date: string;
  quality?: string;
  notes?: string;
  profile?: UserProfile | null;
}) {
  const response = await fetch('/api/ai/analyze-sleep', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const text = await response.text();
    let errorMsg = 'Erro ao analisar sono com IA';
    try {
      const errorData = JSON.parse(text);
      errorMsg = errorData.error || errorMsg;
    } catch {
      errorMsg = `Erro do servidor (${response.status}): ${text.substring(0, 100)}`;
    }
    throw new Error(errorMsg);
  }

  const resultText = await response.text();
  try {
    return JSON.parse(resultText);
  } catch (err) {
    console.error("Failed to parse sleep analysis response:", resultText);
    throw new Error("Resposta inválida da IA. Tente novamente.");
  }
}


