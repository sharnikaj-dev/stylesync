import React, { useState } from 'react';
import { Bookmark, ExternalLink, RefreshCw, Send, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';
import { OutfitComponentItem } from '../types/stylesync';

interface StylistOutfitResponse {
  title: string;
  occasion: string;
  detectedBudget?: number;
  totalCost: number;
  stylingNotes: string;
  hairstyleSuggestion: string;
  items: OutfitComponentItem[];
}

const SAMPLE_PROMPTS = [
  'I need a stylish outfit for Diwali. My budget is ₹3,000. I prefer traditional outfits with a modern touch.',
  'Curate a polished minimalist workwear outfit under ₹4,500 using ivory and warm beige tones.',
  'Suggest a comfortable rainy-day college look with streetwear sneakers under ₹2,500.',
  'I need an elegant evening dinner outfit in muted rose within ₹3,500.',
];

export const AiStylistView: React.FC = () => {
  const { notify } = useAuth();
  const [query, setQuery] = useState(SAMPLE_PROMPTS[0]);
  const [weatherContext, setWeatherContext] = useState('Mild & Clear (26°C)');
  const [loading, setLoading] = useState(false);
  const [swappingSlot, setSwappingSlot] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [outfit, setOutfit] = useState<StylistOutfitResponse | null>(null);

  const handleGenerate = async (customQuery?: string) => {
    const activeQuery = (customQuery ?? query).trim();
    if (!activeQuery) {
      notify('Enter an outfit request first.', 'error');
      return;
    }
    setLoading(true);
    try {
      const data = await apiFetch<{ outfit: StylistOutfitResponse }>('/api/ai/stylist', {
        method: 'POST',
        body: JSON.stringify({ query: activeQuery, weatherContext }),
      });
      setOutfit(data.outfit);
      notify('Complete outfit curated.', 'success');
    } catch (err: any) {
      notify(err.message || 'Could not generate outfit.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSwapComponent = async (slot: string) => {
    if (!outfit) return;
    setSwappingSlot(slot);
    try {
      const data = await apiFetch<{ replacement: OutfitComponentItem }>('/api/ai/stylist/slot', {
        method: 'POST',
        body: JSON.stringify({
          currentOutfit: outfit,
          slotToReplace: slot,
          instruction: `Suggest a fresh alternative for ${slot} within budget`,
        }),
      });
      const updatedItems = outfit.items.map((item) =>
        item.slot === slot ? data.replacement : item,
      );
      const updatedCost = updatedItems.reduce(
        (acc, it) => acc + (it.isOwned ? 0 : it.price || 0),
        0,
      );
      setOutfit({
        ...outfit,
        items: updatedItems,
        totalCost: updatedCost,
      });
      notify(`Updated ${slot} recommendation.`, 'success');
    } catch (err: any) {
      notify(err.message || 'Could not swap component.', 'error');
    } finally {
      setSwappingSlot(null);
    }
  };

  const handleSaveOutfit = async () => {
    if (!outfit) return;
    setSaving(true);
    try {
      await apiFetch('/api/outfits', {
        method: 'POST',
        body: JSON.stringify({
          title: outfit.title,
          occasion: outfit.occasion,
          collectionName: `${outfit.occasion} Edit`,
          totalCost: outfit.totalCost,
          source: 'ai_stylist',
          items: outfit.items,
          stylingNotes: outfit.stylingNotes,
          hairstyleSuggestion: outfit.hairstyleSuggestion,
        }),
      });
      notify('Outfit saved to your Collections.', 'success');
    } catch (err: any) {
      notify(err.message || 'Could not save outfit.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-medium text-[#9D5C63] mb-1">
          Conversational Styling · Wardrobe & Catalog Aware
        </p>
        <h1 className="font-editorial text-3xl lg:text-4xl font-semibold text-[#1C1917]">
          AI Personal Fashion Stylist
        </h1>
        <p className="text-sm text-[#57534E] mt-1 max-w-2xl">
          Describe your occasion, budget, and vibe in plain language. Receive a complete head-to-toe
          combination and swap individual pieces without losing the rest of the look.
        </p>
      </div>

      {/* Prompt Input Card */}
      <section className="bg-white border border-[#E7E2DA] rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <label className="text-sm font-semibold text-[#1C1917]">
            What are you dressing for?
          </label>
          <select
            value={weatherContext}
            onChange={(e) => setWeatherContext(e.target.value)}
            className="px-3 py-1.5 text-xs bg-[#FAF8F5] border border-[#E2DBD0] rounded-lg"
          >
            <option>Mild & Clear (26°C)</option>
            <option>Warm & Humid (33°C)</option>
            <option>Monsoon Rain (24°C)</option>
            <option>Crisp Evening (16°C)</option>
          </select>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <textarea
            rows={2}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Describe occasion, budget (₹), preferred style, and colors..."
            className="flex-1 px-4 py-3 bg-[#FAF8F5] border border-[#E2DBD0] rounded-lg text-sm"
          />
          <button
            onClick={() => handleGenerate()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium text-white bg-[#1C1917] rounded-lg hover:bg-[#342F2C] disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            {loading ? 'Curating Look...' : 'Curate Outfit'}
          </button>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {SAMPLE_PROMPTS.map((sample, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setQuery(sample);
                handleGenerate(sample);
              }}
              className="text-left text-xs px-3 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#E7E2DA] text-[#44403C] hover:bg-[#F2EDE6] cursor-pointer"
            >
              {sample.slice(0, 62)}...
            </button>
          ))}
        </div>
      </section>

      {/* Outfit Result */}
      {outfit && (
        <section className="bg-white border border-[#E7E2DA] rounded-xl p-6 lg:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#E7E2DA]">
            <div>
              <p className="text-xs text-[#57534E]">
                {outfit.occasion} · {weatherContext}
              </p>
              <h2 className="font-editorial text-3xl font-semibold text-[#1C1917] mt-1">
                {outfit.title}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="px-4 py-2 rounded-lg bg-[#FAF8F5] border border-[#E7E2DA] text-sm">
                <span className="text-[#57534E] mr-2">Est. Total:</span>
                <span className="font-mono-num font-semibold text-[#1C1917]">
                  ₹{outfit.totalCost.toLocaleString('en-IN')}
                </span>
              </div>
              <button
                onClick={() => handleGenerate()}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-[#F2EDE6] rounded-lg hover:bg-[#EAE3D9] cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Regenerate All
              </button>
              <button
                onClick={handleSaveOutfit}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#9D5C63] rounded-lg hover:bg-[#864B52] cursor-pointer"
              >
                <Bookmark className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save Outfit'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {outfit.items.map((item, idx) => (
              <div
                key={`${item.slot}-${idx}`}
                className="border border-[#E7E2DA] rounded-xl p-5 bg-[#FAF8F5] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs text-[#57534E] mb-2">
                    <span className="font-semibold text-[#9D5C63]">{item.slot}</span>
                    <span className="font-mono-num font-semibold text-[#1C1917]">
                      {item.isOwned ? 'Owned (₹0)' : `₹${(item.price || 0).toLocaleString('en-IN')}`}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-[#1C1917] mb-1">{item.name}</h3>
                  <p className="text-xs text-[#57534E] mb-3">Color: {item.color}</p>
                  <p className="text-xs text-[#44403C] leading-relaxed">{item.explanation}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#E7E2DA] flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleSwapComponent(item.slot)}
                    disabled={swappingSlot === item.slot}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#1C1917] hover:text-[#9D5C63] cursor-pointer"
                  >
                    <RefreshCw
                      className={`w-3 h-3 ${swappingSlot === item.slot ? 'animate-spin' : ''}`}
                    />
                    {swappingSlot === item.slot ? 'Swapping...' : 'Swap Item'}
                  </button>

                  {item.productUrl && !item.isOwned && (
                    <a
                      href={item.productUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#9D5C63] hover:underline"
                    >
                      {item.platform || 'Shop'} <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[#E7E2DA]">
            <div>
              <h3 className="text-xs font-semibold text-[#1C1917] mb-1.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#9D5C63]" /> Styling Rationale
              </h3>
              <p className="text-sm text-[#44403C] leading-relaxed">{outfit.stylingNotes}</p>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-[#1C1917] mb-1.5">
                Hairstyle & Finishing Suggestion
              </h3>
              <p className="text-sm text-[#44403C] leading-relaxed">
                {outfit.hairstyleSuggestion}
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
