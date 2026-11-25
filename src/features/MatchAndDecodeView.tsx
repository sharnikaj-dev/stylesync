import React, { useState } from 'react';
import { Bookmark, CheckCircle2, ExternalLink, ScanSearch, Shirt, Upload } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch, fileToDataUrl } from '../services/api';
import { ImageWithFallback } from '../components/ui/ImageWithFallback';

export const MatchAndDecodeView: React.FC = () => {
  const { notify } = useAuth();
  const [mode, setMode] = useState<'decoder' | 'matcher'>('decoder');
  const [imageData, setImageData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [decodedResult, setDecodedResult] = useState<any>(null);
  const [matchedResult, setMatchedResult] = useState<any>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await fileToDataUrl(file);
      setImageData(url);
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const runAnalysis = async () => {
    if (!imageData) {
      notify('Please upload an image first.', 'error');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'decoder') {
        const res = await apiFetch<{ decoded: any }>('/api/ai/inspiration-decoder', {
          method: 'POST',
          body: JSON.stringify({ imageData }),
        });
        setDecodedResult(res.decoded);
        notify('Inspiration outfit decoded against your wardrobe.', 'success');
      } else {
        const res = await apiFetch<{ matched: any }>('/api/ai/outfit-matcher', {
          method: 'POST',
          body: JSON.stringify({ imageData }),
        });
        setMatchedResult(res.matched);
        notify('Generated 3 matching combinations for your garment.', 'success');
      }
    } catch (err: any) {
      notify(err.message || 'Analysis failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const saveCombo = async (title: string, items: any[], totalCost: number, source: string, notes: string) => {
    try {
      await apiFetch('/api/outfits', {
        method: 'POST',
        body: JSON.stringify({
          title,
          occasion: 'Casual',
          collectionName: source === 'inspiration' ? 'Recreated Looks' : 'Matched Outfits',
          totalCost,
          source,
          items: items.map((i) => ({
            slot: i.slot,
            name: i.name || i.affordableAlternative || i.detectedItem,
            color: i.color || 'Neutral',
            price: i.price ?? i.estimatedPrice ?? 0,
            platform: i.platform || 'Myntra',
            productUrl: i.productUrl || '',
            explanation: i.matchedWardrobeItem
              ? `Reused from wardrobe: ${i.matchedWardrobeItem}`
              : 'Matched combination piece',
            isOwned: Boolean(i.isOwned || i.reuseStatus === 'owned'),
          })),
          stylingNotes: notes,
        }),
      });
      notify('Saved look to your Collections.', 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#9D5C63] mb-1">
            Visual Recognition · Wardrobe Reuse
          </p>
          <h1 className="font-editorial text-3xl lg:text-4xl font-semibold text-[#1C1917]">
            {mode === 'decoder'
              ? 'Inspiration Decoder & Outfit Recreator'
              : 'AI Garment Outfit Matcher'}
          </h1>
          <p className="text-sm text-[#57534E] mt-1 max-w-2xl">
            {mode === 'decoder'
              ? 'Upload an editorial or celebrity inspiration look. Gemini breaks down each piece, compares it against your Digital Wardrobe, and suggests affordable buys only for missing items.'
              : 'Upload a garment you already own (e.g. an oversized tee, kurti, or jeans) to get three complete matching outfit combinations.'}
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#EAE3D9] rounded-lg shrink-0">
          <button
            onClick={() => {
              setMode('decoder');
              setMatchedResult(null);
            }}
            className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              mode === 'decoder' ? 'bg-white text-[#1C1917] shadow-xs' : 'text-[#57534E]'
            }`}
          >
            Inspiration Decoder
          </button>
          <button
            onClick={() => {
              setMode('matcher');
              setDecodedResult(null);
            }}
            className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              mode === 'matcher' ? 'bg-white text-[#1C1917] shadow-xs' : 'text-[#57534E]'
            }`}
          >
            Outfit Matcher
          </button>
        </div>
      </div>

      {/* Upload Section */}
      <section className="bg-white border border-[#E7E2DA] rounded-xl p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        <div className="lg:col-span-5">
          <label className="block border-2 border-dashed border-[#D6CEC2] rounded-xl p-6 text-center hover:border-[#9D5C63] cursor-pointer bg-[#FAF8F5]">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFile}
              className="hidden"
            />
            {imageData ? (
              <img
                src={imageData}
                alt="Uploaded fashion reference"
                className="max-h-56 mx-auto rounded-lg object-cover"
              />
            ) : (
              <div className="py-6">
                <Upload className="w-7 h-7 mx-auto text-[#9D5C63] mb-2" />
                <div className="text-sm font-medium text-[#1C1917]">
                  {mode === 'decoder'
                    ? 'Upload Inspiration Screenshot'
                    : 'Upload Existing Garment Photo'}
                </div>
                <div className="text-xs text-[#57534E] mt-1">JPEG, PNG, or WebP</div>
              </div>
            )}
          </label>
        </div>

        <div className="lg:col-span-7 space-y-4">
          <div className="text-sm text-[#44403C] leading-relaxed">
            {mode === 'decoder'
              ? 'We scan categories, dominant colors, and accessories, then cross-check your Digital Wardrobe so you prioritize pieces you already own before shopping.'
              : 'We detect garment category, fabric pattern, and color tone to assemble complete combinations with footwear, bags, watches, and jewellery.'}
          </div>
          <button
            onClick={runAnalysis}
            disabled={loading || !imageData}
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-[#1C1917] rounded-lg hover:bg-[#342F2C] disabled:opacity-50 cursor-pointer"
          >
            {mode === 'decoder' ? (
              <ScanSearch className="w-4 h-4" />
            ) : (
              <Shirt className="w-4 h-4" />
            )}
            {loading
              ? 'Analyzing Image...'
              : mode === 'decoder'
                ? 'Decode & Recreate from Wardrobe'
                : 'Generate Matching Outfits'}
          </button>
        </div>
      </section>

      {/* Inspiration Decoder Output */}
      {mode === 'decoder' && decodedResult && (
        <section className="bg-white border border-[#E7E2DA] rounded-xl p-6 lg:p-8 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4">
              <div className="text-xs font-medium text-[#57534E] mb-2">Original Inspiration</div>
              <div className="aspect-[3/4] rounded-xl overflow-hidden border border-[#E7E2DA]">
                <ImageWithFallback
                  src={imageData}
                  alt="Original inspiration"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div className="lg:col-span-8 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E7E2DA]">
                <div>
                  <div className="text-xs text-[#9D5C63] font-medium">
                    {decodedResult.dominantColors?.join(' · ')}
                  </div>
                  <h2 className="font-editorial text-2xl font-semibold text-[#1C1917] mt-0.5">
                    {decodedResult.overallAesthetic}
                  </h2>
                </div>
                <button
                  onClick={() => {
                    const missingCost = (decodedResult.components || []).reduce(
                      (acc: number, c: any) =>
                        acc + (c.reuseStatus === 'owned' ? 0 : c.estimatedPrice || 0),
                      0,
                    );
                    saveCombo(
                      `Recreated: ${decodedResult.overallAesthetic}`,
                      decodedResult.components || [],
                      missingCost,
                      'inspiration',
                      decodedResult.stylingBreakdown,
                    );
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#9D5C63] rounded-lg hover:bg-[#864B52] shrink-0 cursor-pointer"
                >
                  <Bookmark className="w-3.5 h-3.5" /> Save Recreated Look
                </button>
              </div>

              <p className="text-sm text-[#44403C]">{decodedResult.stylingBreakdown}</p>
              <div className="p-3.5 rounded-lg bg-[#F2F7F3] border border-[#BBD3BF] text-xs text-[#284D31]">
                {decodedResult.reuseSavingsNote}
              </div>

              <div className="space-y-3">
                {(decodedResult.components || []).map((comp: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-semibold text-[#1C1917]">{comp.slot}</span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={`font-medium ${
                            comp.reuseStatus === 'owned'
                              ? 'text-[#284D31]'
                              : comp.reuseStatus === 'similar'
                                ? 'text-[#9D5C63]'
                                : 'text-[#57534E]'
                          }`}
                        >
                          {comp.reuseStatus === 'owned'
                            ? 'Owned in Wardrobe'
                            : comp.reuseStatus === 'similar'
                              ? 'Similar Available'
                              : 'Missing Item'}
                        </span>
                      </div>
                      <div className="text-sm font-medium text-[#1C1917] mt-1">
                        {comp.detectedItem} ({comp.color})
                      </div>
                      {comp.matchedWardrobeItem && (
                        <div className="text-xs text-[#284D31] mt-1 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Use your:{' '}
                          {comp.matchedWardrobeItem}
                        </div>
                      )}
                      {comp.reuseStatus !== 'owned' && (
                        <div className="text-xs text-[#57534E] mt-1">
                          Affordable alternative: {comp.affordableAlternative}
                        </div>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono-num text-sm font-semibold text-[#1C1917]">
                        {comp.reuseStatus === 'owned'
                          ? '₹0'
                          : `~₹${(comp.estimatedPrice || 0).toLocaleString('en-IN')}`}
                      </div>
                      {comp.productUrl && comp.reuseStatus !== 'owned' && (
                        <a
                          href={comp.productUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-[#9D5C63] hover:underline mt-1"
                        >
                          {comp.platform || 'Explore'} <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Outfit Matcher Output */}
      {mode === 'matcher' && matchedResult && (
        <section className="space-y-6">
          <div className="bg-white border border-[#E7E2DA] rounded-xl p-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs text-[#9D5C63] font-medium">Detected Garment</div>
              <h2 className="font-editorial text-2xl font-semibold text-[#1C1917] mt-0.5">
                {matchedResult.detectedGarment?.dominantColor}{' '}
                {matchedResult.detectedGarment?.category}
              </h2>
              <p className="text-xs text-[#57534E] mt-1">
                Pattern: {matchedResult.detectedGarment?.pattern} · Style:{' '}
                {matchedResult.detectedGarment?.style}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {(matchedResult.combinations || []).map((combo: any, idx: number) => (
              <div
                key={idx}
                className="bg-white border border-[#E7E2DA] rounded-xl p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-[#57534E] mb-2">
                    <span className="font-medium text-[#9D5C63]">{combo.vibe}</span>
                    <span className="font-mono-num font-semibold text-[#1C1917]">
                      Add-on: ₹{(combo.totalAddOnCost || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <h3 className="font-editorial text-2xl font-semibold text-[#1C1917] mb-3">
                    {combo.title}
                  </h3>
                  <p className="text-xs text-[#57534E] mb-4">{combo.stylingNote}</p>

                  <div className="space-y-2.5 border-t border-[#E7E2DA] pt-3">
                    {(combo.items || []).map((it: any, iIdx: number) => (
                      <div key={iIdx} className="flex items-start justify-between gap-2 text-xs">
                        <div>
                          <div className="font-semibold text-[#1C1917]">
                            {it.slot}: {it.name}
                          </div>
                          <div className="text-[#57534E]">
                            {it.color} · {it.isOwned ? 'From Wardrobe' : it.platform || 'Shop'}
                          </div>
                        </div>
                        <div className="font-mono-num shrink-0">
                          {it.isOwned ? '₹0' : `₹${(it.price || 0).toLocaleString('en-IN')}`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() =>
                    saveCombo(
                      combo.title,
                      combo.items || [],
                      combo.totalAddOnCost || 0,
                      'matcher',
                      combo.stylingNote,
                    )
                  }
                  className="mt-5 w-full py-2.5 px-4 text-xs font-medium text-[#1C1917] bg-[#F2EDE6] rounded-lg hover:bg-[#EAE3D9] inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Bookmark className="w-3.5 h-3.5" /> Save Combination
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
