import React, { useEffect, useState } from 'react';
import { Bookmark, Check, ExternalLink, Scale, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';
import { SavedOutfit, WishlistItem } from '../types/stylesync';
import { ImageWithFallback } from '../components/ui/ImageWithFallback';

export const SavedAndDecisionView: React.FC = () => {
  const { notify } = useAuth();
  const [outfits, setOutfits] = useState<SavedOutfit[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [occasionFilter, setOccasionFilter] = useState('All');
  const [compareIds, setCompareIds] = useState<number[]>([]);
  const [targetOccasion, setTargetOccasion] = useState('Festive Evening');
  const [comparing, setComparing] = useState(false);
  const [decisionResult, setDecisionResult] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      apiFetch<{ outfits: SavedOutfit[] }>('/api/outfits').catch(() => ({ outfits: [] })),
      apiFetch<{ wishlist: WishlistItem[] }>('/api/wishlist').catch(() => ({ wishlist: [] })),
    ]).then(([o, w]) => {
      setOutfits(o.outfits || []);
      setWishlist(w.wishlist || []);
    });
  }, []);

  const deleteOutfit = async (id: number) => {
    try {
      await apiFetch(`/api/outfits/${id}`, { method: 'DELETE' });
      setOutfits((prev) => prev.filter((o) => o.id !== id));
      setCompareIds((prev) => prev.filter((x) => x !== id));
      notify('Removed saved outfit.', 'info');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const deleteWishlist = async (id: number) => {
    try {
      await apiFetch(`/api/wishlist/${id}`, { method: 'DELETE' });
      setWishlist((prev) => prev.filter((w) => w.id !== id));
      notify('Removed from wishlist.', 'info');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const toggleCompare = (id: number) => {
    setCompareIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const runDecisionAssistant = async () => {
    if (compareIds.length < 2) {
      notify('Select at least 2 saved outfits to compare.', 'error');
      return;
    }
    setComparing(true);
    try {
      const data = await apiFetch<{ comparison: any }>('/api/ai/decision-assistant', {
        method: 'POST',
        body: JSON.stringify({ outfitIds: compareIds, targetOccasion }),
      });
      setDecisionResult(data.comparison);
      notify('Comparison recommendation ready.', 'success');
    } catch (err: any) {
      notify(err.message || 'Comparison failed.', 'error');
    } finally {
      setComparing(false);
    }
  };

  const occasions = ['All', ...Array.from(new Set(outfits.map((o) => o.occasion)))];
  const filteredOutfits = outfits.filter(
    (o) => occasionFilter === 'All' || o.occasion === occasionFilter,
  );

  return (
    <div className="space-y-10">
      <div>
        <p className="text-xs font-medium text-[#9D5C63] mb-1">
          Collections, Wishlist & Comparison
        </p>
        <h1 className="font-editorial text-3xl lg:text-4xl font-semibold text-[#1C1917]">
          Saved Outfits, Wishlist & Decision Assistant
        </h1>
      </div>

      {/* Decision Assistant Bar */}
      {outfits.length >= 2 && (
        <section className="bg-white border border-[#E7E2DA] rounded-xl p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="font-editorial text-2xl font-semibold text-[#1C1917]">
                Fashion Decision Assistant
              </h2>
              <p className="text-xs text-[#57534E]">
                Select 2 or more saved outfits below and compare them for a specific occasion
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={targetOccasion}
                onChange={(e) => setTargetOccasion(e.target.value)}
                placeholder="Target occasion..."
                className="px-3 py-2 bg-[#FAF8F5] border border-[#E2DBD0] rounded-lg text-xs"
              />
              <button
                onClick={runDecisionAssistant}
                disabled={comparing || compareIds.length < 2}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#1C1917] rounded-lg hover:bg-[#342F2C] disabled:opacity-50 cursor-pointer"
              >
                <Scale className="w-3.5 h-3.5" />
                {comparing ? 'Comparing...' : `Compare (${compareIds.length})`}
              </button>
            </div>
          </div>

          {decisionResult && (
            <div className="p-5 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA] space-y-3">
              <div className="text-xs font-semibold text-[#9D5C63]">
                Recommended Pick: {decisionResult.winnerTitle}
              </div>
              <p className="text-sm text-[#1C1917]">{decisionResult.verdictSummary}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                {(decisionResult.comparisons || []).map((c: any) => (
                  <div key={c.outfitId} className="p-3 bg-white border border-[#E7E2DA] rounded-lg text-xs">
                    <div className="font-semibold text-[#1C1917]">{c.title}</div>
                    <div className="text-[#44403C] mt-1">{c.suitabilitySummary}</div>
                    <div className="text-[#284D31] mt-1">Strength: {c.strength}</div>
                    <div className="text-[#57534E] mt-1">Tweak: {c.tweakSuggestion}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Saved Outfits */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-editorial text-2xl font-semibold text-[#1C1917]">
            Saved Outfit Collections ({filteredOutfits.length})
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {occasions.map((occ) => (
              <button
                key={occ}
                onClick={() => setOccasionFilter(occ)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border cursor-pointer ${
                  occasionFilter === occ
                    ? 'bg-[#1C1917] text-white border-[#1C1917]'
                    : 'bg-white text-[#44403C] border-[#E2DBD0]'
                }`}
              >
                {occ}
              </button>
            ))}
          </div>
        </div>

        {filteredOutfits.length === 0 ? (
          <div className="bg-white border border-[#E7E2DA] rounded-xl p-10 text-center text-sm text-[#57534E]">
            <Bookmark className="w-7 h-7 mx-auto opacity-40 mb-2" />
            No saved outfits yet. Curate a look with AI Stylist or Wardrobe Combos to save it here.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOutfits.map((outfit) => {
              const selected = compareIds.includes(outfit.id);
              return (
                <div
                  key={outfit.id}
                  className={`bg-white border rounded-xl p-5 flex flex-col justify-between ${
                    selected ? 'border-[#9D5C63] ring-1 ring-[#9D5C63]' : 'border-[#E7E2DA]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between text-xs text-[#57534E] mb-2">
                      <span>
                        {outfit.occasion} · {outfit.collectionName}
                      </span>
                      <span className="font-mono-num font-semibold text-[#1C1917]">
                        ₹{outfit.totalCost.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <h3 className="font-editorial text-2xl font-semibold text-[#1C1917] mb-3">
                      {outfit.title}
                    </h3>
                    <ul className="space-y-1.5 text-xs text-[#44403C]">
                      {outfit.items.map((it, idx) => (
                        <li key={idx} className="flex justify-between gap-2">
                          <span className="truncate">
                            <span className="font-medium">{it.slot}:</span> {it.name}
                          </span>
                          <span className="font-mono-num shrink-0">
                            {it.isOwned ? 'Owned' : `₹${(it.price || 0).toLocaleString('en-IN')}`}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#E7E2DA] flex items-center justify-between">
                    <button
                      onClick={() => toggleCompare(outfit.id)}
                      className={`inline-flex items-center gap-1 text-xs font-medium cursor-pointer ${
                        selected ? 'text-[#9D5C63]' : 'text-[#44403C] hover:text-[#1C1917]'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      {selected ? 'Selected to Compare' : 'Compare'}
                    </button>
                    <button
                      onClick={() => deleteOutfit(outfit.id)}
                      className="p-1.5 text-[#8B2E2E] hover:bg-[#FDF2F2] rounded cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Shopping Wishlist */}
      <section className="space-y-4">
        <h2 className="font-editorial text-2xl font-semibold text-[#1C1917]">
          Shopping Wishlist & Price Alerts ({wishlist.length})
        </h2>
        {wishlist.length === 0 ? (
          <div className="bg-white border border-[#E7E2DA] rounded-xl p-8 text-center text-sm text-[#57534E]">
            Your wishlist is empty. Save items from Smart Shopping to track price drops.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {wishlist.map((w) => (
              <div
                key={w.id}
                className="bg-white border border-[#E7E2DA] rounded-xl overflow-hidden flex items-center gap-4 p-4"
              >
                <ImageWithFallback
                  src={w.productSnapshot?.imageUrl}
                  alt={w.productSnapshot?.name || 'Wishlist item'}
                  className="w-20 h-20 rounded-lg object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-[#57534E]">
                    {w.productSnapshot?.brand} · {w.productSnapshot?.platform}
                  </div>
                  <div className="text-sm font-semibold text-[#1C1917] truncate">
                    {w.productSnapshot?.name}
                  </div>
                  <div className="font-mono-num text-xs text-[#9D5C63] mt-1">
                    ₹{(w.productSnapshot?.currentPrice || 0).toLocaleString('en-IN')}
                    {w.targetPrice ? ` · Target ₹${w.targetPrice.toLocaleString('en-IN')}` : ''}
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    {w.productSnapshot?.productUrl && (
                      <a
                        href={w.productSnapshot.productUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#1C1917] hover:underline"
                      >
                        View <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    <button
                      onClick={() => deleteWishlist(w.id)}
                      className="text-xs text-[#8B2E2E] hover:underline cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
