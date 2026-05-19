import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

  // API Routes
  app.post("/api/ai/analyze-meal", async (req, res) => {
    try {
      const { mealDescription, healthIssues } = req.body;
      const prompt = `Analise a seguinte descrição de refeição e forneça os macronutrientes aproximados (calorias, proteínas, carboidratos, gorduras) em formato JSON.
  
Refeição: "${mealDescription}"
${healthIssues ? `Contexto de saúde do usuário: "${healthIssues}". Se a refeição for prejudicial ou precisar de atenção especial devido a este contexto, mencione no campo 'aiAdvice'.` : ""}

Retorne os macros e dois campos de texto curtos:
1. 'aiComment': Um comentário motivador ou técnico sobre a qualidade nutricional.
2. 'aiAdvice': Um aviso ou conselho específico SE houver algo relevante ao contexto de saúde (opcional).`;

      const result = await genAI.models.generateContent({
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

      res.json(JSON.parse(result.text));
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/generate-report", async (req, res) => {
    try {
      const { profile, meals, workouts, supplements, cardios, date, targets } = req.body;

      const dailyTotals = meals.reduce((s: any, m: any) => ({
        cal: s.cal + (m.calories || 0),
        pro: s.pro + (m.protein || 0),
        carb: s.carb + (m.carbs || 0),
        fat: s.fat + (m.fat || 0)
      }), { cal: 0, pro: 0, carb: 0, fat: 0 });

      const prompt = `Gere uma análise técnica e visual para o dia ${date}.
  
Contexto:
- Objetivo: ${profile?.goal}
- Metas Diárias: ${targets.calories}kcal (P:${targets.protein}g, C:${targets.carbs}g, F:${targets.fat}g)
- Consumo Real: ${dailyTotals.cal}kcal (P:${Math.round(dailyTotals.pro)}g, C:${Math.round(dailyTotals.carb)}g, F:${Math.round(dailyTotals.fat)}g)
- Atividade: ${workouts.length} treinos, ${cardios.filter((c: any) => c.checks?.[date]).length} cardios realizados.
- Hábitos: ${supplements.filter((s: any) => s.checks?.[date]).length}/${supplements.length} suplementos.

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

      const result = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      res.json(JSON.parse(result.text));
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/analyze-evolution", async (req, res) => {
    try {
      const { photos } = req.body;
      const parts: any[] = [
        { text: "Compare estas fotos de evolução física. Analise mudanças na composição corporal, definição muscular e postura. Seja motivador e técnico." }
      ];

      if (photos.front) parts.push({ inlineData: { data: photos.front.split(',')[1], mimeType: "image/jpeg" } });
      if (photos.back) parts.push({ inlineData: { data: photos.back.split(',')[1], mimeType: "image/jpeg" } });
      if (photos.side) parts.push({ inlineData: { data: photos.side.split(',')[1], mimeType: "image/jpeg" } });
      if (photos.biceps) parts.push({ inlineData: { data: photos.biceps.split(',')[1], mimeType: "image/jpeg" } });

      if (parts.length === 1) {
        return res.json("Por favor, adicione pelo menos uma foto para análise.");
      }

      const result = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: { parts }
      });
      res.json(result.text);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
