import React, { useState } from 'react';
import { Check, Palette, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';
import { AppUser, StylePreferences } from '../types/stylesync';

const SEASONAL_COLLECTIONS = [
  {
    season: 'Spring Botanical',
    colors: [
      { name: 'Sage Leaf', hex: '#7A8C74' },
      { name: 'Warm Ivory', hex: '#F3EDE2' },
      { name: 'Dusty Rose', hex: '#B87A7C' },
      { name: 'Soft Sand', hex: '#D8CBB8' },
    ],
  },
  {
    season: 'Summer Linen',
    colors: [
      { name: 'Chalk White', hex: '#FAF8F5' },
      { name: 'Chambray Blue', hex: '#6B8299' },
      { name: 'Oatmeal', hex: '#D6C8B4' },
      { name: 'Olive Mist', hex: '#697355' },
    ],
  },
  {
    season: 'Autumn Terracotta',
    colors: [
      { name: 'Rust Clay', hex: '#A45A45' },
      { name: 'Camel Beige', hex: '#C5A880' },
      { name: 'Deep Olive', hex: '#4B5842' },
      { name: 'Cognac', hex: '#8F5132' },
    ],
  },
  {
    season: 'Winter Espresso',
    colors: [
      { name: 'Charcoal', hex: '#2B2927' },
      { name: 'Espresso', hex: '#4A3B32' },
      { name: 'Pearl Grey', hex: '#D6D4D0' },
      { name: 'Burgundy', hex: '#6D2E3A' },
    ],
  },
];

export const ColorLabAndTwinView: React.FC<{ initialMode?: 'color' | 'twin' }> = ({
  initialMode = 'color',
}) => {
  const { dbUser, setDbUser, notify } = useAuth();
  const [mode, setMode] = useState<'color' | 'twin'>(initialMode);

  // Color Lab state
  const [topHex, setTopHex] = useState('#556B2F');
  const [bottomHex, setBottomHex] = useState('#F3EDE2');
  const [layerHex, setLayerHex] = useState('#B87A7C');
  const [accentMetal, setAccentMetal] = useState<'Gold' | 'Silver' | 'Rose Gold'>('Gold');

  // Fashion Twin Profile editable state
  const existingPrefs: StylePreferences = dbUser?.stylePreferences || {
    preferredStyles: ['Minimalist', 'Fusion'],
    favoriteColors: ['Ivory', 'Olive', 'Muted Rose'],
    clothingPreferences: [],
    preferredPlatforms: ['Myntra', 'Flipkart', 'Meesho'],
    budgetMin: 800,
    budgetMax: 5000,
    preferredBrands: ['Fabindia', 'Zara'],
    commonOccasions: ['Work', 'Casual', 'Festive'],
    fitPreference: 'Regular',
    sizes: { top: 'M', bottom: '30', footwear: 'UK 7' },
  };

  const [displayName, setDisplayName] = useState(dbUser?.displayName || '');
  const [stylesText, setStylesText] = useState(existingPrefs.preferredStyles.join(', '));
  const [colorsText, setColorsText] = useState(existingPrefs.favoriteColors.join(', '));
  const [brandsText, setBrandsText] = useState(existingPrefs.preferredBrands.join(', '));
  const [occasionsText, setOccasionsText] = useState(existingPrefs.commonOccasions.join(', '));
  const [budgetMin, setBudgetMin] = useState(existingPrefs.budgetMin);
  const [budgetMax, setBudgetMax] = useState(existingPrefs.budgetMax);
  const [fitPreference, setFitPreference] = useState(existingPrefs.fitPreference);
  const [saving, setSaving] = useState(false);

  const applySeason = (seasonColors: Array<{ name: string; hex: string }>) => {
    setTopHex(seasonColors[0].hex);
    setBottomHex(seasonColors[1].hex);
    setLayerHex(seasonColors[2].hex);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const split = (str: string) =>
        str
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);

      const updatedPrefs: StylePreferences = {
        ...existingPrefs,
        preferredStyles: split(stylesText),
        favoriteColors: split(colorsText),
        preferredBrands: split(brandsText),
        commonOccasions: split(occasionsText),
        budgetMin: Number(budgetMin) || 500,
        budgetMax: Number(budgetMax) || 5000,
        fitPreference,
      };

      const res = await apiFetch<{ user: AppUser }>('/api/profile/preferences', {
        method: 'PUT',
        body: JSON.stringify({
          displayName,
          stylePreferences: updatedPrefs,
        }),
      });
      setDbUser(res.user);
      notify('Fashion Twin profile updated.', 'success');
    } catch (err: any) {
      notify(err.message || 'Could not update Fashion Twin.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#9D5C63] mb-1">
            Palette Experimentation & Personalization
          </p>
          <h1 className="font-editorial text-3xl lg:text-4xl font-semibold text-[#1C1917]">
            {mode === 'color' ? 'AI Fashion Color Laboratory' : 'AI Fashion Twin & Style Profile'}
          </h1>
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#EAE3D9] rounded-lg shrink-0">
          <button
            onClick={() => setMode('color')}
            className={`px-3.5 py-2 text-xs font-medium rounded-md cursor-pointer ${
              mode === 'color' ? 'bg-white text-[#1C1917] shadow-xs' : 'text-[#57534E]'
            }`}
          >
            Color Laboratory
          </button>
          <button
            onClick={() => setMode('twin')}
            className={`px-3.5 py-2 text-xs font-medium rounded-md cursor-pointer ${
              mode === 'twin' ? 'bg-white text-[#1C1917] shadow-xs' : 'text-[#57534E]'
            }`}
          >
            Fashion Twin Profile
          </button>
        </div>
      </div>

      {mode === 'color' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Interactive Silhouette Preview */}
          <div className="lg:col-span-5 bg-white border border-[#E7E2DA] rounded-xl p-6 flex flex-col items-center justify-between">
            <div className="w-full flex items-center justify-between text-xs text-[#57534E] mb-4">
              <span>Live Outfit Color Harmony Preview</span>
              <span>{accentMetal} Accents</span>
            </div>

            <svg
              viewBox="0 0 220 300"
              className="w-56 h-72"
              role="img"
              aria-label="Interactive outfit color preview"
            >
              {/* Layer / Blazer / Dupatta Drape */}
              <path
                d="M52 55 L168 55 L182 175 L154 180 L145 78 L75 78 L66 180 L38 175 Z"
                fill={layerHex}
                stroke="#1C1917"
                strokeOpacity="0.15"
              />
              {/* Top / Kurti */}
              <path
                d="M72 48 L148 48 L156 148 L64 148 Z"
                fill={topHex}
                stroke="#1C1917"
                strokeOpacity="0.15"
              />
              {/* Bottom / Trousers */}
              <path
                d="M68 150 L152 150 L162 275 L120 275 L110 192 L100 275 L58 275 Z"
                fill={bottomHex}
                stroke="#1C1917"
                strokeOpacity="0.18"
              />
              {/* Jewellery / Hardware Dot */}
              <circle
                cx="110"
                cy="66"
                r="6"
                fill={
                  accentMetal === 'Gold'
                    ? '#D4AF37'
                    : accentMetal === 'Rose Gold'
                      ? '#C98A7A'
                      : '#C0C5CE'
                }
              />
            </svg>

            <div className="w-full grid grid-cols-3 gap-2 pt-4 border-t border-[#E7E2DA] text-center text-xs">
              <div>
                <div className="text-[#57534E]">Top</div>
                <div className="font-mono-num font-medium">{topHex}</div>
              </div>
              <div>
                <div className="text-[#57534E]">Bottom</div>
                <div className="font-mono-num font-medium">{bottomHex}</div>
              </div>
              <div>
                <div className="text-[#57534E]">Layer</div>
                <div className="font-mono-num font-medium">{layerHex}</div>
              </div>
            </div>
          </div>

          {/* Controls & Seasonal Collections */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white border border-[#E7E2DA] rounded-xl p-6 space-y-5">
              <h2 className="font-editorial text-2xl font-semibold text-[#1C1917]">
                Customize Garment Shades
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#57534E] mb-1.5">
                    Top / Kurti Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={topHex}
                      onChange={(e) => setTopHex(e.target.value)}
                      className="w-10 h-10 rounded border border-[#E2DBD0] cursor-pointer"
                    />
                    <span className="font-mono-num text-xs">{topHex}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#57534E] mb-1.5">
                    Bottom Wear Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={bottomHex}
                      onChange={(e) => setBottomHex(e.target.value)}
                      className="w-10 h-10 rounded border border-[#E2DBD0] cursor-pointer"
                    />
                    <span className="font-mono-num text-xs">{bottomHex}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#57534E] mb-1.5">
                    Layer / Dupatta
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={layerHex}
                      onChange={(e) => setLayerHex(e.target.value)}
                      className="w-10 h-10 rounded border border-[#E2DBD0] cursor-pointer"
                    />
                    <span className="font-mono-num text-xs">{layerHex}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#57534E] mb-2">
                  Hardware & Jewellery Tone
                </label>
                <div className="flex gap-2">
                  {(['Gold', 'Silver', 'Rose Gold'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setAccentMetal(m)}
                      className={`px-3.5 py-1.5 text-xs font-medium rounded-lg border cursor-pointer ${
                        accentMetal === m
                          ? 'bg-[#1C1917] text-white border-[#1C1917]'
                          : 'bg-[#FAF8F5] text-[#44403C] border-[#E2DBD0]'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white border border-[#E7E2DA] rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-[#9D5C63]" />
                <h2 className="font-editorial text-2xl font-semibold text-[#1C1917]">
                  Seasonal Color Collections
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {SEASONAL_COLLECTIONS.map((col) => (
                  <button
                    key={col.season}
                    onClick={() => applySeason(col.colors)}
                    className="text-left p-4 rounded-xl border border-[#E7E2DA] bg-[#FAF8F5] hover:border-[#9D5C63] transition-colors cursor-pointer"
                  >
                    <div className="text-sm font-semibold text-[#1C1917] mb-2">{col.season}</div>
                    <div className="flex gap-2">
                      {col.colors.map((c) => (
                        <div key={c.name} className="flex-1">
                          <div
                            className="h-7 rounded border border-black/10"
                            style={{ backgroundColor: c.hex }}
                          />
                          <div className="text-[10px] text-[#57534E] mt-1 truncate">{c.name}</div>
                        </div>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Fashion Twin Profile */
        <form
          onSubmit={handleSaveProfile}
          className="bg-white border border-[#E7E2DA] rounded-xl p-6 lg:p-8 space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E7E2DA]">
            <div>
              <h2 className="font-editorial text-2xl font-semibold text-[#1C1917]">
                Your Fashion Twin Memory
              </h2>
              <p className="text-xs text-[#57534E] mt-1">
                {dbUser?.fashionTwinProfile?.styleSummary ||
                  'All AI recommendations adapt to these saved preferences.'}
              </p>
            </div>
            <div className="text-xs text-[#9D5C63] font-medium inline-flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              {dbUser?.fashionTwinProfile?.feedbackCount || 0} preference signals learned
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-medium text-[#57534E] mb-1.5">
                Display Name
              </label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E2DBD0] rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#57534E] mb-1.5">
                Preferred Fit
              </label>
              <select
                value={fitPreference}
                onChange={(e) => setFitPreference(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E2DBD0] rounded-lg text-sm"
              >
                <option>Relaxed</option>
                <option>Regular</option>
                <option>Tailored</option>
                <option>Oversized</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#57534E] mb-1.5">
                Preferred Fashion Styles
              </label>
              <input
                value={stylesText}
                onChange={(e) => setStylesText(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E2DBD0] rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#57534E] mb-1.5">
                Favorite Colors
              </label>
              <input
                value={colorsText}
                onChange={(e) => setColorsText(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E2DBD0] rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#57534E] mb-1.5">
                Preferred Brands
              </label>
              <input
                value={brandsText}
                onChange={(e) => setBrandsText(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E2DBD0] rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#57534E] mb-1.5">
                Common Occasions
              </label>
              <input
                value={occasionsText}
                onChange={(e) => setOccasionsText(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E2DBD0] rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#57534E] mb-1.5">
                Minimum Budget (₹)
              </label>
              <input
                type="number"
                value={budgetMin}
                onChange={(e) => setBudgetMin(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E2DBD0] rounded-lg text-sm font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#57534E] mb-1.5">
                Maximum Budget (₹)
              </label>
              <input
                type="number"
                value={budgetMax}
                onChange={(e) => setBudgetMax(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E2DBD0] rounded-lg text-sm font-mono-num"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-[#1C1917] rounded-lg hover:bg-[#342F2C] cursor-pointer"
            >
              <Check className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Fashion Twin'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
