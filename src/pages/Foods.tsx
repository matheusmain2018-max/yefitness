import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, Plus, Apple, Salad, Flame, Zap, Heart,
  X, Utensils, Sparkles, CheckCircle2, Trash2, Wand2, PlusCircle, Coffee
} from 'lucide-react';
import { db } from '../services/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { UserProfile } from '../types';
import { cn, accentColors, bgAccents } from '../App';

interface Props {
  profile: UserProfile | null;
  user: any;
}

export interface FoodItem {
  id: string;
  name: string;
  category: 'protein' | 'carbs' | 'fats' | 'lowcarb' | 'fruits' | 'supplements' | 'custom';
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  badge: string;
  benefit: string;
  isCustom?: boolean;
}

export const HEALTHY_FOODS_DATABASE: FoodItem[] = [
  // 🥩 PROTEÍNAS MAGRAS
  {
    id: 'p_1',
    name: 'PEITO DE FRANGO GRELHADO',
    category: 'protein',
    portion: '100g',
    calories: 165,
    protein: 31,
    carbs: 0,
    fat: 3.6,
    badge: 'Hipertrofia & Definição',
    benefit: 'A proteína com melhor custo-benefício, altíssimo valor biológico e baixa quantidade de gordura.'
  },
  {
    id: 'p_2',
    name: 'OVO INTEIRO COZIDO / MEXIDO',
    category: 'protein',
    portion: '1 unidade grande (50g)',
    calories: 72,
    protein: 6.3,
    carbs: 0.6,
    fat: 4.8,
    badge: 'Superalimento',
    benefit: 'Rico em colina, vitaminas essenciais e gorduras boas que auxiliam na síntese hormonal.'
  },
  {
    id: 'p_3',
    name: 'PATINHO MOÍDO / GRELHADO',
    category: 'protein',
    portion: '100g',
    calories: 219,
    protein: 35,
    carbs: 0,
    fat: 7.5,
    badge: 'Força & Ferro',
    benefit: 'Corte bovino magro excelente para fornecer creatina natural, ferro e vitamina B12.'
  },
  {
    id: 'p_4',
    name: 'TILÁPIA OU PESCADA GRELHADA',
    category: 'protein',
    portion: '100g',
    calories: 128,
    protein: 26,
    carbs: 0,
    fat: 2.6,
    badge: 'Digestão Leve',
    benefit: 'Proteína extremamente limpa e de rápida absorção, ideal para ceia ou dias de cutting.'
  },
  {
    id: 'p_5',
    name: 'SALMÃO GRELHADO',
    category: 'protein',
    portion: '100g',
    calories: 206,
    protein: 22,
    carbs: 0,
    fat: 13,
    badge: 'Ômega 3 & Anti-inflamatório',
    benefit: 'Rico em ácidos graxos essenciais que melhoram a saúde cardiovascular e recuperação articular.'
  },
  {
    id: 'p_6',
    name: 'CLARA DE OVO PASTEURIZADA / COZIDA',
    category: 'protein',
    portion: '100g (aprox. 3 claras)',
    calories: 52,
    protein: 11,
    carbs: 0.7,
    fat: 0.2,
    badge: 'Proteína Pura',
    benefit: 'Praticamente zero gordura e carboidrato, excelente para aumentar aporte proteico sem calorias extras.'
  },
  {
    id: 'p_7',
    name: 'WHEY PROTEIN CONCENTRADO / ISOLADO',
    category: 'protein',
    portion: '1 scoop (30g)',
    calories: 120,
    protein: 24,
    carbs: 3,
    fat: 1.5,
    badge: 'Pós-Treino Rápido',
    benefit: 'Alta concentração de aminoácidos essenciais e BCAAs para estimulação imediata da síntese proteica.'
  },
  {
    id: 'p_8',
    name: 'IOGURTE NATURAL DESNATADO / GREGO',
    category: 'protein',
    portion: '1 potinho (160g)',
    calories: 85,
    protein: 14,
    carbs: 7,
    fat: 0,
    badge: 'Saúde Intestinal',
    benefit: 'Excelente fonte de probióticos e cálcio, ótimo acompanhamento para frutas e aveia.'
  },
  {
    id: 'p_9',
    name: 'ATUM EM LATA (AO NATURAL / ÁGUA)',
    category: 'protein',
    portion: '1 lata escorrida (120g)',
    calories: 130,
    protein: 29,
    carbs: 0,
    fat: 1.2,
    badge: 'Praticidade & Proteína',
    benefit: 'Pronto para consumo, excelente concentração de proteína magra para lanches rápidos.'
  },
  {
    id: 'p_10',
    name: 'QUEIJO COTTAGE OU RICOTA MAGRA',
    category: 'protein',
    portion: '3 colheres de sopa (100g)',
    calories: 98,
    protein: 12,
    carbs: 3.4,
    fat: 4.1,
    badge: 'Proteína Caseína',
    benefit: 'Queijo de baixo teor de gordura e lenta absorção, perfeito para saciedade prolongada.'
  },
  {
    id: 'p_11',
    name: 'QUEIJO MINAS FRESCAL LIGHT',
    category: 'protein',
    portion: '1 fatia média (30g)',
    calories: 64,
    protein: 5.2,
    carbs: 1.0,
    fat: 4.3,
    badge: 'Cálcio & Leveza',
    benefit: 'Excelente opção para o café da manhã ou tapioca proteica com teor reduzido de sódio.'
  },
  {
    id: 'p_12',
    name: 'LOMBO SUÍNO MAGRO ASSADO',
    category: 'protein',
    portion: '100g',
    calories: 175,
    protein: 28,
    carbs: 0,
    fat: 6.2,
    badge: 'Alternativa Magra',
    benefit: 'Corte suíno extremamente magro, rico em tiamina (Vitamina B1) para energia.'
  },
  {
    id: 'p_13',
    name: 'ALCATRA BOVINA GRELHADA SEM GORDURA',
    category: 'protein',
    portion: '100g',
    calories: 205,
    protein: 32,
    carbs: 0,
    fat: 8.0,
    badge: 'Ferro & Zinco',
    benefit: 'Carne vermelha nobre com excelente teor de ferro heme e creatina endógena.'
  },
  {
    id: 'p_14',
    name: 'CAMARÃO COZIDO / GRELHADO',
    category: 'protein',
    portion: '100g',
    calories: 99,
    protein: 24,
    carbs: 0.2,
    fat: 0.3,
    badge: 'Zero Gordura',
    benefit: 'Fruto do mar com densidade calórica baixíssima e rico em selênio e zinco.'
  },
  {
    id: 'p_15',
    name: 'TOFU GRELHADO (QUEIJO DE SOJA)',
    category: 'protein',
    portion: '100g',
    calories: 76,
    protein: 8.1,
    carbs: 1.9,
    fat: 4.8,
    badge: 'Proteína Vegetal',
    benefit: 'Opção vegana rica em isoflavonas, cálcio e todos os aminoácidos essenciais.'
  },
  {
    id: 'p_16',
    name: 'PEITO DE PERU DEFUMADO / FATIADO',
    category: 'protein',
    portion: '4 fatias (80g)',
    calories: 84,
    protein: 16,
    carbs: 1.0,
    fat: 1.5,
    badge: 'Lanche Rápido',
    benefit: 'Prático para sanduíches integrais e crepiocas fit no pré ou pós-treino.'
  },
  {
    id: 'p_17',
    name: 'SARDINHA EM ÓLEO ESCORRIDA / ASSADA',
    category: 'protein',
    portion: '100g',
    calories: 185,
    protein: 25,
    carbs: 0,
    fat: 9.5,
    badge: 'Ômega 3 Puro',
    benefit: 'Um dos peixes mais ricos em ômega 3, cálcio e vitamina D natural.'
  },
  {
    id: 'p_18',
    name: 'QUEIJO COALHO GRELHADO',
    category: 'protein',
    portion: '1 espeto / fatia (50g)',
    calories: 155,
    protein: 11,
    carbs: 1.2,
    fat: 12,
    badge: 'Sabor & Proteína',
    benefit: 'Ótima fonte de cálcio e energia para refeições pré-treino moderadas.'
  },

  // 🍌 CARBOIDRATOS SAUDÁVEIS / ENERGIA
  {
    id: 'c_1',
    name: 'BANANA PRATA / NANICA',
    category: 'carbs',
    portion: '1 unidade média (100g)',
    calories: 98,
    protein: 1.3,
    carbs: 26,
    fat: 0.3,
    badge: 'Energia & Potássio',
    benefit: 'Energia de excelente digestibilidade, previne cãibras e combina com aveia ou pré-treino.'
  },
  {
    id: 'c_2',
    name: 'AVEIA EM FLOCOS / FARELO',
    category: 'carbs',
    portion: '30g (2 colheres de sopa)',
    calories: 118,
    protein: 4.3,
    carbs: 20,
    fat: 2.2,
    badge: 'Fibras & Saciedade',
    benefit: 'Rica em betaglucanas que auxiliam no controle do colesterol, glicemia e prolongam a saciedade.'
  },
  {
    id: 'c_3',
    name: 'ARROZ BRANCO COZIDO',
    category: 'carbs',
    portion: '100g',
    calories: 130,
    protein: 2.7,
    carbs: 28,
    fat: 0.3,
    badge: 'Energia Limpa',
    benefit: 'Fácil digestão e excelente repositor de glicogênio muscular após treinos intensos.'
  },
  {
    id: 'c_4',
    name: 'BATATA DOCE COZIDA / ASSADA',
    category: 'carbs',
    portion: '100g',
    calories: 86,
    protein: 1.6,
    carbs: 20,
    fat: 0.1,
    badge: 'Baixo Índice Glicêmico',
    benefit: 'Libera energia de forma gradual e constante sem causar picos abruptos de insulina.'
  },
  {
    id: 'c_5',
    name: 'MANDIOCA / AIPIM COZIDO',
    category: 'carbs',
    portion: '100g',
    calories: 125,
    protein: 0.6,
    carbs: 30,
    fat: 0.3,
    badge: 'Energia Natural',
    benefit: 'Carboidrato raiz altamente energético, rico em potássio e fibras minerais naturais.'
  },
  {
    id: 'c_6',
    name: 'PÃO INTEGRAL 100% GRÃOS',
    category: 'carbs',
    portion: '2 fatias (50g)',
    calories: 122,
    protein: 4.5,
    carbs: 22,
    fat: 1.8,
    badge: 'Praticidade no Lanche',
    benefit: 'Boa densidade de fibras e complexos B, ideal com ovos ou queijo para um café da manhã balanceado.'
  },
  {
    id: 'c_7',
    name: 'TAPIOCA GOMADA TRADICIONAL',
    category: 'carbs',
    portion: '50g (3 colheres de sopa)',
    calories: 120,
    protein: 0,
    carbs: 30,
    fat: 0,
    badge: 'Sem Glúten & Rápida',
    benefit: 'Absorção rápida, perfeita quando combinada com uma fonte proteica para energia imediata.'
  },
  {
    id: 'c_8',
    name: 'CUSCUZ DE MILHO NORDESTINO COZIDO',
    category: 'carbs',
    portion: '100g',
    calories: 112,
    protein: 2.5,
    carbs: 25,
    fat: 0.6,
    badge: 'Energia Brasileira',
    benefit: 'Sem glúten, rico em fibras e complexo B, excelente combinação com ovos ou queijo coalho.'
  },
  {
    id: 'c_9',
    name: 'ARROZ INTEGRAL COZIDO',
    category: 'carbs',
    portion: '100g',
    calories: 111,
    protein: 2.6,
    carbs: 23,
    fat: 0.9,
    badge: 'Fibras & Magnésio',
    benefit: 'Conserva o farelo e o gérmen do grão, ajudando na saciedade prolongada.'
  },
  {
    id: 'c_10',
    name: 'MACARRÃO INTEGRAL COZIDO',
    category: 'carbs',
    portion: '100g',
    calories: 124,
    protein: 5.3,
    carbs: 26,
    fat: 0.5,
    badge: 'Carbo Complexo',
    benefit: 'Ótima opção de carboidrato para refeições pré-treino de alta exigência.'
  },
  {
    id: 'c_11',
    name: 'BATATA INGLESA COZIDA / ASSADA',
    category: 'carbs',
    portion: '100g',
    calories: 77,
    protein: 2.0,
    carbs: 17,
    fat: 0.1,
    badge: 'Maior Saciedade por Kcal',
    benefit: 'Um dos alimentos com maior índice de saciedade por caloria, excelente para cutting.'
  },
  {
    id: 'c_12',
    name: 'INHAME COZIDO',
    category: 'carbs',
    portion: '100g',
    calories: 97,
    protein: 1.5,
    carbs: 23,
    fat: 0.2,
    badge: 'Imunidade & Hormônios',
    benefit: 'Rico em diosgenina, ajuda a equilibrar hormônios e fortalece o sistema imunológico.'
  },
  {
    id: 'c_13',
    name: 'MANDIOQUINHA / BATATA BAROA COZIDA',
    category: 'carbs',
    portion: '100g',
    calories: 101,
    protein: 1.0,
    carbs: 24,
    fat: 0.2,
    badge: 'Fácil Digestão',
    benefit: 'Sabor delicado e digestão suave, ideal para repor energia à noite.'
  },
  {
    id: 'c_14',
    name: 'FEIJÃO PRETO / CARIOCA COZIDO',
    category: 'carbs',
    portion: '1 concha média (100g)',
    calories: 76,
    protein: 4.8,
    carbs: 13,
    fat: 0.5,
    badge: 'Ferro & Proteína Vegetal',
    benefit: 'A combinação brasileira perfeita com arroz, fornecendo aminoácidos completos e ferro.'
  },
  {
    id: 'c_15',
    name: 'GRÃO DE BICO COZIDO',
    category: 'carbs',
    portion: '100g',
    calories: 164,
    protein: 8.9,
    carbs: 27,
    fat: 2.6,
    badge: 'Triptofano & Bem-estar',
    benefit: 'Rico em triptofano, ajuda na produção de serotonina para humor e sono de qualidade.'
  },
  {
    id: 'c_16',
    name: 'LENTILHA COZIDA',
    category: 'carbs',
    portion: '100g',
    calories: 116,
    protein: 9.0,
    carbs: 20,
    fat: 0.4,
    badge: 'Ferro & Ácido Fólico',
    benefit: 'Fácil cozimento, excelente fonte de fibras solúveis e proteína vegetal.'
  },
  {
    id: 'c_17',
    name: 'QUINOA COZIDA EM GRÃOS',
    category: 'carbs',
    portion: '100g',
    calories: 120,
    protein: 4.4,
    carbs: 21,
    fat: 1.9,
    badge: 'Grão Completo',
    benefit: 'Considerado um dos cereais mais completos do mundo pela FAO, rico em magnésio.'
  },
  {
    id: 'c_18',
    name: 'GRANOLA INTEGRAL SEM AÇÚCAR',
    category: 'carbs',
    portion: '30g (2 colheres de sopa)',
    calories: 135,
    protein: 3.5,
    carbs: 18,
    fat: 5.0,
    badge: 'Crocância & Fibras',
    benefit: 'Ideal para adicionar textura ao iogurte ou frutas no café da manhã.'
  },
  {
    id: 'c_19',
    name: 'PÃO FRANCÊS / CARECA (TRADICIONAL)',
    category: 'carbs',
    portion: '1 unidade (50g)',
    calories: 135,
    protein: 4.0,
    carbs: 28,
    fat: 1.0,
    badge: 'Energia Imediata',
    benefit: 'Se consumido com uma boa proteína (ovos ou frango), não atrapalha a dieta e traz prazer.'
  },

  // 🥑 GORDURAS BOAS & HORMÔNIOS
  {
    id: 'g_1',
    name: 'ABACATE OU AVOCADO',
    category: 'fats',
    portion: '100g',
    calories: 160,
    protein: 2.0,
    carbs: 9.0,
    fat: 15,
    badge: 'Coração & Saciedade',
    benefit: 'Riquíssimo em gorduras monoinsaturadas, potássio e fitosteróis que regulam hormônios.'
  },
  {
    id: 'g_2',
    name: 'AZEITE DE OLIVA EXTRA VIRGEM',
    category: 'fats',
    portion: '1 colher de sopa (13ml)',
    calories: 119,
    protein: 0,
    carbs: 0,
    fat: 13.5,
    badge: 'Ouro Líquido',
    benefit: 'Poderoso antioxidante e anti-inflamatório natural, ideal para finalizar saladas ou pratos.'
  },
  {
    id: 'g_3',
    name: 'PASTA DE AMENDOIM INTEGRAL 100%',
    category: 'fats',
    portion: '1 colher de sopa (15g)',
    calories: 92,
    protein: 4.2,
    carbs: 3.0,
    fat: 7.5,
    badge: 'Energia Densa',
    benefit: 'Combinação saborosa de gorduras saudáveis e proteína vegetal, perfeita em lanches ou mingau.'
  },
  {
    id: 'g_4',
    name: 'CASTANHA DO PARÁ (BRASIL)',
    category: 'fats',
    portion: '2 unidades (10g)',
    calories: 66,
    protein: 1.4,
    carbs: 1.2,
    fat: 6.6,
    badge: 'Selênio Diário',
    benefit: 'Apenas 2 castanhas garantem 100% da necessidade diária de selênio para a tireoide.'
  },
  {
    id: 'g_5',
    name: 'CASTANHA DE CAJU TORRADA',
    category: 'fats',
    portion: '30g (um punhado)',
    calories: 170,
    protein: 5.2,
    carbs: 9.0,
    fat: 13,
    badge: 'Zinco & Magnésio',
    benefit: 'Excelente fonte de minerais catalisadores para imunidade e síntese de testosterona.'
  },
  {
    id: 'g_6',
    name: 'SEMENTE DE CHIA / LINHAÇA DOURADA',
    category: 'fats',
    portion: '1 colher de sopa (15g)',
    calories: 73,
    protein: 2.5,
    carbs: 6.0,
    fat: 4.5,
    badge: 'Fibras & Ômega 3',
    benefit: 'Forma um gel no estômago que melhora o trânsito intestinal e retarda a sensação de fome.'
  },
  {
    id: 'g_7',
    name: 'NOZES MARIPOSA / CHILENAS',
    category: 'fats',
    portion: '30g (um punhado)',
    calories: 195,
    protein: 4.5,
    carbs: 4.0,
    fat: 19,
    badge: 'Saúde Cerebral',
    benefit: 'Rica em ômega 3 vegetal (ALA) e polifenóis que protegem o sistema nervoso e memória.'
  },
  {
    id: 'g_8',
    name: 'AMÊNDOAS CRUAS / TORRADAS',
    category: 'fats',
    portion: '30g (cerca de 20 un)',
    calories: 172,
    protein: 6.0,
    carbs: 6.0,
    fat: 15,
    badge: 'Vitamina E & Pele',
    benefit: 'Altíssimo teor de vitamina E antioxidante e fibras solúveis para coração e pele.'
  },
  {
    id: 'g_9',
    name: 'CHOCOLATE AMARGO 70% OU MAIS CACAO',
    category: 'fats',
    portion: '2 quadradinhos (20g)',
    calories: 110,
    protein: 1.8,
    carbs: 8.0,
    fat: 8.5,
    badge: 'Antioxidante & Prazer',
    benefit: 'Saciedade para vontade de doce com flavonoides que melhoram o humor e circulação.'
  },
  {
    id: 'g_10',
    name: 'SEMENTE DE ABÓBORA TORRADA SEM SAL',
    category: 'fats',
    portion: '30g',
    calories: 160,
    protein: 9.0,
    carbs: 4.0,
    fat: 13,
    badge: 'Zinco & Sono',
    benefit: 'Uma das maiores fontes vegetais de zinco e magnésio, auxiliando na recuperação muscular.'
  },
  {
    id: 'g_11',
    name: 'ÓLEO DE COCO EXTRA VIRGEM',
    category: 'fats',
    portion: '1 colher de sopa (13ml)',
    calories: 117,
    protein: 0,
    carbs: 0,
    fat: 13,
    badge: 'TCM Rápido',
    benefit: 'Rico em Triglicerídeos de Cadeia Média (TCM), convertidos rapidamente em energia pelo fígado.'
  },
  {
    id: 'g_12',
    name: 'MANTEIGA GHEE CLARIFICADA',
    category: 'fats',
    portion: '1 colher de chá (5g)',
    calories: 45,
    protein: 0,
    carbs: 0,
    fat: 5.0,
    badge: 'Sem Lactose',
    benefit: 'Manteiga purificada, com ponto de fumaça alto para grelhar carnes com sabor natural.'
  },

  // 🥦 LOW CARB, FIBRAS & VEGETAIS
  {
    id: 'l_1',
    name: 'BRÓCOLIS COZIDO / NO VAPOR',
    category: 'lowcarb',
    portion: '100g',
    calories: 35,
    protein: 2.8,
    carbs: 7.0,
    fat: 0.4,
    badge: 'Detox & Vitamina C',
    benefit: 'Rico em sulforafano e fibras, com quantidade mínima de calorias e grande volume no prato.'
  },
  {
    id: 'l_2',
    name: 'ABOBRINHA COZIDA / GRELHADA',
    category: 'lowcarb',
    portion: '100g',
    calories: 17,
    protein: 1.2,
    carbs: 3.0,
    fat: 0.2,
    badge: 'Volume sem Calorias',
    benefit: 'Altíssimo teor de água e minerais, ideal para aumentar o tamanho da refeição sem peso calórico.'
  },
  {
    id: 'l_3',
    name: 'ESPINAFRE / COUVE REFOGADA',
    category: 'lowcarb',
    portion: '100g',
    calories: 23,
    protein: 2.9,
    carbs: 3.6,
    fat: 0.4,
    badge: 'Ferro & Clorofila',
    benefit: 'Carregado de antioxidantes, cálcio e ácido fólico para circulação e revigoramento.'
  },
  {
    id: 'l_4',
    name: 'PEPINO COM CASCA',
    category: 'lowcarb',
    portion: '100g',
    calories: 15,
    protein: 0.7,
    carbs: 3.6,
    fat: 0.1,
    badge: 'Hidratação & Leveza',
    benefit: 'Praticamente 95% água, excelente para beliscar à vontade sem prejudicar o déficit calórico.'
  },
  {
    id: 'l_5',
    name: 'MORANGO FRESCO / MIRTILO (BERRIES)',
    category: 'lowcarb',
    portion: '100g (cerca de 8 morangos)',
    calories: 32,
    protein: 0.7,
    carbs: 7.7,
    fat: 0.3,
    badge: 'Low Carb Fruta',
    benefit: 'Uma das frutas com menor carga glicêmica e menor caloria, riquíssima em antioxidantes.'
  },
  {
    id: 'l_6',
    name: 'COUVE-FLOR COZIDA / RICE DE COUVE',
    category: 'lowcarb',
    portion: '100g',
    calories: 25,
    protein: 1.9,
    carbs: 5.0,
    fat: 0.3,
    badge: 'Substituto Low Carb',
    benefit: 'Pode ser usada como "arroz" low carb ou purê fit com baixíssimas calorias.'
  },
  {
    id: 'l_7',
    name: 'TOMATE ITALIANO / CEREJA',
    category: 'lowcarb',
    portion: '100g',
    calories: 18,
    protein: 0.9,
    carbs: 3.9,
    fat: 0.2,
    badge: 'Licopeno',
    benefit: 'Rico em licopeno, antioxidante essencial que combate o envelhecimento celular.'
  },
  {
    id: 'l_8',
    name: 'ALFACE CRESPA / AMERICANA / ROXA',
    category: 'lowcarb',
    portion: 'À vontade (100g)',
    calories: 14,
    protein: 1.3,
    carbs: 2.2,
    fat: 0.2,
    badge: 'Caloria Zero Prática',
    benefit: 'Proporciona mastigação e volume no prato praticamente sem impacto calórico.'
  },
  {
    id: 'l_9',
    name: 'CENOURA CRUA RALADA / COZIDA',
    category: 'lowcarb',
    portion: '100g',
    calories: 41,
    protein: 0.9,
    carbs: 9.5,
    fat: 0.2,
    badge: 'Betacaroteno & Visão',
    benefit: 'Excelente para a saúde da pele, visão e digestão diária com textura crocante.'
  },
  {
    id: 'l_10',
    name: 'BETERRABA COZIDA / CRUA RALADA',
    category: 'lowcarb',
    portion: '100g',
    calories: 44,
    protein: 1.6,
    carbs: 10,
    fat: 0.1,
    badge: 'Óxido Nítrico & Pump',
    benefit: 'Precursora natural de óxido nítrico, melhora a vasodilatação e rendimento nos treinos.'
  },
  {
    id: 'l_11',
    name: 'ASPÁRGOS GRELHADOS',
    category: 'lowcarb',
    portion: '100g',
    calories: 20,
    protein: 2.2,
    carbs: 3.8,
    fat: 0.1,
    badge: 'Diurético Natural',
    benefit: 'Rico em asparagina, auxilia o corpo a eliminar retenção líquida com facilidade.'
  },
  {
    id: 'l_12',
    name: 'COGUMELOS CHAMPIGNON / SHIMEJI / SHIITAKE',
    category: 'lowcarb',
    portion: '100g',
    calories: 28,
    protein: 3.1,
    carbs: 4.1,
    fat: 0.3,
    badge: 'Umami & Baixa Caloria',
    benefit: 'Rico em ergotionina, excelente textura e sabor para pratos quentes magros.'
  },
  {
    id: 'l_13',
    name: 'BERINJELA GRELHADA / ASSADA',
    category: 'lowcarb',
    portion: '100g',
    calories: 25,
    protein: 1.0,
    carbs: 5.8,
    fat: 0.2,
    badge: 'Absorvedora de Sabor',
    benefit: 'Ajuda a equilibrar o colesterol e é perfeita para lasanhas de berinjela low carb.'
  },
  {
    id: 'l_14',
    name: 'CHUCHU COZIDO / REFOGADO',
    category: 'lowcarb',
    portion: '100g',
    calories: 19,
    protein: 0.8,
    carbs: 4.5,
    fat: 0.1,
    badge: 'Hidratação & Leveza',
    benefit: 'Excelente para saladas frias e refogados sem adicionar calorias à refeição.'
  },

  // 🍎 FRUTAS & ANTIOXIDANTES
  {
    id: 'f_1',
    name: 'MAÇÃ COM CASCA (GALA / FUJI)',
    category: 'fruits',
    portion: '1 unidade média (130g)',
    calories: 68,
    protein: 0.3,
    carbs: 18,
    fat: 0.2,
    badge: 'Pectina & Saciedade',
    benefit: 'Rica em pectina na casca, ajuda a controlar a glicose e limpa o paladar entre refeições.'
  },
  {
    id: 'f_2',
    name: 'MAMÃO PAPAYA / FORMOSA',
    category: 'fruits',
    portion: '1 fatia média (150g)',
    calories: 65,
    protein: 0.8,
    carbs: 16,
    fat: 0.2,
    badge: 'Digestão Perfeita',
    benefit: 'Contém papaína, enzima natural que ajuda muito a digerir carnes e melhora o trânsito intestinal.'
  },
  {
    id: 'f_3',
    name: 'ABACAXI EM FATIAS',
    category: 'fruits',
    portion: '1 fatia espessa (100g)',
    calories: 50,
    protein: 0.5,
    carbs: 13,
    fat: 0.1,
    badge: 'Bromelaina Anti-inchaço',
    benefit: 'Rico em bromelaina, excelente para combater retenção de líquidos e auxiliar a digestão.'
  },
  {
    id: 'f_4',
    name: 'KIWI FRESCO',
    category: 'fruits',
    portion: '1 unidade (75g)',
    calories: 46,
    protein: 0.8,
    carbs: 11,
    fat: 0.4,
    badge: 'Imunidade & Sono',
    benefit: 'Tem o triplo de vitamina C de uma laranja e ajuda naturalmente no relaxamento para dormir.'
  },
  {
    id: 'f_5',
    name: 'MELANCIA / MELÃO CANTALOUPE',
    category: 'fruits',
    portion: '1 fatia grande (200g)',
    calories: 60,
    protein: 1.2,
    carbs: 15,
    fat: 0.3,
    badge: 'Citrulina & Refrescância',
    benefit: 'A melancia contém citrulina que dilata vasos sanguíneos e reduz dores musculares.'
  },
  {
    id: 'f_6',
    name: 'MANGA PALMER / TOMMY',
    category: 'fruits',
    portion: '100g',
    calories: 60,
    protein: 0.8,
    carbs: 15,
    fat: 0.4,
    badge: 'Energia Tropical',
    benefit: 'Rica em betacaroteno e vitamina A, deliciosa como pré-treino rápido.'
  },
  {
    id: 'f_7',
    name: 'UVA VERDE / ROXA SEM SEMENTE',
    category: 'fruits',
    portion: '1 cacho pequeno (100g)',
    calories: 69,
    protein: 0.7,
    carbs: 17,
    fat: 0.2,
    badge: 'Resveratrol',
    benefit: 'Excelente fonte de antioxidantes protetores cardíacos com açúcar natural rápido.'
  },
  {
    id: 'f_8',
    name: 'LARANJA PERA / LIMA / SUCO NATURAL',
    category: 'fruits',
    portion: '1 unidade (130g)',
    calories: 62,
    protein: 1.2,
    carbs: 15,
    fat: 0.2,
    badge: 'Vitamina C Cítrica',
    benefit: 'Aumenta a imunidade e auxilia na absorção do ferro das refeições proteicas.'
  },
  {
    id: 'f_9',
    name: 'AÇAÍ PURO POLPA SEM XAROPE',
    category: 'fruits',
    portion: '100g',
    calories: 65,
    protein: 1.0,
    carbs: 6.0,
    fat: 4.5,
    badge: 'Antocianinas Raras',
    benefit: 'O verdadeiro açaí sem açúcar é baixo em carboidratos e riquíssimo em antioxidantes amazônicos.'
  },
  {
    id: 'f_10',
    name: 'GOIABA VERMELHA',
    category: 'fruits',
    portion: '1 unidade (100g)',
    calories: 54,
    protein: 1.5,
    carbs: 13,
    fat: 0.4,
    badge: 'Super Vitamina C',
    benefit: 'Uma das frutas com maior teor de vitamina C e fibras solúveis para o intestino.'
  },

  // ⚡ SUPLEMENTOS & LANCHES RÁPIDOS
  {
    id: 's_1',
    name: 'CREATINA MONOHIDRATADA PURA',
    category: 'supplements',
    portion: '1 scoop / medidor (5g)',
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    badge: 'Força & ATP',
    benefit: 'O suplemento mais estudado da ciência: aumenta força, massa magra e explosão muscular.'
  },
  {
    id: 's_2',
    name: 'BARRA DE PROTEÍNA ZERO AÇÚCAR',
    category: 'supplements',
    portion: '1 barra (50g)',
    calories: 180,
    protein: 18,
    carbs: 15,
    fat: 6.0,
    badge: 'Praticidade Urbana',
    benefit: 'Ideal para ter na bolsa ou carro quando não houver tempo de preparar uma refeição sólida.'
  },
  {
    id: 's_3',
    name: 'CAFÉ PRETO OU CHÁ VERDE SEM AÇÚCAR',
    category: 'supplements',
    portion: '1 xícara (200ml)',
    calories: 2,
    protein: 0,
    carbs: 0,
    fat: 0,
    badge: 'Termogênico Natural',
    benefit: 'Estimulante natural de cafeína que acelera o metabolismo e foco sem somar calorias.'
  },
  {
    id: 's_4',
    name: 'CREPIOCA FIT (1 OVO + 2 CS TAPIOCA)',
    category: 'supplements',
    portion: '1 unidade grande (90g)',
    calories: 155,
    protein: 7.5,
    carbs: 20,
    fat: 5.0,
    badge: 'Receita Prática',
    benefit: 'Equilíbrio ideal de carboidrato rápido com proteína para o pré ou pós-treino.'
  },
  {
    id: 's_5',
    name: 'MINGAU DE AVEIA COM WHEY',
    category: 'supplements',
    portion: '1 tigela média (250g)',
    calories: 260,
    protein: 28,
    carbs: 26,
    fat: 4.0,
    badge: 'Refeição Completa',
    benefit: 'Combinação perfeita de carboidrato de baixo IG com proteína de rápida absorção.'
  }
];

export default function Foods({ profile, user }: Props) {
  const themeKey = (profile?.theme || 'neon-red') as keyof typeof accentColors;
  const accentClass = accentColors[themeKey];
  const bgAccentClass = bgAccents[themeKey];

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Infinite display limit state so it renders smoothly
  const [visibleCount, setVisibleCount] = useState(30);

  // Custom user foods from Firestore
  const [customUserFoods, setCustomUserFoods] = useState<FoodItem[]>([]);

  // Custom Diet Plan meals state for the Modal
  const [customMeals, setCustomMeals] = useState<{ id: string; name: string }[]>([
    { id: 'meal_1', name: 'Café da Manhã' },
    { id: 'meal_2', name: 'Almoço' },
    { id: 'meal_3', name: 'Lanche / Pré-treino' },
    { id: 'meal_4', name: 'Jantar' }
  ]);
  const [selectedFoodForModal, setSelectedFoodForModal] = useState<FoodItem | null>(null);
  const [customQuantity, setCustomQuantity] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Create New Food modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreatingFood, setIsCreatingFood] = useState(false);
  const [newFoodForm, setNewFoodForm] = useState({
    name: '',
    category: 'protein' as 'protein' | 'carbs' | 'fats' | 'lowcarb' | 'fruits' | 'supplements',
    portion: '100g',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    badge: 'Personalizado',
    benefit: 'Alimento cadastrado pelo usuário na sua lista infinita.'
  });

  // Load user's actual custom diet meals & custom foods list if present
  useEffect(() => {
    if (!user) return;

    const loadUserData = async () => {
      try {
        // 1. Load custom diet meals
        const planRef = doc(db, 'users', user.uid, 'custom_diet_plan', 'default');
        const snap = await getDoc(planRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.meals && Array.isArray(data.meals) && data.meals.length > 0) {
            setCustomMeals(
              data.meals.map((m: any) => ({
                id: m.id || String(Math.random()),
                name: m.name || 'Refeição'
              }))
            );
          }
        }

        // 2. Load custom created foods
        const customFoodsRef = doc(db, 'users', user.uid, 'custom_foods_list', 'default');
        const foodsSnap = await getDoc(customFoodsRef);
        if (foodsSnap.exists()) {
          const data = foodsSnap.data();
          if (data.items && Array.isArray(data.items)) {
            setCustomUserFoods(data.items);
          }
        }
      } catch (err) {
        console.error('Erro ao carregar dados do usuário:', err);
      }
    };

    loadUserData();
  }, [user]);

  // Combined database: built-in + user custom foods
  const allFoods = useMemo(() => {
    return [...customUserFoods, ...HEALTHY_FOODS_DATABASE];
  }, [customUserFoods]);

  // Categories list
  const categories = [
    { id: 'all', label: 'Todos os Alimentos', icon: Utensils },
    { id: 'custom', label: 'Meus Alimentos', icon: Sparkles },
    { id: 'protein', label: 'Proteínas', icon: Flame },
    { id: 'carbs', label: 'Carboidratos', icon: Zap },
    { id: 'fats', label: 'Gorduras Boas', icon: Heart },
    { id: 'lowcarb', label: 'Low Carb & Fibras', icon: Salad },
    { id: 'fruits', label: 'Frutas', icon: Apple },
    { id: 'supplements', label: 'Suplementos & Bebidas', icon: Coffee }
  ];

  // Filtered list
  const filteredFoods = useMemo(() => {
    return allFoods.filter(item => {
      const matchCategory =
        activeCategory === 'all' ||
        (activeCategory === 'custom' && item.isCustom) ||
        item.category === activeCategory;

      const matchSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.badge.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.benefit.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [allFoods, activeCategory, searchQuery]);

  // Reset pagination when filter or search changes
  useEffect(() => {
    setVisibleCount(30);
  }, [activeCategory, searchQuery]);

  // Handle open modal
  const handleOpenAddModal = (food: FoodItem) => {
    setSelectedFoodForModal(food);
    setCustomQuantity(food.portion);
  };

  // Add food item to user's Custom Diet Plan in Firestore
  const handleAddToMeal = async (mealId: string, mealName: string) => {
    if (!user || !selectedFoodForModal) return;
    setIsAdding(true);
    try {
      const planRef = doc(db, 'users', user.uid, 'custom_diet_plan', 'default');
      const snap = await getDoc(planRef);

      let currentPlan: any = {
        userId: user.uid,
        title: 'Minha Dieta Personalizada',
        meals: [
          { id: 'meal_1', name: 'Café da Manhã', time: '08:00', items: [] },
          { id: 'meal_2', name: 'Almoço', time: '12:30', items: [] },
          { id: 'meal_3', name: 'Lanche / Pré-treino', time: '16:30', items: [] },
          { id: 'meal_4', name: 'Jantar', time: '20:30', items: [] }
        ]
      };

      if (snap.exists()) {
        currentPlan = snap.data();
      }

      // Check if meal exists in currentPlan
      const mealIndex = currentPlan.meals.findIndex((m: any) => m.id === mealId);
      const newFoodItem = {
        id: 'item_' + Date.now(),
        name: selectedFoodForModal.name,
        quantity: customQuantity || selectedFoodForModal.portion,
        calories: selectedFoodForModal.calories,
        protein: selectedFoodForModal.protein,
        carbs: selectedFoodForModal.carbs,
        fat: selectedFoodForModal.fat
      };

      if (mealIndex >= 0) {
        currentPlan.meals[mealIndex].items = [
          ...(currentPlan.meals[mealIndex].items || []),
          newFoodItem
        ];
      } else {
        currentPlan.meals.push({
          id: mealId,
          name: mealName,
          items: [newFoodItem]
        });
      }

      currentPlan.updatedAt = serverTimestamp();
      await setDoc(planRef, currentPlan, { merge: true });

      // Show success toast
      setToastMessage(`✅ ${selectedFoodForModal.name} adicionado ao seu ${mealName}!`);
      setTimeout(() => setToastMessage(null), 4000);
      setSelectedFoodForModal(null);
    } catch (err) {
      console.error('Erro ao adicionar alimento à dieta:', err);
    } finally {
      setIsAdding(false);
    }
  };

  // Save a custom food to Firestore
  const handleSaveCustomFood = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newFoodForm.name.trim()) return;

    setIsCreatingFood(true);
    try {
      const newFood: FoodItem = {
        id: 'custom_' + Date.now(),
        name: newFoodForm.name.toUpperCase().trim(),
        category: newFoodForm.category,
        portion: newFoodForm.portion.trim() || '100g',
        calories: Number(newFoodForm.calories) || 0,
        protein: Number(newFoodForm.protein) || 0,
        carbs: Number(newFoodForm.carbs) || 0,
        fat: Number(newFoodForm.fat) || 0,
        badge: newFoodForm.badge.trim() || 'Personalizado',
        benefit: newFoodForm.benefit.trim() || 'Alimento cadastrado na sua lista personalizada.',
        isCustom: true
      };

      const updatedList = [newFood, ...customUserFoods];
      setCustomUserFoods(updatedList);

      const customFoodsRef = doc(db, 'users', user.uid, 'custom_foods_list', 'default');
      await setDoc(customFoodsRef, { items: updatedList, updatedAt: serverTimestamp() }, { merge: true });

      setToastMessage(`🎉 Alimento "${newFood.name}" cadastrado com sucesso!`);
      setTimeout(() => setToastMessage(null), 4000);

      setIsCreateModalOpen(false);
      setNewFoodForm({
        name: '',
        category: 'protein',
        portion: '100g',
        calories: '',
        protein: '',
        carbs: '',
        fat: '',
        badge: 'Personalizado',
        benefit: 'Alimento cadastrado pelo usuário na sua lista infinita.'
      });
    } catch (err) {
      console.error('Erro ao salvar alimento personalizado:', err);
    } finally {
      setIsCreatingFood(false);
    }
  };

  // Delete a custom food
  const handleDeleteCustomFood = async (foodId: string, foodName: string) => {
    if (!user) return;
    try {
      const updatedList = customUserFoods.filter(f => f.id !== foodId);
      setCustomUserFoods(updatedList);

      const customFoodsRef = doc(db, 'users', user.uid, 'custom_foods_list', 'default');
      await setDoc(customFoodsRef, { items: updatedList, updatedAt: serverTimestamp() }, { merge: true });

      setToastMessage(`🗑️ "${foodName}" foi removido da sua lista.`);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      console.error('Erro ao deletar alimento:', err);
    }
  };

  // Smart macro estimator based on common keywords
  const handleEstimateMacros = () => {
    const query = newFoodForm.name.toLowerCase();
    let est = { cal: 150, p: 10, c: 15, f: 5, category: 'protein' as any, badge: 'Estimado' };

    if (query.includes('frango') || query.includes('carne') || query.includes('bife') || query.includes('peixe') || query.includes('whey')) {
      est = { cal: 160, p: 28, c: 0, f: 4, category: 'protein', badge: 'Alta Proteína' };
    } else if (query.includes('arroz') || query.includes('batata') || query.includes('pão') || query.includes('tapioca') || query.includes('macarrão') || query.includes('cuscuz')) {
      est = { cal: 130, p: 3, c: 27, f: 1, category: 'carbs', badge: 'Energia' };
    } else if (query.includes('queijo') || query.includes('ovo') || query.includes('iogurte') || query.includes('leite')) {
      est = { cal: 110, p: 12, c: 3, f: 6, category: 'protein', badge: 'Laticínios & Ovos' };
    } else if (query.includes('abacate') || query.includes('castanha') || query.includes('amendoim') || query.includes('azeite') || query.includes('óleo')) {
      est = { cal: 180, p: 5, c: 6, f: 15, category: 'fats', badge: 'Gordura Boa' };
    } else if (query.includes('salada') || query.includes('brócolis') || query.includes('couve') || query.includes('legume') || query.includes('tomate') || query.includes('pepino')) {
      est = { cal: 25, p: 2, c: 5, f: 0, category: 'lowcarb', badge: 'Low Carb' };
    } else if (query.includes('banana') || query.includes('maçã') || query.includes('morango') || query.includes('açaí') || query.includes('fruta') || query.includes('suco')) {
      est = { cal: 75, p: 1, c: 18, f: 0, category: 'fruits', badge: 'Fruta Natural' };
    } else if (query.includes('barra') || query.includes('shake') || query.includes('creatina') || query.includes('café') || query.includes('chá')) {
      est = { cal: 140, p: 15, c: 12, f: 4, category: 'supplements', badge: 'Suplemento' };
    }

    setNewFoodForm(prev => ({
      ...prev,
      category: est.category,
      badge: prev.badge === 'Personalizado' ? est.badge : prev.badge,
      calories: String(est.cal),
      protein: String(est.p),
      carbs: String(est.c),
      fat: String(est.f)
    }));
  };

  const displayedFoods = filteredFoods.slice(0, visibleCount);

  return (
    <div className="space-y-8 pb-28 relative">
      {/* Success Notification Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-zinc-900 border border-red-500/50 text-white px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3"
          >
            <CheckCircle2 className="w-5 h-5 text-red-400 shrink-0" />
            <span className="text-sm font-bold">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header & Cadastrar Alimento Button */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className={cn("px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest text-black", bgAccentClass)}>
              Guia Nutricional & Infinito
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-zinc-900 border border-zinc-800 text-zinc-300">
              {allFoods.length} Alimentos Disponíveis
            </span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-black tracking-tight text-white">
            Alimentos & Macros
          </h2>
          <p className="text-zinc-400 text-sm mt-1 max-w-xl">
            Catálogo completo de calorias, carboidratos, proteínas e gorduras. E agora você pode <strong className="text-white">cadastrar infinitos alimentos</strong> na sua lista pessoal!
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className={cn(
            "px-5 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all text-black shadow-lg hover:scale-105",
            bgAccentClass
          )}
        >
          <PlusCircle className="w-5 h-5" />
          <span>+ Cadastrar Alimento</span>
        </button>
      </div>

      {/* Category Tabs & Search Bar */}
      <div className="space-y-4">
        {/* Sub-tabs categories */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map(cat => {
            const Icon = cat.icon;
            const isSelected = activeCategory === cat.id;
            const isCustomTab = cat.id === 'custom';
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 whitespace-nowrap transition-all shrink-0",
                  isSelected
                    ? cn(bgAccentClass, "text-black shadow-lg")
                    : isCustomTab && customUserFoods.length > 0
                    ? "bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20"
                    : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{cat.label}</span>
                {isCustomTab && customUserFoods.length > 0 && (
                  <span className="bg-red-500 text-black px-1.5 py-0.5 rounded-full text-[10px] font-black">
                    {customUserFoods.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por alimento, benefício ou categoria (ex: Cuscuz, Whey, Frango, Tapioca, Low Carb...)"
            className="w-full bg-zinc-900/90 border border-zinc-800 focus:border-red-500/60 pl-11 pr-4 py-3.5 rounded-2xl text-sm text-white placeholder-zinc-500 outline-none transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-zinc-400 hover:text-white rounded-xl"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Food Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {displayedFoods.map(food => (
          <div
            key={food.id}
            className={cn(
              "bg-zinc-900/90 border p-5 rounded-3xl flex flex-col justify-between space-y-4 transition-all shadow-lg group relative",
              food.isCustom
                ? "border-red-500/30 hover:border-red-500 bg-gradient-to-b from-red-500/5 to-zinc-900"
                : "border-zinc-800/80 hover:border-zinc-700"
            )}
          >
            {/* Top section: Badge + Name */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20">
                    {food.badge}
                  </span>
                  {food.isCustom && (
                    <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      Meu Alimento
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-400">
                    {food.portion}
                  </span>
                  {food.isCustom && (
                    <button
                      type="button"
                      onClick={() => handleDeleteCustomFood(food.id, food.name)}
                      title="Remover meu alimento"
                      className="p-1.5 text-zinc-500 hover:text-red-400 rounded-lg hover:bg-zinc-800 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <h3 className="text-lg font-black text-white group-hover:text-red-400 transition-colors">
                {food.name}
              </h3>

              <p className="text-xs text-zinc-300 leading-relaxed font-medium">
                {food.benefit}
              </p>
            </div>

            {/* Middle section: Macros Pill Bar */}
            <div className="bg-zinc-950 p-3 rounded-2xl border border-zinc-800 grid grid-cols-4 gap-2 text-center">
              <div>
                <span className="text-[10px] font-bold text-zinc-500 uppercase block">Calorias</span>
                <span className="text-sm font-black text-white font-mono">
                  {food.calories} <span className="text-[10px] text-zinc-400">kcal</span>
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-zinc-500 uppercase block">Carbo</span>
                <span className="text-sm font-black text-amber-400 font-mono">
                  {food.carbs}g
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-zinc-500 uppercase block">Proteína</span>
                <span className="text-sm font-black text-emerald-400 font-mono">
                  {food.protein}g
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-zinc-500 uppercase block">Gordura</span>
                <span className="text-sm font-black text-blue-400 font-mono">
                  {food.fat}g
                </span>
              </div>
            </div>

            {/* Bottom button: Add to My Diet */}
            <button
              type="button"
              onClick={() => handleOpenAddModal(food)}
              className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-zinc-950 hover:bg-red-500/10 text-zinc-300 hover:text-red-400 border border-zinc-800 hover:border-red-500/30 transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4 text-red-400" />
              <span>Colocar na minha dieta</span>
            </button>
          </div>
        ))}

        {filteredFoods.length === 0 && (
          <div className="col-span-full py-16 text-center bg-zinc-900/50 border border-zinc-800/60 rounded-3xl space-y-4">
            <Salad className="w-12 h-12 text-zinc-600 mx-auto" />
            <p className="text-zinc-400 text-sm font-medium">
              Nenhum alimento encontrado para "{searchQuery}".
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setActiveCategory('all'); }}
                className="px-4 py-2 rounded-xl text-xs bg-zinc-800 text-white font-bold hover:bg-zinc-700"
              >
                Ver todos ({allFoods.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewFoodForm(prev => ({ ...prev, name: searchQuery.toUpperCase() }));
                  setIsCreateModalOpen(true);
                }}
                className={cn("px-4 py-2 rounded-xl text-xs text-black font-black flex items-center gap-1.5", bgAccentClass)}
              >
                <PlusCircle className="w-4 h-4" />
                <span>Cadastrar "{searchQuery}" Agora</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Load More Button */}
      {visibleCount < filteredFoods.length && (
        <div className="flex justify-center pt-4">
          <button
            type="button"
            onClick={() => setVisibleCount(prev => prev + 30)}
            className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white font-bold px-8 py-3.5 rounded-2xl text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg hover:scale-105"
          >
            <span>Carregar mais alimentos ({filteredFoods.length - visibleCount} restantes)</span>
          </button>
        </div>
      )}

      {/* MODAL 1: Cadastrar Novo Alimento (Infinite Custom Foods) */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative z-10 w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div>
                  <span className="text-[10px] font-black uppercase text-red-400 tracking-wider">
                    Infinito • Sua Lista Pessoal
                  </span>
                  <h3 className="text-xl font-black text-white">
                    Cadastrar Novo Alimento
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveCustomFood} className="space-y-4">
                {/* Nome e Botão Estimar com IA */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-zinc-300">
                      Nome do Alimento *
                    </label>
                    <button
                      type="button"
                      onClick={handleEstimateMacros}
                      title="Preencher calorias e macros automaticamente"
                      className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20"
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      <span>Estimar Nutrientes ✨</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={newFoodForm.name}
                    onChange={(e) => setNewFoodForm({ ...newFoodForm, name: e.target.value })}
                    placeholder="Ex: Cuscuz com Ovo, Shake Whey de Morango, Pão de Queijo..."
                    className="w-full bg-zinc-950 border border-zinc-800 px-4 py-3 rounded-2xl text-sm text-white focus:border-red-500/60 outline-none"
                  />
                </div>

                {/* Categoria e Porção */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-300 block">
                      Categoria *
                    </label>
                    <select
                      value={newFoodForm.category}
                      onChange={(e) => setNewFoodForm({ ...newFoodForm, category: e.target.value as any })}
                      className="w-full bg-zinc-950 border border-zinc-800 px-4 py-3 rounded-2xl text-xs text-white focus:border-red-500/60 outline-none"
                    >
                      <option value="protein">Proteína Magra</option>
                      <option value="carbs">Carboidrato / Energia</option>
                      <option value="fats">Gordura Boa</option>
                      <option value="lowcarb">Low Carb & Fibras</option>
                      <option value="fruits">Fruta</option>
                      <option value="supplements">Suplemento / Bebida</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-300 block">
                      Porção (ex: 100g, 1 un)
                    </label>
                    <input
                      type="text"
                      value={newFoodForm.portion}
                      onChange={(e) => setNewFoodForm({ ...newFoodForm, portion: e.target.value })}
                      placeholder="100g"
                      className="w-full bg-zinc-950 border border-zinc-800 px-4 py-3 rounded-2xl text-xs text-white focus:border-red-500/60 outline-none"
                    />
                  </div>
                </div>

                {/* Macros (Calorias, Carbo, Proteína, Gordura) */}
                <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-3">
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">
                    Valores Nutricionais da Porção
                  </span>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-zinc-400 block">
                        Calorias (kcal)
                      </label>
                      <input
                        type="number"
                        value={newFoodForm.calories}
                        onChange={(e) => setNewFoodForm({ ...newFoodForm, calories: e.target.value })}
                        placeholder="0"
                        className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-xl text-xs text-white focus:border-red-500 outline-none text-center font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-amber-400 block">
                        Carbo (g)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={newFoodForm.carbs}
                        onChange={(e) => setNewFoodForm({ ...newFoodForm, carbs: e.target.value })}
                        placeholder="0"
                        className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-xl text-xs text-amber-400 focus:border-amber-500 outline-none text-center font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-emerald-400 block">
                        Proteína (g)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={newFoodForm.protein}
                        onChange={(e) => setNewFoodForm({ ...newFoodForm, protein: e.target.value })}
                        placeholder="0"
                        className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-xl text-xs text-emerald-400 focus:border-emerald-500 outline-none text-center font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-blue-400 block">
                        Gordura (g)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={newFoodForm.fat}
                        onChange={(e) => setNewFoodForm({ ...newFoodForm, fat: e.target.value })}
                        placeholder="0"
                        className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-xl text-xs text-blue-400 focus:border-blue-500 outline-none text-center font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Badge e Benefício */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-300 block">
                    Tag / Destaque (ex: Pré-treino, Favorito, Caseiro)
                  </label>
                  <input
                    type="text"
                    value={newFoodForm.badge}
                    onChange={(e) => setNewFoodForm({ ...newFoodForm, badge: e.target.value })}
                    placeholder="Favorito"
                    className="w-full bg-zinc-950 border border-zinc-800 px-4 py-2.5 rounded-2xl text-xs text-white focus:border-red-500/60 outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-300 block">
                    Benefício / Observação
                  </label>
                  <input
                    type="text"
                    value={newFoodForm.benefit}
                    onChange={(e) => setNewFoodForm({ ...newFoodForm, benefit: e.target.value })}
                    placeholder="Por que este alimento é ótimo para a sua dieta?"
                    className="w-full bg-zinc-950 border border-zinc-800 px-4 py-2.5 rounded-2xl text-xs text-white focus:border-red-500/60 outline-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="w-1/2 py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingFood}
                    className={cn(
                      "w-1/2 py-3 rounded-2xl font-black text-xs uppercase tracking-wider text-black transition-all shadow-lg",
                      bgAccentClass,
                      isCreatingFood && "opacity-50"
                    )}
                  >
                    {isCreatingFood ? 'Salvando...' : 'Salvar Alimento ⚡'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Adicionar alimento na refeição do dia */}
      <AnimatePresence>
        {selectedFoodForModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedFoodForModal(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative z-10 w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div>
                  <span className="text-[10px] font-black uppercase text-red-400 tracking-wider">
                    Adicionar à Minha Dieta
                  </span>
                  <h3 className="text-lg font-black text-white">
                    {selectedFoodForModal.name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedFoodForModal(null)}
                  className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-300 block">
                  Porção / Quantidade
                </label>
                <input
                  type="text"
                  value={customQuantity}
                  onChange={(e) => setCustomQuantity(e.target.value)}
                  placeholder="Ex: 100g, 1 unidade, 2 colheres..."
                  className="w-full bg-zinc-950 border border-zinc-800 px-4 py-2.5 rounded-2xl text-sm text-white focus:border-red-500/60 outline-none"
                />
              </div>

              <div className="space-y-2.5">
                <label className="text-xs font-bold text-zinc-300 block">
                  Em qual refeição deseja colocar?
                </label>
                <div className="space-y-2">
                  {customMeals.map((meal) => (
                    <button
                      key={meal.id}
                      type="button"
                      disabled={isAdding}
                      onClick={() => handleAddToMeal(meal.id, meal.name)}
                      className="w-full bg-zinc-950 hover:bg-red-500/10 border border-zinc-800 hover:border-red-500/30 p-3.5 rounded-2xl flex items-center justify-between transition-all group"
                    >
                      <span className="text-sm font-bold text-zinc-200 group-hover:text-white">
                        {meal.name}
                      </span>
                      <div className="w-7 h-7 rounded-xl bg-zinc-900 group-hover:bg-red-500 flex items-center justify-center transition-colors">
                        <Plus className="w-4 h-4 text-zinc-400 group-hover:text-black" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedFoodForModal(null)}
                  className="w-full py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-all"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
