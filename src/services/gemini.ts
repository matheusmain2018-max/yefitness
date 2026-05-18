import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile, Meal, Workout, Supplement, Cardio } from "../types";

let genAI: GoogleGenAI | null = null;

function getAI() {
  if (!genAI) {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === 'undefined') {
      throw new Error("GEMINI_API_KEY is not defined. Please set it in your environment variables.");
    }
    genAI = new GoogleGenAI({ apiKey: key });
  }
  return genAI;
}

export async function analyzeMeal(mealDescription: string, healthIssues?: string) {
  const ai = getAI();
  const prompt = `Analise a seguinte descrição de refeição e forneça os macronutrientes aproximados (calorias, proteínas, carboidratos, gorduras) em formato JSON.
  
Refeição: "${mealDescription}"
${healthIssues ? `Contexto de saúde do usuário: "${healthIssues}". Se a refeição for prejudicial ou precisar de atenção especial devido a este contexto, mencione no campo 'aiAdvice'.` : ""}

Retorne os macros e dois campos de texto curtos:
1. 'aiComment': Um comentário motivador ou técnico sobre a qualidade nutricional.
2. 'aiAdvice': Um aviso ou conselho específico SE houver algo relevante ao contexto de saúde (opcional).`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          calories: { type: Type.NUMBER },
          protein: { type: Type.NUMBER },
          carbs: { type: Type.NUMBER },
          fat: { type: Type.NUMBER },
          aiComment: { type: Type.STRING },
          aiAdvice: { type: Type.STRING }
        },
        required: ["calories", "protein", "carbs", "fat", "aiComment"]
      }
    }
  });

  return JSON.parse(response.text);
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
  const ai = getAI();
  const { profile, meals, workouts, supplements, cardios, date, targets } = data;

  const dailyTotals = meals.reduce((s, m) => ({
    cal: s.cal + m.calories,
    pro: s.pro + m.protein,
    carb: s.carb + m.carbs,
    fat: s.fat + m.fat
  }), { cal: 0, pro: 0, carb: 0, fat: 0 });

  const prompt = `Gere uma análise técnica e visual para o dia ${date}.
  
Contexto:
- Objetivo: ${profile?.goal}
- Metas Diárias: ${targets.calories}kcal (P:${targets.protein}g, C:${targets.carbs}g, F:${targets.fat}g)
- Consumo Real: ${dailyTotals.cal}kcal (P:${Math.round(dailyTotals.pro)}g, C:${Math.round(dailyTotals.carb)}g, F:${Math.round(dailyTotals.fat)}g)
- Atividade: ${workouts.length} treinos, ${cardios.filter(c => c.checks[date]).length} cardios realizados.
- Hábitos: ${supplements.filter(s => s.checks[date]).length}/${supplements.length} suplementos.

Retorne APENAS um JSON com esta estrutura:
{
  "quickSummary": "Uma frase curta de impacto",
  "scores": {
    "diet": 0-100,
    "training": 0-100,
    "habits": 0-100
  },
  "analysis": "Texto curto e organizado usando markdown para destacar pontos chave.",
  "advice": "Sugestão específica para amanhã",
  "status": "success" | "warning" | "danger" (baseado no desempenho geral)
}

Seja crítico mas motivador. Considere o objetivo (${profile?.goal}) na pontuação.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: { responseMimeType: "application/json" }
  } as any);

  return JSON.parse(response.text);
}

export async function analyzeEvolution(photos: { front?: string, back?: string, side?: string, biceps?: string }) {
  const ai = getAI();
  const parts = [
    { text: "Compare estas fotos de evolução física. Analise mudanças na composição corporal, definição muscular e postura. Seja motivador e técnico." }
  ];

  if (photos.front) parts.push({ inlineData: { data: photos.front.split(',')[1], mimeType: "image/jpeg" } } as any);
  if (photos.back) parts.push({ inlineData: { data: photos.back.split(',')[1], mimeType: "image/jpeg" } } as any);
  if (photos.side) parts.push({ inlineData: { data: photos.side.split(',')[1], mimeType: "image/jpeg" } } as any);
  if (photos.biceps) parts.push({ inlineData: { data: photos.biceps.split(',')[1], mimeType: "image/jpeg" } } as any);

  if (parts.length === 1) return "Por favor, adicione pelo menos uma foto para análise.";

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: { parts }
  } as any);

  return response.text;
}
