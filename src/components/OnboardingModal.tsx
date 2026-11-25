import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';
import { AppUser, StylePreferences } from '../types/stylesync';

interface OnboardingModalProps {
  onComplete: () => void;
}

const STYLE_OPTIONS = [
  'Minimalist',
  'Casual',
  'Traditional',
  'Western',
  'Streetwear',
  'Formal',
  'Ethnic',
  'Fusion',
  'Elegant',
  'Sporty',
];

const COLOR_OPTIONS = ['Ivory', 'Olive', 'Muted Rose', 'Charcoal', 'Warm Beige', 'Cobalt', 'Terracotta', 'Sage'];
const PLATFORM_OPTIONS = ['Myntra', 'Flipkart', 'Meesho'];
const OCCASION_OPTIONS = ['Work', 'Casual', 'Festive', 'Party', 'Travel', 'Wedding'];
const FIT_OPTIONS = ['Relaxed', 'Regular', 'Tailored', 'Oversized'];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ onComplete }) => {
  const { setDbUser, notify } = useAuth();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [prefs, setPrefs] = useState<StylePreferences>({
    preferredStyles: ['Minimalist', 'Fusion'],
    favoriteColors: ['Ivory', 'Olive', 'Muted Rose'],
    clothingPreferences: ['Breathable cotton', 'Tailored silhouettes'],
    preferredPlatforms: ['Myntra', 'Flipkart', 'Meesho'],
    budgetMin: 800,
    budgetMax: 4500,
    preferredBrands: ['Fabindia', 'W', 'Zara'],
    commonOccasions: ['Work', 'Casual', 'Festive'],
    fitPreference: 'Regular',
    sizes: { top: 'M', bottom: '30', footwear: 'UK 7' },
  });

  const [brandInput, setBrandInput] = useState('Fabindia, W, Zara, Mango');

  const toggleItem = (field: keyof Pick<StylePreferences, 'preferredStyles' | 'favoriteColors' | 'preferredPlatforms' | 'commonOccasions'>, value: string) => {
    setPrefs((prev) => {
      const current = prev[field];
      const exists = current.includes(value);
      return {
        ...prev,
        [field]: exists ? current.filter((v) => v !== value) : [...current, value],
      };
    });
  };

  const handleSave = async (skipped = false) => {
    setSaving(true);
    try {
      const parsedBrands = brandInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const data = await apiFetch<{ user: AppUser }>('/api/profile/onboarding', {
        method: 'POST',
        body: JSON.stringify({
          skipped,
          preferences: {
            ...prefs,
            preferredBrands: parsedBrands,
          },
        }),
      });
      setDbUser(data.user);
      notify(skipped ? 'Onboarding skipped — customize anytime in Fashion Twin.' : 'Style preferences saved.', 'success');
      onComplete();
    } catch (err: any) {
      notify(err.message || 'Could not save onboarding preferences.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#FAF8F5] border border-[#E7E2DA] rounded-2xl max-w-2xl w-full p-6 md:p-8 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <p className="text-xs font-medium text-[#9D5C63] mb-1">
              Personalize Your Fashion Twin · Step {step} of 3
            </p>
            <h2 className="font-editorial text-3xl font-semibold text-[#1C1917]">
              Tell us how you like to dress
            </h2>
          </div>
          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            className="text-xs font-medium text-[#57534E] hover:text-[#1C1917] inline-flex items-center gap-1 cursor-pointer"
          >
            Skip for now <X className="w-4 h-4" />
          </button>
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-[#1C1917] mb-3">
                Preferred Fashion Styles
              </label>
              <div className="flex flex-wrap gap-2">
                {STYLE_OPTIONS.map((style) => {
                  const active = prefs.preferredStyles.includes(style);
                  return (
                    <button
                      key={style}
                      type="button"
                      onClick={() => toggleItem('preferredStyles', style)}
                      className={`px-3.5 py-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#1C1917] text-white border-[#1C1917]'
                          : 'bg-white text-[#44403C] border-[#E2DBD0] hover:bg-[#F2EDE6]'
                      }`}
                    >
                      {style}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1C1917] mb-3">
                Favorite Colors
              </label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((color) => {
                  const active = prefs.favoriteColors.includes(color);
                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => toggleItem('favoriteColors', color)}
                      className={`px-3.5 py-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#9D5C63] text-white border-[#9D5C63]'
                          : 'bg-white text-[#44403C] border-[#E2DBD0] hover:bg-[#F2EDE6]'
                      }`}
                    >
                      {color}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-[#1C1917] mb-3">
                Preferred Shopping Platforms
              </label>
              <div className="flex flex-wrap gap-2">
                {PLATFORM_OPTIONS.map((platform) => {
                  const active = prefs.preferredPlatforms.includes(platform);
                  return (
                    <button
                      key={platform}
                      type="button"
                      onClick={() => toggleItem('preferredPlatforms', platform)}
                      className={`px-4 py-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#1C1917] text-white border-[#1C1917]'
                          : 'bg-white text-[#44403C] border-[#E2DBD0] hover:bg-[#F2EDE6]'
                      }`}
                    >
                      {platform}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#57534E] mb-1.5">
                  Typical Minimum Budget (₹)
                </label>
                <input
                  type="number"
                  value={prefs.budgetMin}
                  onChange={(e) => setPrefs({ ...prefs, budgetMin: Number(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#E2DBD0] rounded-lg text-sm font-mono-num"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#57534E] mb-1.5">
                  Typical Maximum Budget (₹)
                </label>
                <input
                  type="number"
                  value={prefs.budgetMax}
                  onChange={(e) => setPrefs({ ...prefs, budgetMax: Number(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#E2DBD0] rounded-lg text-sm font-mono-num"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#57534E] mb-1.5">
                Preferred Brands (comma-separated)
              </label>
              <input
                type="text"
                value={brandInput}
                onChange={(e) => setBrandInput(e.target.value)}
                placeholder="Fabindia, Zara, H&M, W"
                className="w-full px-3.5 py-2.5 bg-white border border-[#E2DBD0] rounded-lg text-sm"
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-[#1C1917] mb-3">
                Common Occasions
              </label>
              <div className="flex flex-wrap gap-2">
                {OCCASION_OPTIONS.map((occ) => {
                  const active = prefs.commonOccasions.includes(occ);
                  return (
                    <button
                      key={occ}
                      type="button"
                      onClick={() => toggleItem('commonOccasions', occ)}
                      className={`px-3.5 py-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#1C1917] text-white border-[#1C1917]'
                          : 'bg-white text-[#44403C] border-[#E2DBD0] hover:bg-[#F2EDE6]'
                      }`}
                    >
                      {occ}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1C1917] mb-2">Fit Preference</label>
              <div className="flex flex-wrap gap-2">
                {FIT_OPTIONS.map((fit) => (
                  <button
                    key={fit}
                    type="button"
                    onClick={() => setPrefs({ ...prefs, fitPreference: fit })}
                    className={`px-3.5 py-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                      prefs.fitPreference === fit
                        ? 'bg-[#9D5C63] text-white border-[#9D5C63]'
                        : 'bg-white text-[#44403C] border-[#E2DBD0]'
                    }`}
                  >
                    {fit}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#57534E] mb-1.5">
                  Top Size (Optional)
                </label>
                <input
                  type="text"
                  value={prefs.sizes.top || ''}
                  onChange={(e) =>
                    setPrefs({ ...prefs, sizes: { ...prefs.sizes, top: e.target.value } })
                  }
                  placeholder="M"
                  className="w-full px-3 py-2 bg-white border border-[#E2DBD0] rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#57534E] mb-1.5">
                  Bottom Size (Optional)
                </label>
                <input
                  type="text"
                  value={prefs.sizes.bottom || ''}
                  onChange={(e) =>
                    setPrefs({ ...prefs, sizes: { ...prefs.sizes, bottom: e.target.value } })
                  }
                  placeholder="30"
                  className="w-full px-3 py-2 bg-white border border-[#E2DBD0] rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#57534E] mb-1.5">
                  Footwear (Optional)
                </label>
                <input
                  type="text"
                  value={prefs.sizes.footwear || ''}
                  onChange={(e) =>
                    setPrefs({ ...prefs, sizes: { ...prefs.sizes, footwear: e.target.value } })
                  }
                  placeholder="UK 7"
                  className="w-full px-3 py-2 bg-white border border-[#E2DBD0] rounded-lg text-sm"
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-8 mt-8 border-t border-[#E7E2DA]">
          <button
            type="button"
            disabled={step === 1}
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            className="px-4 py-2 text-sm font-medium text-[#57534E] hover:text-[#1C1917] disabled:opacity-40 cursor-pointer"
          >
            Back
          </button>

          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="px-5 py-2.5 text-sm font-medium text-white bg-[#1C1917] rounded-lg hover:bg-[#342F2C] cursor-pointer"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave(false)}
              className="px-6 py-2.5 text-sm font-medium text-white bg-[#9D5C63] rounded-lg hover:bg-[#864B52] disabled:opacity-60 cursor-pointer"
            >
              {saving ? 'Saving Profile...' : 'Save & Open Studio'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
