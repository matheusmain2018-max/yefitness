import express from "express";
import cors from "cors";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));

// Lazy-initialize Gemini client to avoid crashes on startup and read the key dynamically.
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Configuração ausente: A variável de ambiente GEMINI_API_KEY não foi configurada. Por favor, adicione-a no painel do Vercel ou nas configurações.");
  }
  return new GoogleGenAI({ 
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

// Health check and debug info
app.get("/api/health", (req, res) => {
  const finalKey = process.env.GEMINI_API_KEY;
  res.json({ 
    status: "ok", 
    env: process.env.NODE_ENV,
    hasKey: !!finalKey,
    keyPrefix: finalKey ? finalKey.substring(0, 4) + "..." : null
  });
});

// Endpoint: Meal Analysis
app.post("/api/ai/analyze-meal", async (req, res) => {
  console.log("Analyzing meal request received");
  try {
    const { mealDescription, healthIssues } = req.body;
    if (!mealDescription) return res.status(400).json({ error: "Descrição da refeição é necessária" });

    const ai = getGeminiClient();

    const prompt = `Analise a seguinte descrição de refeição e forneça os macronutrientes aproximados (calorias, proteínas, carboidratos, gorduras) em formato JSON.
  
Refeição: "${mealDescription}"
${healthIssues ? `Contexto de saúde do usuário: "${healthIssues}". Se a refeição for prejudicial ou precisar de atenção especial devido a este contexto, mencione no campo 'aiAdvice'.` : ""}

Retorne os macros e dois campos de texto curtos:
1. 'aiComment': Um comentário motivador ou técnico sobre a qualidade nutricional.
2. 'aiAdvice': Um aviso ou conselho específico SE houver algo relevante ao contexto de saúde (opcional).`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
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

    let text = response.text || "{}";
    // Safeguard to strip potential markdown codeblocks out of returned text
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    console.log("AI Meal Response received:", text);
    res.json(JSON.parse(text));
  } catch (error: any) {
    console.error("AI Meal Analysis Error:", error);
    res.status(500).json({ error: error.message || "Falha na análise da IA. Verifique se a API Key está configurada corretamente." });
  }
});

// Endpoint: Generate Report
app.post("/api/ai/generate-report", async (req, res) => {
  console.log("Generating daily report request received");
  try {
    const { profile, meals, workouts, supplements, cardios, date, targets } = req.body;

    const ai = getGeminiClient();

    const dailyTotals = meals.reduce((s: any, m: any) => ({
      cal: s.cal + (m.calories || 0),
      pro: s.pro + (m.protein || 0),
      carb: s.carb + (m.carbs || 0),
      fat: s.fat + (m.fat || 0)
    }), { cal: 0, pro: 0, carb: 0, fat: 0 });

    const activeCardios = cardios.filter((c: any) => c.checks?.[date]);

    const prompt = `Gere uma análise técnica, motivadora e visual para o dia ${date}.
  
Contexto do Usuário:
- Objetivo: ${profile?.goal} (lose = perder gordura/reduzir peso, maintain = manutenção, gain = hipertrofia/ganho de massa)
- Peso: ${profile?.weight}kg | Altura: ${profile?.height}cm | Idade: ${profile?.age}
- Metas Diárias de Ingestão: ${targets.calories}kcal (P:${targets.protein}g, C:${targets.carbs}g, F:${targets.fat}g)
- Consumo Alimentar Real: ${dailyTotals.cal}kcal (P:${Math.round(dailyTotals.pro)}g, C:${Math.round(dailyTotals.carb)}g, F:${Math.round(dailyTotals.fat)}g)

Atividades do Dia:
- Treinos Realizados: ${JSON.stringify(workouts, null, 2)}
- Cardios Concluídos: ${JSON.stringify(activeCardios, null, 2)}
- Hábitos: ${supplements.filter((s: any) => s.checks?.[date]).length}/${supplements.length} suplementos tomados.

Sua tarefa:
1. Estime as calorias gastas com as atividades físicas registradas (treinos de musculação e cardios concluídos). Estime as calorias da musculação com base em exercícios, séries, repetições, e cardios com base na duração (ex: aprox. 6-10 kcal por minuto).
2. Determine se a pessoa se encontra em DÉFICIT CALÓRICO ou SURPLUS/SUPERÁVIT CALÓRICO para o dia de hoje, considerando sua Taxa Metabólica Basal Estimada + Atividades Físicas vs Consumo Alimentar Real.
3. Elabore o relatório explicando se o estado calórico do usuário está alinhado com o Objetivo principal dele (por exemplo, se o objetivo é 'lose' e ele está em déficit, isso é positivo; se o objetivo é 'gain' e está em déficit, explique que precisa comer mais).
4. No campo "analysis", use formatação rica em markdown com subtópicos claros para detalhar a Dieta, Treino (e cardios) e concluir se a pessoa está em Déficit Calórico ou Não e o quanto isso é bom para o Objetivo.

Retorne APENAS um JSON com esta exata estrutura:
{
  "quickSummary": "Uma frase curta de impacto resumindo o dia",
  "scores": {
    "diet": 0-100,
    "training": 0-100,
    "habits": 0-100
  },
  "caloricStatus": "deficit" | "surplus" | "neutral",
  "estimatedExpenditure": number (gasto total estimado do dia incluindo metabolismo basal + treinos),
  "caloricDifference": number (diferença entre alimentos consumidos e gasto total do dia. Se for deficitário, negativo; se for superávit, positivo),
  "analysis": "Texto em português estruturado em markdown concluindo sobre a dieta, listando o gasto calórico estimado das atividades, e fundamentando detalhadamente se a pessoa está em déficit calórico ou não, e o que melhorar.",
  "advice": "Sugestão específica e direta para amanhã",
  "status": "success" | "warning" | "danger" (baseado no desempenho geral contra o objetivo)
}

Seja crítico mas focado em resultados.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    
    let text = response.text || "{}";
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    res.json(JSON.parse(text));
  } catch (error: any) {
    console.error("AI Report Generation Error:", error);
    res.status(500).json({ error: error.message || "Falha na geração do relatório. Verifique a API Key." });
  }
});

// Endpoint: Analyze Workouts
app.post("/api/ai/analyze-workouts", async (req, res) => {
  console.log("Analyzing workouts request received");
  try {
    const { profile, workouts, cardios, date } = req.body;
    const ai = getGeminiClient();

    const prompt = `Analise a rotina de atividades físicas e cardios do usuário para o dia ${date}.
       
Contexto do Usuário:
- Objetivo: ${profile?.goal} (lose = emagrecimento, maintain = manutenção, gain = hipertrofia)
- Peso: ${profile?.weight} kg
- Altura: ${profile?.height} cm
- Idade: ${profile?.age} anos
- Gênero: ${profile?.gender === "male" ? "Masculino" : "Feminino"}

Treinos Realizados (Musculação/Força):
${JSON.stringify(workouts, null, 2)}

Cardios Concluídos:
${JSON.stringify(cardios, null, 2)}

Sua tarefa:
1. Estime com base científica as calorias gastas apenas na Musculação (fortalecimento baseado em carga, séries, repetições, exercícios) e apenas nos Cardios (concluídos com base no tempo de duração).
2. Forneça uma avaliação aprofundada se a seleção de exercícios, séries e repetições de hoje estão ótimos/adequados para o Objetivo do usuário ("Se o treino está bom").
3. Forneça de 2 a 4 recomendações técnicas e conselhos práticos e rápidos para otimizar os resultados físico-mecânicos do treino ou cardio.
4. Forneça um Score do Treino de 0-100.

Retorne APENAS um JSON nesta estrutura:
{
  "caloriesBurned": number (soma de workoutCalories e cardioCalories),
  "workoutCalories": number (estimativa apenas do treino de força),
  "cardioCalories": number (estimativa apenas do cardio),
  "trainingScore": number (nota de 0 a 100 para o treino de hoje),
  "evaluation": "Texto estruturado em markdown em português analisando se o treino tá bom, intensidade, volume, carga e combinação de cardios",
  "recommendations": ["Recomendação 1", "Recomendação 2"]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            caloriesBurned: { type: Type.NUMBER },
            workoutCalories: { type: Type.NUMBER },
            cardioCalories: { type: Type.NUMBER },
            trainingScore: { type: Type.NUMBER },
            evaluation: { type: Type.STRING },
            recommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["caloriesBurned", "workoutCalories", "cardioCalories", "trainingScore", "evaluation", "recommendations"]
        }
      }
    });

    let text = response.text || "{}";
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    console.log("AI Workout Response received:", text);
    res.json(JSON.parse(text));
  } catch (error: any) {
    console.error("AI Workout Analysis Error:", error);
    res.status(500).json({ error: error.message || "Falha na análise dos treinos. Verifique a API Key." });
  }
});

// Endpoint: Analyze Evolution
app.post("/api/ai/analyze-evolution", async (req, res) => {
  console.log("Analyzing evolution request received");
  try {
    const { photos } = req.body;
    const ai = getGeminiClient();

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
      model: "gemini-3.5-flash",
      contents: { parts }
    });
    
    res.json(response.text || "Sem análise disponível.");
  } catch (error: any) {
    console.error("AI Evolution Analysis Error:", error);
    res.status(500).json({ error: error.message || "Falha na análise de evolução. Verifique a API Key." });
  }
});

export default app;
