import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  const ai = new GoogleGenAI({ 
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  if (!process.env.GEMINI_API_KEY) {
    console.warn("⚠️ GEMINI_API_KEY não encontrada! As funcionalidades de IA não funcionarão.");
  }

  // Health check and Debug
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      env: process.env.NODE_ENV,
      hasKey: !!process.env.GEMINI_API_KEY,
      keyPrefix: process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 4) + "..." : null
    });
  });

  // API Routes
  app.post("/api/ai/analyze-meal", async (req, res) => {
    console.log("Analyzing meal request received");
    try {
      const { mealDescription, healthIssues } = req.body;
      if (!mealDescription) return res.status(400).json({ error: "Descrição da refeição é necessária" });

      if (!process.env.GEMINI_API_KEY) {
        throw new Error("Configuração ausente: GEMINI_API_KEY não definida no AI Studio.");
      }

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

      const text = response.text || "{}";
      console.log("AI Meal Response received:", text);
      res.json(JSON.parse(text));
    } catch (error: any) {
      console.error("AI Meal Analysis Error:", error);
      res.status(500).json({ error: error.message || "Falha na análise da IA. Verifique se a API Key está configurada corretamente nas configurações do AI Studio." });
    }
  });

  app.post("/api/ai/generate-report", async (req, res) => {
    console.log("Generating daily report request received");
    try {
      const { profile, meals, workouts, supplements, cardios, date, targets } = req.body;

      if (!process.env.GEMINI_API_KEY) {
        throw new Error("Configuração ausente: GEMINI_API_KEY não definida no AI Studio.");
      }

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

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      
      const text = response.text || "{}";
      res.json(JSON.parse(text));
    } catch (error: any) {
      console.error("AI Report Generation Error:", error);
      res.status(500).json({ error: error.message || "Falha na geração do relatório. Verifique a API Key." });
    }
  });

  app.post("/api/ai/analyze-evolution", async (req, res) => {
    console.log("Analyzing evolution request received");
    try {
      const { photos } = req.body;
      if (!process.env.GEMINI_API_KEY) {
        throw new Error("Configuração ausente: GEMINI_API_KEY não definida no AI Studio.");
      }

      const parts: any[] = [
        { text: "Compare estas fotos de evolução física. Analise mudanças na composição corporal, definição muscular e postura. Seja motivador e técnico." }
      ];

      const addPhoto = (dataUri?: string) => {
        if (!dataUri) return;
        const [meta, base64] = dataUri.split(',');
        const mimeType = meta.split(':')[1].split(';')[0];
        parts.push({ inlineData: { data: base64, mimeType } });
      };

      addPhoto(photos.front);
      addPhoto(photos.back);
      addPhoto(photos.side);
      addPhoto(photos.biceps);

      if (parts.length === 1) {
        return res.status(400).json({ error: "Por favor, adicione pelo menos uma foto para análise." });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: { parts }
      });
      
      res.json(response.text || "Sem análise disponível.");
    } catch (error: any) {
      console.error("AI Evolution Analysis Error:", error);
      res.status(500).json({ error: error.message || "Falha na análise de evolução. Verifique a API Key." });
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
