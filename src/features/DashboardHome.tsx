import React, { useEffect, useState } from 'react';
import { ArrowRight, CalendarDays, Dna, Shirt, ShoppingBag, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';
import {
  CalendarEvent,
  Product,
  SavedOutfit,
  StudioTab,
  WardrobeItem,
} from '../types/stylesync';
import { ImageWithFallback } from '../components/ui/ImageWithFallback';

interface DashboardHomeProps {
  onNavigate: (tab: StudioTab) => void;
}

export const DashboardHome: React.FC<DashboardHomeProps> = ({ onNavigate }) => {
  const { dbUser } = useAuth();
  const [wardrobe, setWardrobe] = useState<WardrobeItem[]>([]);
  const [outfits, setOutfits] = useState<SavedOutfit[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [intel, setIntel] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch<{ items: WardrobeItem[] }>('/api/wardrobe').catch(() => ({ items: [] })),
      apiFetch<{ outfits: SavedOutfit[] }>('/api/outfits').catch(() => ({ outfits: [] })),
      apiFetch<{ events: CalendarEvent[] }>('/api/calendar').catch(() => ({ events: [] })),
      apiFetch<{ products: Product[] }>('/api/products').catch(() => ({ products: [] })),
      apiFetch<any>('/api/intelligence/summary?temp=27&condition=Sunny').catch(() => null),
    ]).then(([w, o, c, p, i]) => {
      setWardrobe(w.items || []);
      setOutfits(o.outfits || []);
      setEvents(c.events || []);
      setProducts((p.products || []).slice(0, 3));
      setIntel(i);
      setLoading(false);
    });
  }, []);

  const firstName = (dbUser?.displayName || dbUser?.email || 'Stylist').split(' ')[0];
  const styles = dbUser?.stylePreferences?.preferredStyles || ['Minimalist', 'Fusion'];
  const colors = dbUser?.stylePreferences?.favoriteColors || ['Ivory', 'Olive', 'Muted Rose'];

  return (
    <div className="space-y-8">
      {/* Greeting & Fashion Twin Summary */}
      <section className="bg-white border border-[#E7E2DA] rounded-xl p-6 lg:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <p className="text-xs font-medium text-[#9D5C63] mb-1">
            Personal Atelier · {styles.join(' · ')}
          </p>
          <h1 className="font-editorial text-3xl lg:text-4xl font-semibold text-[#1C1917] mb-2">
            Good morning, {firstName}
          </h1>
          <p className="text-sm text-[#57534E] max-w-2xl">
            {dbUser?.fashionTwinProfile?.styleSummary ||
              `Your Fashion Twin prioritizes ${colors.join(', ')} tones across ${
                dbUser?.stylePreferences?.commonOccasions?.join(', ') || 'everyday'
              } looks.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={() => onNavigate('style-analysis')}
            className="px-4 py-2.5 text-xs font-medium text-[#1C1917] bg-[#F2EDE6] border border-[#E2DBD0] rounded-lg hover:bg-[#EAE3D9] whitespace-nowrap cursor-pointer"
          >
            Analyze Photo
          </button>
          <button
            onClick={() => onNavigate('ai-stylist')}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-medium text-white bg-[#1C1917] rounded-lg hover:bg-[#342F2C] whitespace-nowrap cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Generate Today&apos;s Look
          </button>
        </div>
      </section>

      {/* Key Metrics Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E7E2DA] rounded-xl p-5">
          <div className="text-xs text-[#57534E]">Wardrobe Pieces</div>
          <div className="font-editorial text-3xl font-semibold text-[#1C1917] mt-1 tabular-nums">
            {loading ? '—' : wardrobe.length}
          </div>
          <button
            onClick={() => onNavigate('wardrobe')}
            className="text-xs font-medium text-[#9D5C63] mt-2 hover:underline cursor-pointer"
          >
            Manage closet
          </button>
        </div>

        <div className="bg-white border border-[#E7E2DA] rounded-xl p-5">
          <div className="text-xs text-[#57534E]">Saved Outfits</div>
          <div className="font-editorial text-3xl font-semibold text-[#1C1917] mt-1 tabular-nums">
            {loading ? '—' : outfits.length}
          </div>
          <button
            onClick={() => onNavigate('saved-decision')}
            className="text-xs font-medium text-[#9D5C63] mt-2 hover:underline cursor-pointer"
          >
            Compare looks
          </button>
        </div>

        <div className="bg-white border border-[#E7E2DA] rounded-xl p-5">
          <div className="text-xs text-[#57534E]">Sustainability Score</div>
          <div className="font-editorial text-3xl font-semibold text-[#1C1917] mt-1 tabular-nums">
            {intel?.intelligence?.sustainabilityScore ?? 50}/100
          </div>
          <div className="text-xs text-[#57534E] mt-2">Wardrobe reuse index</div>
        </div>

        <div className="bg-white border border-[#E7E2DA] rounded-xl p-5">
          <div className="text-xs text-[#57534E]">Upcoming Occasions</div>
          <div className="font-editorial text-3xl font-semibold text-[#1C1917] mt-1 tabular-nums">
            {loading ? '—' : events.length}
          </div>
          <button
            onClick={() => onNavigate('calendar-travel')}
            className="text-xs font-medium text-[#9D5C63] mt-2 hover:underline cursor-pointer"
          >
            Open calendar
          </button>
        </div>
      </section>

      {/* Today's Weather Styling & Quick Modules */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white border border-[#E7E2DA] rounded-xl p-6 flex flex-col justify-between">
          <div>
            <p className="text-xs font-medium text-[#9D5C63] mb-1">
              Weather-Aware Inspiration · Mild 27°C
            </p>
            <h2 className="font-editorial text-2xl font-semibold text-[#1C1917] mb-2">
              {intel?.weatherAdvice?.headline || 'Breathable Cotton & Tailored Neutrals'}
            </h2>
            <p className="text-sm text-[#57534E] leading-relaxed mb-4">
              {intel?.weatherAdvice?.suggestion ||
                'Pair breathable cotton or chanderi separates in ivory and olive with cushioned leather loafers.'}
            </p>
            <div className="text-xs text-[#57534E] border-t border-[#E7E2DA] pt-4">
              <span className="font-medium text-[#1C1917]">Recommended fabrics: </span>
              {(intel?.weatherAdvice?.fabrics || ['Handloom cotton', 'Linen', 'Chanderi silk']).join(
                ' · ',
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate('stylist-chat')}
              className="px-4 py-2 text-xs font-medium bg-[#F2EDE6] rounded-lg hover:bg-[#EAE3D9] cursor-pointer"
            >
              Stylist Chat
            </button>
            <button
              onClick={() => onNavigate('runway-video')}
              className="px-4 py-2 text-xs font-medium bg-[#F2EDE6] rounded-lg hover:bg-[#EAE3D9] cursor-pointer"
            >
              Animate Photo to Video
            </button>
            <button
              onClick={() => onNavigate('match-decode')}
              className="px-4 py-2 text-xs font-medium bg-[#F2EDE6] rounded-lg hover:bg-[#EAE3D9] cursor-pointer"
            >
              Match Existing Item
            </button>
            <button
              onClick={() => onNavigate('virtual-try-on')}
              className="px-4 py-2 text-xs font-medium bg-[#F2EDE6] rounded-lg hover:bg-[#EAE3D9] cursor-pointer"
            >
              Virtual Try-On Studio
            </button>
            <button
              onClick={() => onNavigate('color-lab')}
              className="px-4 py-2 text-xs font-medium bg-[#F2EDE6] rounded-lg hover:bg-[#EAE3D9] cursor-pointer"
            >
              Color Laboratory
            </button>
          </div>
        </div>

        <div className="lg:col-span-5 bg-white border border-[#E7E2DA] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-editorial text-2xl font-semibold text-[#1C1917]">
              Upcoming Calendar
            </h2>
            <button
              onClick={() => onNavigate('calendar-travel')}
              className="text-xs font-medium text-[#9D5C63] hover:underline cursor-pointer"
            >
              Plan Trip / Event
            </button>
          </div>
          {events.length === 0 ? (
            <div className="py-6 text-sm text-[#57534E]">
              No occasions scheduled yet. Plan upcoming festivals, work presentations, or trips to
              prevent repeat outfits.
              <button
                onClick={() => onNavigate('calendar-travel')}
                className="mt-3 block text-xs font-medium text-[#1C1917] underline cursor-pointer"
              >
                Schedule First Event
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {events.slice(0, 3).map((ev) => (
                <div
                  key={ev.id}
                  className="p-3 rounded-lg bg-[#FAF8F5] border border-[#E7E2DA] flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="text-sm font-medium text-[#1C1917]">{ev.eventTitle}</div>
                    <div className="text-xs text-[#57534E]">
                      {ev.occasion || 'General'} · {ev.outfitSummary || 'Outfit pending'}
                    </div>
                  </div>
                  <div className="font-mono-num text-xs text-[#9D5C63] shrink-0">
                    {ev.eventDate}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Curated Shopping Comparison Deals */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-editorial text-2xl font-semibold text-[#1C1917]">
              Smart Shopping Comparison Picks
            </h2>
            <p className="text-xs text-[#57534E]">
              Demonstration catalog comparing Myntra, Flipkart, and Meesho value scores
            </p>
          </div>
          <button
            onClick={() => onNavigate('smart-shopping')}
            className="inline-flex items-center gap-1 text-xs font-medium text-[#9D5C63] hover:underline cursor-pointer"
          >
            View All <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {products.map((product) => {
            const best = product.comparison?.scoredListings?.[0];
            return (
              <div
                key={product.id}
                onClick={() => onNavigate('smart-shopping')}
                className="bg-white border border-[#E7E2DA] rounded-xl overflow-hidden hover:-translate-y-0.5 transition-transform cursor-pointer"
              >
                <div className="aspect-[4/3] bg-[#EFEAE2]">
                  <ImageWithFallback
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <div className="text-xs text-[#57534E]">
                    {product.brand} · {product.category}
                  </div>
                  <div className="text-sm font-semibold text-[#1C1917] mt-0.5 truncate">
                    {product.name}
                  </div>
                  {best && (
                    <div className="mt-3 pt-3 border-t border-[#E7E2DA] flex items-center justify-between text-xs">
                      <span className="font-medium text-[#9D5C63]">
                        Best Value: {best.platform}
                      </span>
                      <span className="font-mono-num font-semibold text-[#1C1917]">
                        ₹{best.currentPrice.toLocaleString('en-IN')} · {best.rating}★
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Saved Outfits Preview */}
      {outfits.length > 0 && (
        <section className="bg-white border border-[#E7E2DA] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-editorial text-2xl font-semibold text-[#1C1917]">
              Recently Saved Outfits
            </h2>
            <button
              onClick={() => onNavigate('saved-decision')}
              className="text-xs font-medium text-[#9D5C63] hover:underline cursor-pointer"
            >
              Open Collections
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {outfits.slice(0, 3).map((outfit) => (
              <div key={outfit.id} className="p-4 rounded-lg bg-[#FAF8F5] border border-[#E7E2DA]">
                <div className="text-xs text-[#57534E]">
                  {outfit.occasion} · {outfit.collectionName}
                </div>
                <div className="text-sm font-semibold text-[#1C1917] mt-1">{outfit.title}</div>
                <div className="font-mono-num text-xs text-[#9D5C63] mt-2">
                  Est. ₹{outfit.totalCost.toLocaleString('en-IN')} · {outfit.items.length} pieces
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
