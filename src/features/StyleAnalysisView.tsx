import React, { useEffect, useState } from 'react';
import { Camera, Check, Edit3, Info, Trash2, Upload } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch, fileToDataUrl } from '../services/api';
import { StyleAnalysis } from '../types/stylesync';
import { ImageWithFallback } from '../components/ui/ImageWithFallback';

export const StyleAnalysisView: React.FC = () => {
  const { notify } = useAuth();
  const [analyses, setAnalyses] = useState<StyleAnalysis[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editSkinTone, setEditSkinTone] = useState('');
  const [editUndertone, setEditUndertone] = useState('');
  const [editStylesText, setEditStylesText] = useState('');

  const loadAnalyses = async () => {
    try {
      const data = await apiFetch<{ analyses: StyleAnalysis[] }>('/api/analysis/style');
      setAnalyses(data.analyses || []);
    } catch (err: any) {
      notify(err.message || 'Could not load previous style analyses.', 'error');
    }
  };

  useEffect(() => {
    loadAnalyses();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      setSelectedImage(dataUrl);
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleAnalyze = async () => {
    if (!selectedImage) {
      notify('Please upload a photograph first.', 'error');
      return;
    }
    setAnalyzing(true);
    try {
      const data = await apiFetch<{ analysis: StyleAnalysis }>('/api/analysis/style', {
        method: 'POST',
        body: JSON.stringify({ imageData: selectedImage, notes }),
      });
      setAnalyses((prev) => [data.analysis, ...prev]);
      setSelectedImage(null);
      setNotes('');
      notify('Personal style analysis completed.', 'success');
    } catch (err: any) {
      notify(err.message || 'Style analysis failed.', 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  const startEdit = (item: StyleAnalysis) => {
    setEditingId(item.id);
    setEditSkinTone(item.skinTone);
    setEditUndertone(item.undertone);
    setEditStylesText(item.personalStyles.join(', '));
  };

  const saveEdit = async (id: number) => {
    try {
      const styles = editStylesText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const data = await apiFetch<{ analysis: StyleAnalysis }>(`/api/analysis/style/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          skinTone: editSkinTone,
          undertone: editUndertone,
          personalStyles: styles,
        }),
      });
      setAnalyses((prev) => prev.map((a) => (a.id === id ? data.analysis : a)));
      setEditingId(null);
      notify('Analysis updated with your preferences.', 'success');
    } catch (err: any) {
      notify(err.message || 'Failed to save edits.', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await apiFetch(`/api/analysis/style/${id}`, { method: 'DELETE' });
      setAnalyses((prev) => prev.filter((a) => a.id !== id));
      notify('Uploaded photograph and analysis permanently deleted.', 'info');
    } catch (err: any) {
      notify(err.message || 'Failed to delete analysis.', 'error');
    }
  };

  const latest = analyses[0];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-medium text-[#9D5C63] mb-1">
          Computer Vision · Private & Editable
        </p>
        <h1 className="font-editorial text-3xl lg:text-4xl font-semibold text-[#1C1917]">
          AI Personal Style Analysis
        </h1>
        <p className="text-sm text-[#57534E] mt-1 max-w-2xl">
          Upload a clear daylight photograph for approximate skin undertone guidance, personalized
          color swatches, and positive silhouette pairing suggestions. You can edit or delete any
          uploaded photo and its report at any time.
        </p>
      </div>

      <div className="bg-[#F2EDE6] border border-[#E2DBD0] rounded-xl p-4 flex items-start gap-3 text-xs text-[#44403C]">
        <Info className="w-4 h-4 text-[#9D5C63] shrink-0 mt-0.5" />
        <div>
          Visual undertone and proportion readings are approximate stylistic estimates shaped by
          lighting and camera white balance—never definitive measurements. Wear every silhouette
          you love; these tips highlight effortless styling harmony.
        </div>
      </div>

      {/* Upload Box */}
      <section className="bg-white border border-[#E7E2DA] rounded-xl p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        <div className="lg:col-span-5">
          <label className="block border-2 border-dashed border-[#D6CEC2] rounded-xl p-6 text-center hover:border-[#9D5C63] transition-colors cursor-pointer bg-[#FAF8F5]">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
            {selectedImage ? (
              <div className="space-y-3">
                <img
                  src={selectedImage}
                  alt="Preview for style analysis"
                  className="max-h-56 mx-auto rounded-lg object-cover"
                />
                <span className="text-xs font-medium text-[#9D5C63] block">
                  Click to choose another photo
                </span>
              </div>
            ) : (
              <div className="py-6">
                <Upload className="w-7 h-7 mx-auto text-[#9D5C63] mb-3" />
                <div className="text-sm font-medium text-[#1C1917]">
                  Upload Portrait or Full-Look Photo
                </div>
                <div className="text-xs text-[#57534E] mt-1">
                  JPEG, PNG, or WebP up to 5.5 MB · Stored privately
                </div>
              </div>
            )}
          </label>
        </div>

        <div className="lg:col-span-7 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#57534E] mb-1.5">
              Optional Styling Context (e.g. preferred modesty, comfort, upcoming events)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="E.g., I love relaxed linen layers and earthy tones for work and festive dinners."
              className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E2DBD0] rounded-lg text-sm"
            />
          </div>
          <button
            onClick={handleAnalyze}
            disabled={analyzing || !selectedImage}
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-[#1C1917] rounded-lg hover:bg-[#342F2C] disabled:opacity-50 cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            {analyzing ? 'Analyzing Photo with Gemini...' : 'Run Personal Style Analysis'}
          </button>
        </div>
      </section>

      {/* Latest Report */}
      {latest && (
        <section className="bg-white border border-[#E7E2DA] rounded-xl p-6 lg:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E7E2DA]">
            <div>
              <p className="text-xs text-[#57534E]">
                Visual Report · {new Date(latest.createdAt).toLocaleDateString()}
                {latest.userEdited ? ' · Customized by you' : ''}
              </p>
              <h2 className="font-editorial text-2xl lg:text-3xl font-semibold text-[#1C1917] mt-1">
                Your Personalized Style & Palette Guide
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => startEdit(latest)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#F2EDE6] rounded-lg hover:bg-[#EAE3D9] cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit Results
              </button>
              <button
                onClick={() => handleDelete(latest.id)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#8B2E2E] bg-[#FDF2F2] border border-[#E5B8B8] rounded-lg hover:bg-[#FAE6E6] cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Photo & Data
              </button>
            </div>
          </div>

          {editingId === latest.id && (
            <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E2DBD0] grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#57534E] mb-1">
                  Approximate Skin Tone
                </label>
                <input
                  value={editSkinTone}
                  onChange={(e) => setEditSkinTone(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E2DBD0] rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#57534E] mb-1">
                  Undertone Estimate
                </label>
                <input
                  value={editUndertone}
                  onChange={(e) => setEditUndertone(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E2DBD0] rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#57534E] mb-1">
                  Personal Styles (comma-separated)
                </label>
                <input
                  value={editStylesText}
                  onChange={(e) => setEditStylesText(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E2DBD0] rounded-lg text-sm"
                />
              </div>
              <div className="md:col-span-3 flex justify-end gap-2">
                <button
                  onClick={() => setEditingId(null)}
                  className="px-4 py-2 text-xs font-medium text-[#57534E] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => saveEdit(latest.id)}
                  className="inline-flex items-center gap-1 px-4 py-2 text-xs font-medium text-white bg-[#1C1917] rounded-lg cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" /> Save Adjustments
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {latest.imageData && (
              <div className="lg:col-span-4">
                <div className="aspect-[3/4] rounded-xl overflow-hidden border border-[#E7E2DA] bg-[#EFEAE2]">
                  <ImageWithFallback
                    src={latest.imageData}
                    alt="Uploaded portrait"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            <div className={`${latest.imageData ? 'lg:col-span-8' : 'lg:col-span-12'} space-y-6`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA]">
                  <div className="text-xs text-[#57534E]">Approximate Skin Appearance</div>
                  <div className="text-base font-semibold text-[#1C1917] mt-1">
                    {latest.skinTone} · {latest.undertone} Undertone
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA]">
                  <div className="text-xs text-[#57534E]">Aligned Style Aesthetics</div>
                  <div className="text-base font-semibold text-[#1C1917] mt-1">
                    {latest.personalStyles.join(' · ')}
                  </div>
                </div>
              </div>

              {/* Color Palette */}
              <div>
                <h3 className="text-sm font-semibold text-[#1C1917] mb-3">
                  Personalized Color Palette
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {latest.colorPalette.map((swatch, idx) => (
                    <div
                      key={idx}
                      className="border border-[#E7E2DA] rounded-xl overflow-hidden bg-[#FAF8F5]"
                    >
                      <div
                        className="h-14 w-full"
                        style={{ backgroundColor: swatch.hex || '#C5B49A' }}
                      />
                      <div className="p-2.5">
                        <div className="text-xs font-semibold text-[#1C1917] truncate">
                          {swatch.name}
                        </div>
                        <div className="font-mono-num text-[11px] text-[#57534E]">
                          {swatch.hex}
                        </div>
                        <div className="text-[11px] text-[#57534E] mt-0.5 line-clamp-2">
                          {swatch.usage}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Body Proportions & Silhouettes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div>
                  <h3 className="text-sm font-semibold text-[#1C1917] mb-2">
                    Proportion & Silhouette Ideas
                  </h3>
                  <p className="text-xs text-[#57534E] mb-3">{latest.bodyProportions.summary}</p>
                  <ul className="space-y-1.5 text-sm text-[#44403C]">
                    {latest.bodyProportions.silhouettes.map((s, idx) => (
                      <li key={idx}>· {s}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#1C1917] mb-2">
                    Styling Combinations
                  </h3>
                  <ul className="space-y-1.5 text-sm text-[#44403C]">
                    {latest.stylingSuggestions.map((tip, idx) => (
                      <li key={idx}>· {tip}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
