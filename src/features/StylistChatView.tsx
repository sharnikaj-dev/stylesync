import React, { useEffect, useRef, useState } from 'react';
import { MessageSquare, RotateCcw, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';

type ChatMode = 'general' | 'fast' | 'complex' | 'deep';

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  modelUsed?: string;
}

const MODE_OPTIONS: Array<{
  id: ChatMode;
  label: string;
  modelLabel: string;
  roleDesc: string;
}> = [
  {
    id: 'general',
    label: 'Personal Stylist',
    modelLabel: 'gemini-4-hydrogen',
    roleDesc: 'General outfit curation, occasion styling & everyday advice',
  },
  {
    id: 'fast',
    label: 'Quick Match',
    modelLabel: 'gemini-3.1-flash-lite',
    roleDesc: 'Fast color, footwear & accessory pairing checks',
  },
  {
    id: 'complex',
    label: 'Capsule Architect',
    modelLabel: 'gemini-4-neon',
    roleDesc: 'Complex multi-occasion wardrobe & budget planning',
  },
  {
    id: 'deep',
    label: 'Style Strategist',
    modelLabel: 'gemini-4-carbon',
    roleDesc: 'Deep reasoning on wardrobe economics, fit & silhouettes',
  },
];

const STARTER_PROMPTS = [
  'Which olive and ivory pieces pair best for a semi-formal Diwali dinner under ₹3,000?',
  'Can you help me build a 10-piece capsule wardrobe using items I already own?',
  'What footwear and jewellery elevate a muted rose pleated midi dress for evening?',
];

export const StylistChatView: React.FC = () => {
  const { dbUser, notify } = useAuth();
  const [mode, setMode] = useState<ChatMode>('general');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'model',
      text: `Hello ${(dbUser?.displayName || 'there').split(' ')[0]}. I am your StyleSync AI Personal Stylist. Ask me about outfit combinations, color harmony, budget planning in ₹, or reusing pieces from your digital wardrobe.`,
      modelUsed: 'gemini-4-hydrogen',
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const threadEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const sendMessage = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text || sending) return;

    setErrorMsg(null);
    const nextHistory: ChatMessage[] = [...messages, { role: 'user', text }];
    setMessages(nextHistory);
    if (!textOverride) setInput('');
    setSending(true);

    try {
      const apiMessages = nextHistory.map((m) => ({ role: m.role, text: m.text }));
      const data = await apiFetch<{ reply: string; model: string }>('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ messages: apiMessages, mode }),
      });

      setMessages((prev) => [
        ...prev,
        { role: 'model', text: data.reply, modelUsed: data.model },
      ]);
    } catch (err: any) {
      const msg = err?.message || 'Unable to generate reply.';
      setErrorMsg(msg);
      notify(msg, 'error');
    } finally {
      setSending(false);
    }
  };

  const resetChat = () => {
    setErrorMsg(null);
    setMessages([
      {
        role: 'model',
        text: 'Started a fresh styling session. What occasion, outfit, or color combination are we exploring today?',
        modelUsed: MODE_OPTIONS.find((m) => m.id === mode)?.modelLabel,
      },
    ]);
  };

  const activeModeObj = MODE_OPTIONS.find((m) => m.id === mode)!;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#9D5C63] mb-1">
            Multi-Turn Conversation · Wardrobe & Preference Aware
          </p>
          <h1 className="font-editorial text-3xl lg:text-4xl font-semibold text-[#1C1917]">
            Stylist Conversation Studio
          </h1>
          <p className="text-sm text-[#57534E] mt-1">
            Role: <span className="font-medium text-[#1C1917]">{activeModeObj.label}</span> —{' '}
            {activeModeObj.roleDesc}
          </p>
        </div>

        <button
          onClick={resetChat}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#F2EDE6] border border-[#E2DBD0] rounded-lg hover:bg-[#EAE3D9] self-start cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" /> New Thread
        </button>
      </div>

      {/* Mode / Role Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {MODE_OPTIONS.map((opt) => {
          const active = mode === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => setMode(opt.id)}
              className={`text-left p-3.5 rounded-xl border transition-colors cursor-pointer ${
                active
                  ? 'bg-[#1C1917] text-white border-[#1C1917]'
                  : 'bg-white text-[#1C1917] border-[#E7E2DA] hover:bg-[#FAF8F5]'
              }`}
            >
              <div className="text-sm font-semibold">{opt.label}</div>
              <div
                className={`font-mono-num text-[11px] mt-0.5 ${
                  active ? 'text-[#D6D0C7]' : 'text-[#9D5C63]'
                }`}
              >
                {opt.modelLabel}
              </div>
            </button>
          );
        })}
      </div>

      {/* Scrollable Chat Thread */}
      <div className="bg-white border border-[#E7E2DA] rounded-xl flex flex-col h-[520px]">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[82%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-[#1C1917] text-white'
                    : 'bg-[#FAF8F5] border border-[#E7E2DA] text-[#1C1917]'
                }`}
              >
                <div>{msg.text}</div>
                {msg.role === 'model' && msg.modelUsed && (
                  <div className="mt-2 pt-1.5 border-t border-[#E7E2DA] text-[10px] font-mono-num text-[#78716C]">
                    {msg.modelUsed}
                  </div>
                )}
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex justify-start">
              <div className="bg-[#FAF8F5] border border-[#E7E2DA] rounded-xl px-4 py-3 text-xs text-[#57534E]">
                Thinking through your outfit options...
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-lg bg-[#FDF2F2] border border-[#E5B8B8] text-xs text-[#8B2E2E]">
              {errorMsg}
            </div>
          )}
          <div ref={threadEndRef} />
        </div>

        {/* Starter Suggestions */}
        {messages.length <= 2 && (
          <div className="px-6 py-2.5 border-t border-[#E7E2DA] bg-[#FAF8F5] flex flex-wrap gap-2">
            {STARTER_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => sendMessage(prompt)}
                className="text-xs px-3 py-1.5 rounded-lg bg-white border border-[#E2DBD0] text-[#44403C] hover:border-[#9D5C63] cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Composer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="p-4 border-t border-[#E7E2DA] flex items-center gap-3"
        >
          <MessageSquare className="w-4 h-4 text-[#78716C] shrink-0 hidden sm:block" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a follow-up question, refine colors, or compare outfits..."
            className="flex-1 px-4 py-2.5 bg-[#FAF8F5] border border-[#E2DBD0] rounded-lg text-sm"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium text-white bg-[#9D5C63] rounded-lg hover:bg-[#864B52] disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            Send
          </button>
        </form>
      </div>
    </div>
  );
};
