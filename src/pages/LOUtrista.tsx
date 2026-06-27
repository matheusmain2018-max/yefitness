import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, Sparkles, Trash2, Apple, ChevronRight, HelpCircle, Check, 
  ArrowRight, RefreshCw, Layers, Calendar, Flame, AlertCircle, Info 
} from 'lucide-react';
import { db, auth } from '../services/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, getDocs, writeBatch } from 'firebase/firestore';
import { sendLOUtristaMessage } from '../services/gemini';
import { NutriMessage, NutriPanel, UserProfile } from '../types';
import ReactMarkdown from 'react-markdown';
import { 
  accentColors, bgAccents, shadowAccents, cn, ringAccents, 
  hoverBorderAccents, bgSoftAccents, borderSoftAccents 
} from '../App';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface Props {
  profile: UserProfile | null;
  user: any;
}

export default function LOUtrista({ profile, user }: Props) {
  const themeKey = (profile?.theme || 'gym-neon') as keyof typeof accentColors;
  const accentClass = accentColors[themeKey];
  const bgAccentClass = bgAccents[themeKey];
  const shadowAccentClass = shadowAccents[themeKey];
  const ringAccentClass = ringAccents[themeKey];
  const hoverBorderAccentClass = hoverBorderAccents[themeKey];
  const bgSoftAccentClass = bgSoftAccents[themeKey];
  const borderSoftAccentClass = borderSoftAccents[themeKey];

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<NutriMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<NutriPanel | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat messages from Firestore
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'users', user.uid, 'nutri_messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as NutriMessage));
      setMessages(msgs);

      // Automatically set the active panel to the latest generated panel in history
      const panels = msgs.filter(m => m.panel).map(m => m.panel as NutriPanel);
      if (panels.length > 0) {
        setActivePanel(panels[panels.length - 1]);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `users/${user.uid}/nutri_messages`);
    });

    return unsubscribe;
  }, [user]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isSending) return;

    setIsSending(true);
    setError(null);
    setInput('');

    try {
      // 1. Save user message to Firestore
      const userMsg: Omit<NutriMessage, 'id'> = {
        userId: user.uid,
        role: 'user',
        content: textToSend,
        timestamp: serverTimestamp()
      };
      try {
        await addDoc(collection(db, 'users', user.uid, 'nutri_messages'), userMsg);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}/nutri_messages`);
      }

      // 2. Prepare conversation payload for Gemini (excluding timestamps)
      // Grab last 15 messages for context
      const chatContext = [...messages, userMsg as NutriMessage]
        .slice(-15)
        .map(m => ({
          role: m.role,
          content: m.content
        }));

      // 3. Request Gemini analysis
      const response = await sendLOUtristaMessage(chatContext, profile);

      // 4. Save assistant response to Firestore
      const assistantMsg: Omit<NutriMessage, 'id'> = {
        userId: user.uid,
        role: 'assistant',
        content: response.content || "Desculpe, não consegui processar a resposta.",
        panel: response.panel || null,
        timestamp: serverTimestamp()
      };
      try {
        await addDoc(collection(db, 'users', user.uid, 'nutri_messages'), assistantMsg);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}/nutri_messages`);
      }

      if (response.panel) {
        setActivePanel(response.panel);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Ocorreu um erro ao falar com o LOUtrista. Tente novamente.");
    } finally {
      setIsSending(false);
    }
  };

  const handleClearChat = async () => {
    try {
      let snap;
      try {
        snap = await getDocs(collection(db, 'users', user.uid, 'nutri_messages'));
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${user.uid}/nutri_messages`);
      }
      const batch = writeBatch(db);
      snap.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/nutri_messages`);
      }
      setMessages([]);
      setActivePanel(null);
      setShowClearConfirm(false);
    } catch (err) {
      console.error("Failed to clear chat:", err);
    }
  };

  const templates = [
    { label: "Planejar minha Dieta de hoje", text: "LOUtrista, monte uma estrutura de dieta completa para mim baseada no meu objetivo atual. Lembre de listar calorias e os macros de cada refeição." },
    { label: "Opções de substitutos saudáveis", text: "Me dê ideias de substituições saudáveis para alimentos que costumam estragar a dieta (como pães refinados, doces e frituras)." },
    { label: "Calcular meus macros ideais", text: "LOUtrista, calcule meus macros diários de gordura, carboidrato e proteína ideais para o meu objetivo, peso e altura atuais." },
    { label: "Receita de lanche pré-treino rápido", text: "Pode me sugerir algumas receitas rápidas e eficientes de lanche pré-treino para dar bastante energia?" }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={cn("px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full", bgSoftAccentClass, accentClass)}>
              Nutricionista IA Oficial
            </span>
          </div>
          <h2 className="text-4xl font-black tracking-tighter uppercase font-display">LOUtrista Coach</h2>
          <p className="text-zinc-400 text-sm">Seu consultor alimentar de alta performance em tempo real.</p>
        </div>

        {messages.length > 0 && (
          <div className="relative">
            {showClearConfirm ? (
              <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 p-1.5 rounded-2xl z-20">
                <span className="text-xs text-zinc-400 px-2 font-bold">Apagar tudo?</span>
                <button 
                  onClick={handleClearChat}
                  className="bg-red-500/20 text-red-400 text-xs px-3 py-1.5 rounded-xl font-bold hover:bg-red-500/30 transition-all"
                >
                  Sim
                </button>
                <button 
                  onClick={() => setShowClearConfirm(false)}
                  className="text-zinc-400 text-xs px-3 py-1.5 rounded-xl font-bold hover:bg-white/5 transition-all"
                >
                  Não
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-red-400 hover:border-red-500/20 text-xs font-bold transition-all"
              >
                <Trash2 size={14} />
                Limpar Conversa
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Chat and Panel Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left column: Chat */}
        <div className="lg:col-span-7 flex flex-col bg-zinc-900/40 border border-zinc-800/60 rounded-3xl overflow-hidden h-[600px] relative backdrop-blur-sm shadow-xl">
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
            <AnimatePresence initial={false}>
              {messages.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="h-full flex flex-col justify-center items-center text-center max-w-md mx-auto space-y-6 px-4"
                >
                  <div className={cn("p-4 rounded-3xl", bgSoftAccentClass)}>
                    <Apple className={cn("w-10 h-10", accentClass)} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight mb-2">Converse com o LOUtrista</h3>
                    <p className="text-zinc-400 text-sm">
                      Diga o que você quer alcançar ou pergunte sobre alimentos. Eu criarei painéis interativos com dietas e substitutos na hora!
                    </p>
                  </div>

                  {/* Starter Suggestions */}
                  <div className="w-full space-y-2 pt-2">
                    {templates.map((tpl, i) => (
                      <button
                        key={i}
                        onClick={() => handleSendMessage(tpl.text)}
                        className="w-full text-left p-3.5 rounded-2xl bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-xs text-zinc-300 font-bold transition-all flex items-center justify-between group"
                      >
                        <span className="truncate mr-4">{tpl.label}</span>
                        <ArrowRight size={14} className={cn("opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all", accentClass)} />
                      </button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "flex flex-col max-w-[85%] rounded-3xl p-4 text-sm font-medium",
                        msg.role === 'user'
                          ? "bg-zinc-800 text-zinc-100 ml-auto rounded-tr-none"
                          : "bg-zinc-900/90 border border-zinc-800 text-zinc-300 mr-auto rounded-tl-none"
                      )}
                    >
                      {/* Name tag */}
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-wider mb-1",
                        msg.role === 'user' ? "text-zinc-400 text-right" : accentClass
                      )}>
                        {msg.role === 'user' ? 'Você' : 'LOUtrista Coach'}
                      </span>

                      {/* Content */}
                      <div className="prose prose-invert max-w-none text-zinc-200">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>

                      {/* Panel indicator badge if assistant generated a panel */}
                      {msg.role === 'assistant' && msg.panel && (
                        <button
                          onClick={() => setActivePanel(msg.panel as NutriPanel)}
                          className={cn(
                            "mt-3 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all w-full",
                            activePanel === msg.panel
                              ? "bg-zinc-800 text-white cursor-default border border-zinc-700"
                              : cn(bgSoftAccentClass, accentClass, "hover:bg-opacity-20 border", borderSoftAccentClass)
                          )}
                        >
                          <Layers size={12} />
                          {activePanel === msg.panel ? "Visualizando Painel Ativo" : "Ver Painel Gerado"}
                        </button>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>

            {isSending && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 bg-zinc-900/60 border border-zinc-800 max-w-[150px] p-3 rounded-2xl rounded-tl-none mr-auto text-xs text-zinc-400 font-bold"
              >
                <RefreshCw size={12} className="animate-spin text-zinc-500" />
                LOUtrista está pensando...
              </motion.div>
            )}

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-red-400 text-xs font-semibold">
                <AlertCircle className="shrink-0 mt-0.5" size={16} />
                <span>{error}</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input */}
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSendMessage(input); }}
            className="p-4 border-t border-zinc-800/60 bg-zinc-950/40 flex gap-2 items-center"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite sua dúvida ou peça um plano..."
              disabled={isSending}
              className="flex-1 bg-zinc-900/90 hover:bg-zinc-900 focus:bg-zinc-900 outline-none border border-zinc-800 focus:border-zinc-700 px-4 py-3 rounded-2xl text-sm transition-all text-white placeholder-zinc-500 disabled:opacity-50 font-bold"
            />
            <button
              type="submit"
              disabled={!input.trim() || isSending}
              className={cn(
                "p-3 rounded-2xl text-black font-black flex items-center justify-center transition-all shrink-0 shadow-lg",
                input.trim() && !isSending 
                  ? cn(bgAccentClass, "hover:scale-105 active:scale-95 cursor-pointer", shadowAccentClass) 
                  : "bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-50"
              )}
            >
              <Send size={18} fill="currentColor" />
            </button>
          </form>
        </div>

        {/* Right column: Interactive Panels */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-3xl p-6 shadow-xl backdrop-blur-sm min-h-[400px]">
            <div className="flex items-center gap-2 mb-6 border-b border-zinc-800 pb-4 justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className={accentClass} size={20} />
                <h3 className="text-sm font-black uppercase tracking-[0.2em] opacity-80 text-white font-display">
                  Painel Dinâmico
                </h3>
              </div>
              {activePanel && (
                <span className={cn("px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md border", borderSoftAccentClass, bgSoftAccentClass, accentClass)}>
                  {activePanel.type}
                </span>
              )}
            </div>

            <AnimatePresence mode="wait">
              {!activePanel ? (
                <motion.div 
                  key="no-panel"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col justify-center items-center text-center py-20 text-zinc-500"
                >
                  <Layers size={32} className="opacity-25 mb-3" />
                  <p className="text-xs font-bold max-w-xs">
                    Nenhum painel ativo. Peça para o LOUtrista criar uma dieta ou sugerir substituições saudáveis.
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key={activePanel.title}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="space-y-6"
                >
                  <div>
                    <h4 className="text-xl font-black tracking-tight text-white">{activePanel.title}</h4>
                    {activePanel.subtitle && (
                      <p className="text-zinc-400 text-xs mt-1 font-bold">{activePanel.subtitle}</p>
                    )}
                  </div>

                  {/* 1. Diet Plan Rendering */}
                  {activePanel.type === 'diet' && activePanel.dietPlan && (
                    <div className="space-y-4">
                      {/* Macro summaries */}
                      <div className="grid grid-cols-4 gap-2 text-center bg-black/20 p-3.5 rounded-2xl border border-zinc-800/60">
                        <div>
                          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Calorias</p>
                          <p className={cn("text-lg font-black mt-0.5", accentClass)}>{activePanel.dietPlan.dailyCalories} kcal</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Proteína</p>
                          <p className="text-lg font-black mt-0.5 text-blue-400">{activePanel.dietPlan.dailyProtein}g</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Carbos</p>
                          <p className="text-lg font-black mt-0.5 text-amber-400">{activePanel.dietPlan.dailyCarbs}g</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Gorduras</p>
                          <p className="text-lg font-black mt-0.5 text-red-400">{activePanel.dietPlan.dailyFat}g</p>
                        </div>
                      </div>

                      {/* Meals list */}
                      <div className="space-y-3 pt-2">
                        <h5 className="text-xs font-black uppercase tracking-wider text-zinc-400">Refeições Sugeridas</h5>
                        <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1">
                          {activePanel.dietPlan.meals.map((meal, index) => (
                            <div key={index} className="p-3 bg-zinc-900/60 border border-zinc-800/50 rounded-2xl space-y-1.5">
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-black text-zinc-100">{meal.name}</span>
                                {meal.time && (
                                  <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded-md text-zinc-400 font-bold">{meal.time}</span>
                                )}
                              </div>
                              <ul className="space-y-1">
                                {meal.foods.map((food, fIdx) => (
                                  <li key={fIdx} className="text-zinc-300 text-xs flex items-center gap-1.5 font-medium">
                                    <span className={cn("w-1.5 h-1.5 rounded-full", bgAccentClass)} />
                                    {food}
                                  </li>
                                ))}
                              </ul>
                              {(meal.calories !== undefined || meal.protein !== undefined) && (
                                <div className="flex gap-2 text-[10px] text-zinc-500 font-mono font-bold pt-1 border-t border-zinc-800/40">
                                  {meal.calories !== undefined && <span>{meal.calories} kcal</span>}
                                  {meal.protein !== undefined && <span className="text-blue-500/80">| {meal.protein}g Proteína</span>}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 2. Food Swaps Rendering */}
                  {activePanel.type === 'food_swap' && activePanel.swaps && (
                    <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                      {activePanel.swaps.map((swap, index) => (
                        <div key={index} className="p-4 bg-zinc-900/60 border border-zinc-800/50 rounded-2xl space-y-3">
                          <div className="grid grid-cols-2 gap-2 border-b border-zinc-800/50 pb-2">
                            <div>
                              <p className="text-[10px] font-black uppercase text-red-400 tracking-wider">Evitar ❌</p>
                              <p className="text-xs font-bold text-zinc-300 mt-0.5">{swap.original}</p>
                            </div>
                            <div className="border-l border-zinc-800/80 pl-2">
                              <p className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">Substituir por ✅</p>
                              <p className="text-xs font-bold text-white mt-0.5">{swap.replacement}</p>
                            </div>
                          </div>
                          <div className="space-y-1 text-xs">
                            <p className="text-zinc-400 font-bold"><span className="text-zinc-500">Por que:</span> {swap.reason}</p>
                            <p className="text-zinc-400 font-bold"><span className="text-zinc-500">Benefício:</span> {swap.benefit}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 3. Macros Calculator Rendering */}
                  {activePanel.type === 'macros' && activePanel.macros && (
                    <div className="space-y-4">
                      <div className="text-center p-4 bg-black/20 rounded-2xl border border-zinc-800/60">
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Ingestão Recomendada</p>
                        <p className={cn("text-3xl font-black mt-1", accentClass)}>{activePanel.macros.calories} kcal/dia</p>
                      </div>

                      <div className="space-y-2.5">
                        <div className="flex justify-between text-xs font-bold text-zinc-300">
                          <span>Proteína (P)</span>
                          <span className="text-blue-400">{activePanel.macros.protein}g</span>
                        </div>
                        <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, (activePanel.macros.protein * 4 / activePanel.macros.calories) * 100)}%` }} />
                        </div>

                        <div className="flex justify-between text-xs font-bold text-zinc-300 pt-1">
                          <span>Carboidratos (C)</span>
                          <span className="text-amber-400">{activePanel.macros.carbs}g</span>
                        </div>
                        <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(100, (activePanel.macros.carbs * 4 / activePanel.macros.calories) * 100)}%` }} />
                        </div>

                        <div className="flex justify-between text-xs font-bold text-zinc-300 pt-1">
                          <span>Gorduras (F)</span>
                          <span className="text-red-400">{activePanel.macros.fat}g</span>
                        </div>
                        <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-red-500 rounded-full" style={{ width: `${Math.min(100, (activePanel.macros.fat * 9 / activePanel.macros.calories) * 100)}%` }} />
                        </div>
                      </div>

                      {activePanel.macros.notes && (
                        <div className="p-3.5 bg-zinc-900/60 border border-zinc-800/50 rounded-2xl text-xs text-zinc-400 font-bold flex gap-2">
                          <Info size={16} className={cn("shrink-0 text-zinc-500", accentClass)} />
                          <span>{activePanel.macros.notes}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 4. Tips / General List Rendering */}
                  {(activePanel.type === 'tips' || activePanel.type === 'general') && activePanel.items && (
                    <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                      {activePanel.items.map((item, index) => (
                        <div key={index} className="p-3.5 bg-zinc-900/60 border border-zinc-800/50 rounded-2xl space-y-1 transition-all hover:bg-zinc-900/80">
                          <h5 className="text-xs font-black text-white flex items-center gap-2">
                            <span className={cn("w-2 h-2 rounded-full", bgAccentClass)} />
                            {item.title}
                          </h5>
                          <p className="text-zinc-400 text-xs pl-4 font-bold leading-relaxed">{item.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
