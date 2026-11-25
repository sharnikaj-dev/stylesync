import React, { useEffect, useState } from 'react';
import { Heart, Info, Trash2, Upload, Wand2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch, fileToDataUrl } from '../services/api';
import { Product, VirtualTryOnRecord } from '../types/stylesync';
import { ImageWithFallback } from '../components/ui/ImageWithFallback';

export const VirtualTryOnView: React.FC = () => {
  const { notify } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | ''>('');
  const [personImage, setPersonImage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [savedTryOns, setSavedTryOns] = useState<VirtualTryOnRecord[]>([]);
  const [result, setResult] = useState<{
    fitAnalysis?: {
      colorHarmony: string;
      silhouetteFitNote: string;
      recommendedPairings: string[];
      overallVerdict: string;
    };
    generatedImage?: string | null;
    requiresPaidKey?: boolean;
    setupMessage?: string | null;
    demoLookbookImage?: string;
    product?: { name: string; category: string; color: string; imageUrl: string };
  } | null>(null);

  useEffect(() => {
    Promise.all([
      apiFetch<{ products: Product[] }>('/api/products').catch(() => ({ products: [] })),
      apiFetch<{ tryOns: VirtualTryOnRecord[] }>('/api/virtual-try-ons').catch(() => ({
        tryOns: [],
      })),
    ]).then(([p, t]) => {
      const list = p.products || [];
      setProducts(list);
      if (list.length > 0) setSelectedProductId(list[0].id);
      setSavedTryOns(t.tryOns || []);
    });
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      setPersonImage(dataUrl);
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleRunTryOn = async () => {
    if (!personImage) {
      notify('Please upload your photograph first.', 'error');
      return;
    }
    setProcessing(true);
    try {
      const data = await apiFetch<any>('/api/ai/virtual-try-on', {
        method: 'POST',
        body: JSON.stringify({
          personImage,
          productId: selectedProductId || undefined,
        }),
      });
      setResult(data);
      if (data.savedRecord) {
        setSavedTryOns((prev) => [data.savedRecord, ...prev]);
      }
      notify('Virtual Try-On evaluation completed.', 'success');
    } catch (err: any) {
      notify(err.message || 'Virtual try-on failed.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const toggleFavorite = async (id: number) => {
    try {
      const data = await apiFetch<{ tryOn: VirtualTryOnRecord }>(
        `/api/virtual-try-ons/${id}/favorite`,
        { method: 'PATCH' },
      );
      setSavedTryOns((prev) => prev.map((t) => (t.id === id ? data.tryOn : t)));
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const deleteTryOn = async (id: number) => {
    try {
      await apiFetch(`/api/virtual-try-ons/${id}`, { method: 'DELETE' });
      setSavedTryOns((prev) => prev.filter((t) => t.id !== id));
      notify('Try-on preview deleted.', 'info');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-medium text-[#9D5C63] mb-1">
          Fit, Drape & Garment Preview Studio
        </p>
        <h1 className="font-editorial text-3xl lg:text-4xl font-semibold text-[#1C1917]">
          AI Virtual Try-On Studio
        </h1>
        <p className="text-sm text-[#57534E] mt-1 max-w-2xl">
          Upload a clear portrait or full-length photo and select a garment from the catalog to
          evaluate drape, color harmony, and AI try-on synthesis.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-white border border-[#E7E2DA] rounded-xl p-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-[#1C1917] mb-2">
              1. Upload Your Photograph
            </label>
            <label className="block border-2 border-dashed border-[#D6CEC2] rounded-xl p-5 text-center hover:border-[#9D5C63] cursor-pointer bg-[#FAF8F5]">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleUpload}
                className="hidden"
              />
              {personImage ? (
                <img
                  src={personImage}
                  alt="Person upload"
                  className="max-h-56 mx-auto rounded-lg object-cover"
                />
              ) : (
                <div className="py-5">
                  <Upload className="w-6 h-6 mx-auto text-[#9D5C63] mb-2" />
                  <div className="text-sm font-medium text-[#1C1917]">Select Photograph</div>
                  <div className="text-xs text-[#57534E] mt-1">JPEG, PNG, or WebP</div>
                </div>
              )}
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1C1917] mb-2">
              2. Select Garment (Kurtis, Tops, Dresses, Trousers)
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E2DBD0] rounded-lg text-sm"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.category} · {p.color})
                </option>
              ))}
            </select>
          </div>

          {selectedProduct && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-[#FAF8F5] border border-[#E7E2DA]">
              <ImageWithFallback
                src={selectedProduct.imageUrl}
                alt={selectedProduct.name}
                className="w-16 h-16 rounded-md object-cover shrink-0"
              />
              <div className="min-w-0">
                <div className="text-sm font-semibold text-[#1C1917] truncate">
                  {selectedProduct.name}
                </div>
                <div className="text-xs text-[#57534E]">
                  {selectedProduct.brand} · {selectedProduct.style}
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleRunTryOn}
            disabled={processing || !personImage}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-medium text-white bg-[#1C1917] rounded-lg hover:bg-[#342F2C] disabled:opacity-50 cursor-pointer"
          >
            <Wand2 className="w-4 h-4" />
            {processing ? 'Processing Virtual Try-On...' : 'Generate Virtual Try-On'}
          </button>
        </div>

        {/* Comparison & Fit Result */}
        <div className="lg:col-span-7 bg-white border border-[#E7E2DA] rounded-xl p-6 space-y-5">
          {!result ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-16 text-[#57534E]">
              <Wand2 className="w-8 h-8 opacity-40 mb-3" />
              <div className="text-sm font-medium text-[#1C1917]">
                Upload a photo and select a garment to begin
              </div>
              <p className="text-xs max-w-md mt-1">
                Gemini analyzes complexion harmony and silhouette drape, and generates a photoreal
                try-on render when a billing-enabled Gemini key is active.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {result.requiresPaidKey && result.setupMessage && (
                <div className="p-3.5 rounded-lg bg-[#F2EDE6] border border-[#E2DBD0] flex items-start gap-2.5 text-xs text-[#44403C]">
                  <Info className="w-4 h-4 text-[#9D5C63] shrink-0 mt-0.5" />
                  <div>{result.setupMessage}</div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-medium text-[#57534E] mb-2">Original Photo</div>
                  <div className="aspect-[3/4] rounded-xl overflow-hidden border border-[#E7E2DA] bg-[#EFEAE2]">
                    <ImageWithFallback
                      src={personImage}
                      alt="Original photo"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-[#57534E] mb-2">
                    {result.generatedImage
                      ? 'AI Virtual Try-On Preview'
                      : 'Garment Lookbook Reference (Demonstration Mode)'}
                  </div>
                  <div className="aspect-[3/4] rounded-xl overflow-hidden border border-[#E7E2DA] bg-[#EFEAE2]">
                    <ImageWithFallback
                      src={result.generatedImage || result.demoLookbookImage}
                      alt="Try-on result"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>

              {result.fitAnalysis && (
                <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA] space-y-2.5">
                  <div className="text-sm font-semibold text-[#1C1917]">
                    Gemini Fit & Color Harmony Report
                  </div>
                  <p className="text-xs text-[#44403C]">
                    <span className="font-semibold">Color Harmony: </span>
                    {result.fitAnalysis.colorHarmony}
                  </p>
                  <p className="text-xs text-[#44403C]">
                    <span className="font-semibold">Drape & Silhouette: </span>
                    {result.fitAnalysis.silhouetteFitNote}
                  </p>
                  <p className="text-xs text-[#44403C]">
                    <span className="font-semibold">Recommended Pairings: </span>
                    {result.fitAnalysis.recommendedPairings.join(' · ')}
                  </p>
                  <p className="text-xs font-medium text-[#9D5C63]">
                    {result.fitAnalysis.overallVerdict}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Saved Previews */}
      {savedTryOns.length > 0 && (
        <section className="bg-white border border-[#E7E2DA] rounded-xl p-6">
          <h2 className="font-editorial text-2xl font-semibold text-[#1C1917] mb-4">
            Saved Try-On Previews
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {savedTryOns.map((item) => (
              <div
                key={item.id}
                className="border border-[#E7E2DA] rounded-xl overflow-hidden bg-[#FAF8F5]"
              >
                <div className="aspect-[3/4]">
                  <ImageWithFallback
                    src={item.generatedImage}
                    alt={item.productName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate">{item.productName}</div>
                    <div className="text-[11px] text-[#57534E]">{item.productCategory}</div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => toggleFavorite(item.id)}
                      className="p-1.5 rounded hover:bg-[#EAE3D9] cursor-pointer"
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          item.isFavorite ? 'fill-[#9D5C63] text-[#9D5C63]' : 'text-[#57534E]'
                        }`}
                      />
                    </button>
                    <button
                      onClick={() => deleteTryOn(item.id)}
                      className="p-1.5 rounded hover:bg-[#FAE6E6] text-[#8B2E2E] cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
