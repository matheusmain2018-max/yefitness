import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function analyzeMeal(mealDescription: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analise a seguinte descrição de refeição e forneça os macronutrientes aproximados (calorias, proteínas, carboidratos, gorduras) em formato JSON. Refeição: "${mealDescription}"`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          calories: { type: Type.NUMBER },
          protein: { type: Type.NUMBER },
          carbs: { type: Type.NUMBER },
          fat: { type: Type.NUMBER },
          summary: { type: Type.STRING }
        },
        required: ["calories", "protein", "carbs", "fat"]
      }
    }
  });

  return JSON.parse(response.text);
}

export async function analyzeEvolution(photos: { front?: string, back?: string, side?: string, biceps?: string }) {
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
  });

  return response.text;
}
