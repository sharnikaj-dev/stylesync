import React, { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Bookmark, Check, Plus, Search, Shirt, Trash2, Upload } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch, fileToDataUrl } from '../services/api';
import { WardrobeItem } from '../types/stylesync';
import { ImageWithFallback } from '../components/ui/ImageWithFallback';

const CATEGORIES = [
  'All',
  'Tops',
  'T-shirts',
  'Shirts',
  'Jeans',
  'Trousers',
  'Kurtis',
  'Dresses',
  'Skirts',
  'Footwear',
  'Bags',
  'Jewellery',
  'Accessories',
];

export const DigitalWardrobeView: React.FC = () => {
  const { notify } = useAuth();
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [intel, setIntel] = useState<any>(null);
  const [weatherAdvice, setWeatherAdvice] = useState<any>(null);
  const [weatherTemp, setWeatherTemp] = useState(26);
  const [weatherCond, setWeatherCond] = useState('Clear');

  const [viewMode, setViewMode] = useState<'closet' | 'intelligence'>('closet');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [colorFilter, setColorFilter] = useState('All');

  // Add Form
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Tops');
  const [color, setColor] = useState('Ivory');
  const [brand, setBrand] = useState('');
  const [size, setSize] = useState('M');
  const [price, setPrice] = useState('1499');
  const [style, setStyle] = useState('Minimalist');
  const [imageData, setImageData] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Outfit Combination Builder from Owned Items
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [comboTitle, setComboTitle] = useState('');

  const loadData = async (temp = weatherTemp, cond = weatherCond) => {
    try {
      const [wRes, iRes] = await Promise.all([
        apiFetch<{ items: WardrobeItem[] }>('/api/wardrobe'),
        apiFetch<any>(
          `/api/intelligence/summary?temp=${temp}&condition=${encodeURIComponent(cond)}`,
        ),
      ]);
      setItems(wRes.items || []);
      setIntel(iRes.intelligence);
      setWeatherAdvice(iRes.weatherAdvice);
    } catch (err: any) {
      notify(err.message || 'Failed to load wardrobe.', 'error');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await fileToDataUrl(file);
      setImageData(url);
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      notify('Please enter an item name.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const data = await apiFetch<{ item: WardrobeItem }>('/api/wardrobe', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          category,
          color: color.trim(),
          brand: brand.trim(),
          size: size.trim(),
          style,
          purchasePrice: Number(price) || 0,
          imageData,
        }),
      });
      setItems((prev) => [data.item, ...prev]);
      setName('');
      setBrand('');
      setImageData(null);
      setShowAdd(false);
      notify('Clothing item added to Digital Wardrobe.', 'success');
      loadData();
    } catch (err: any) {
      notify(err.message || 'Could not add item.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogWear = async (id: number) => {
    try {
      const data = await apiFetch<{ item: WardrobeItem }>(`/api/wardrobe/${id}/wear`, {
        method: 'POST',
      });
      setItems((prev) => prev.map((it) => (it.id === id ? data.item : it)));
      notify(`Logged wear for ${data.item.name}.`, 'success');
      loadData();
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await apiFetch(`/api/wardrobe/${id}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((it) => it.id !== id));
      setSelectedIds((prev) => prev.filter((x) => x !== id));
      notify('Removed item from wardrobe.', 'info');
      loadData();
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const saveWardrobeCombo = async () => {
    const chosen = items.filter((i) => selectedIds.includes(i.id));
    if (chosen.length < 2) {
      notify('Select at least 2 wardrobe pieces to create an outfit.', 'error');
      return;
    }
    try {
      await apiFetch('/api/outfits', {
        method: 'POST',
        body: JSON.stringify({
          title: comboTitle.trim() || `${chosen[0].color} Wardrobe Pairing`,
          occasion: 'Everyday',
          collectionName: 'Owned Wardrobe Combos',
          totalCost: 0,
          source: 'wardrobe',
          items: chosen.map((c) => ({
            slot: c.category,
            name: c.name,
            color: c.color,
            price: 0,
            explanation: `Owned piece (${c.wearCount} wears logged)`,
            isOwned: true,
          })),
          stylingNotes: 'Assembled directly from your Digital Wardrobe for zero-cost reuse.',
        }),
      });
      setSelectedIds([]);
      setComboTitle('');
      notify('Wardrobe outfit saved to Collections.', 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const availableColors = ['All', ...Array.from(new Set(items.map((i) => i.color)))];
  const filteredItems = items.filter((item) => {
    if (categoryFilter !== 'All' && item.category !== categoryFilter) return false;
    if (colorFilter !== 'All' && item.color !== colorFilter) return false;
    if (
      search &&
      !item.name.toLowerCase().includes(search.toLowerCase()) &&
      !(item.brand || '').toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#9D5C63] mb-1">
            Closet Inventory · Cost-Per-Wear & Sustainability
          </p>
          <h1 className="font-editorial text-3xl lg:text-4xl font-semibold text-[#1C1917]">
            Digital Wardrobe & Intelligence
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-[#EAE3D9] rounded-lg">
            <button
              onClick={() => setViewMode('closet')}
              className={`px-3.5 py-2 text-xs font-medium rounded-md cursor-pointer ${
                viewMode === 'closet' ? 'bg-white text-[#1C1917] shadow-xs' : 'text-[#57534E]'
              }`}
            >
              Closet ({items.length})
            </button>
            <button
              onClick={() => setViewMode('intelligence')}
              className={`px-3.5 py-2 text-xs font-medium rounded-md cursor-pointer ${
                viewMode === 'intelligence'
                  ? 'bg-white text-[#1C1917] shadow-xs'
                  : 'text-[#57534E]'
              }`}
            >
              Wardrobe Analytics
            </button>
          </div>
          <button
            onClick={() => setShowAdd((s) => !s)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium text-white bg-[#1C1917] rounded-lg hover:bg-[#342F2C] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add Garment
          </button>
        </div>
      </div>

      {/* Add Garment Drawer/Panel */}
      {showAdd && (
        <form
          onSubmit={handleAddItem}
          className="bg-white border border-[#E7E2DA] rounded-xl p-6 space-y-4"
        >
          <h2 className="text-base font-semibold text-[#1C1917]">Add Item to Digital Wardrobe</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Item Name (e.g. Black Oversized Tee)"
              className="px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E2DBD0] rounded-lg text-sm"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E2DBD0] rounded-lg text-sm"
            >
              {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <input
              required
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="Color (e.g. Olive Green)"
              className="px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E2DBD0] rounded-lg text-sm"
            />
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Purchase Price (₹)"
              className="px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E2DBD0] rounded-lg text-sm font-mono-num"
            />
            <input
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="Brand (Optional)"
              className="px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E2DBD0] rounded-lg text-sm"
            />
            <input
              value={size}
              onChange={(e) => setSize(e.target.value)}
              placeholder="Size (e.g. M)"
              className="px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E2DBD0] rounded-lg text-sm"
            />
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E2DBD0] rounded-lg text-sm"
            >
              <option>Minimalist</option>
              <option>Casual</option>
              <option>Ethnic</option>
              <option>Formal</option>
              <option>Streetwear</option>
              <option>Fusion</option>
            </select>
            <label className="flex items-center justify-center gap-2 px-3.5 py-2.5 bg-[#F2EDE6] border border-[#E2DBD0] rounded-lg text-xs font-medium cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              {imageData ? 'Photo Attached' : 'Upload Photo'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 text-xs font-medium text-[#57534E] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 text-xs font-medium text-white bg-[#9D5C63] rounded-lg hover:bg-[#864B52] cursor-pointer"
            >
              {submitting ? 'Saving...' : 'Save Item'}
            </button>
          </div>
        </form>
      )}

      {viewMode === 'closet' ? (
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-white border border-[#E7E2DA] rounded-xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-[#78716C] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search garment or brand..."
                className="w-full pl-9 pr-3 py-2 bg-[#FAF8F5] border border-[#E2DBD0] rounded-lg text-sm"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 bg-[#FAF8F5] border border-[#E2DBD0] rounded-lg text-xs"
              >
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <select
                value={colorFilter}
                onChange={(e) => setColorFilter(e.target.value)}
                className="px-3 py-2 bg-[#FAF8F5] border border-[#E2DBD0] rounded-lg text-xs"
              >
                {availableColors.map((c) => (
                  <option key={c} value={c}>
                    Color: {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Combo Builder Bar */}
          {selectedIds.length > 0 && (
            <div className="bg-[#1C1917] text-white rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs">
                <span className="font-semibold">{selectedIds.length} pieces selected</span> — bundle
                into an owned outfit combination
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  value={comboTitle}
                  onChange={(e) => setComboTitle(e.target.value)}
                  placeholder="Outfit title..."
                  className="px-3 py-1.5 rounded-lg text-xs text-[#1C1917] bg-white flex-1 sm:w-48"
                />
                <button
                  onClick={saveWardrobeCombo}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-[#9D5C63] rounded-lg hover:bg-[#864B52] whitespace-nowrap cursor-pointer"
                >
                  <Bookmark className="w-3.5 h-3.5" /> Save Combo
                </button>
              </div>
            </div>
          )}

          {/* Items Grid */}
          {filteredItems.length === 0 ? (
            <div className="bg-white border border-[#E7E2DA] rounded-xl p-12 text-center">
              <Shirt className="w-8 h-8 mx-auto text-[#9D5C63] opacity-60 mb-3" />
              <div className="text-base font-semibold text-[#1C1917]">
                Your digital wardrobe is empty
              </div>
              <p className="text-sm text-[#57534E] mt-1 mb-4">
                Add garments you already own to track cost-per-wear and unlock AI outfit reuse.
              </p>
              <button
                onClick={() => setShowAdd(true)}
                className="px-5 py-2.5 text-xs font-medium text-white bg-[#1C1917] rounded-lg cursor-pointer"
              >
                Add First Garment
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map((item) => {
                const cpw = Math.round(
                  (item.purchasePrice || 0) / Math.max(1, item.wearCount || 0),
                );
                const selected = selectedIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    className={`bg-white border rounded-xl overflow-hidden flex flex-col justify-between ${
                      selected ? 'border-[#9D5C63] ring-1 ring-[#9D5C63]' : 'border-[#E7E2DA]'
                    }`}
                  >
                    <div>
                      <div className="aspect-[4/3] bg-[#EFEAE2] relative">
                        <ImageWithFallback
                          src={item.imageData}
                          alt={item.name}
                          fallbackLabel={`${item.color} ${item.category}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => toggleSelect(item.id)}
                          className={`absolute top-3 right-3 w-7 h-7 rounded-md flex items-center justify-center border text-xs cursor-pointer ${
                            selected
                              ? 'bg-[#9D5C63] border-[#9D5C63] text-white'
                              : 'bg-white/90 border-[#E2DBD0] text-[#1C1917]'
                          }`}
                          title="Select for outfit combo"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="p-4">
                        <div className="text-xs text-[#57534E]">
                          {item.category} · {item.color}
                          {item.brand ? ` · ${item.brand}` : ''}
                        </div>
                        <h3 className="text-base font-semibold text-[#1C1917] mt-0.5">
                          {item.name}
                        </h3>
                        <div className="mt-3 pt-3 border-t border-[#E7E2DA] flex items-center justify-between text-xs">
                          <span className="font-mono-num text-[#57534E]">
                            Paid ₹{item.purchasePrice.toLocaleString('en-IN')} · {item.wearCount}{' '}
                            wears
                          </span>
                          <span className="font-mono-num font-semibold text-[#1C1917]">
                            ₹{cpw.toLocaleString('en-IN')}/wear
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="px-4 pb-4 flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleLogWear(item.id)}
                        className="flex-1 py-2 px-3 text-xs font-medium bg-[#F2EDE6] rounded-lg hover:bg-[#EAE3D9] cursor-pointer"
                      >
                        +1 Log Wear
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-[#8B2E2E] hover:bg-[#FDF2F2] rounded-lg cursor-pointer"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Intelligence & Analytics View */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border border-[#E7E2DA] rounded-xl p-5">
              <div className="text-xs text-[#57534E]">Sustainable Fashion Score</div>
              <div className="font-editorial text-3xl font-semibold text-[#1C1917] mt-1 tabular-nums">
                {intel?.sustainabilityScore ?? 50}/100
              </div>
            </div>
            <div className="bg-white border border-[#E7E2DA] rounded-xl p-5">
              <div className="text-xs text-[#57534E]">Closet Valuation</div>
              <div className="font-editorial text-3xl font-semibold text-[#1C1917] mt-1 tabular-nums">
                ₹{(intel?.totalValue || 0).toLocaleString('en-IN')}
              </div>
            </div>
            <div className="bg-white border border-[#E7E2DA] rounded-xl p-5">
              <div className="text-xs text-[#57534E]">Total Wears Logged</div>
              <div className="font-editorial text-3xl font-semibold text-[#1C1917] mt-1 tabular-nums">
                {intel?.totalWears ?? 0}
              </div>
            </div>
            <div className="bg-white border border-[#E7E2DA] rounded-xl p-5">
              <div className="text-xs text-[#57534E]">Avg. Cost Per Wear</div>
              <div className="font-editorial text-3xl font-semibold text-[#1C1917] mt-1 tabular-nums">
                ₹{(intel?.averageCostPerWear || 0).toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-white border border-[#E7E2DA] rounded-xl p-6">
              <h2 className="font-editorial text-2xl font-semibold text-[#1C1917] mb-4">
                Wardrobe Category Breakdown
              </h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={intel?.categoryBreakdown || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E7E2DA" />
                    <XAxis dataKey="category" tick={{ fontSize: 12, fill: '#57534E' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#57534E' }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#9D5C63" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="lg:col-span-5 bg-white border border-[#E7E2DA] rounded-xl p-6 space-y-4">
              <h2 className="font-editorial text-2xl font-semibold text-[#1C1917]">
                Wardrobe Gap Analysis
              </h2>
              <div className="space-y-3">
                {(intel?.wardrobeGaps || []).length === 0 ? (
                  <p className="text-sm text-[#284D31]">
                    Your core essentials are well balanced across tops, bottoms, footwear, and
                    accessories.
                  </p>
                ) : (
                  (intel?.wardrobeGaps || []).map((gap: any) => (
                    <div
                      key={gap.category}
                      className="p-3.5 rounded-lg bg-[#FAF8F5] border border-[#E7E2DA]"
                    >
                      <div className="flex items-center justify-between text-xs font-semibold text-[#1C1917]">
                        <span>{gap.category}</span>
                        <span className="font-mono-num text-[#9D5C63]">
                          {gap.owned} / {gap.recommended} owned
                        </span>
                      </div>
                      <p className="text-xs text-[#57534E] mt-1">{gap.reason}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Weather-Based Styling Simulator */}
          <div className="bg-white border border-[#E7E2DA] rounded-xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="font-editorial text-2xl font-semibold text-[#1C1917]">
                  Weather-Based Styling Advisor
                </h2>
                <p className="text-xs text-[#57534E]">
                  Adjust local conditions to adapt fabric and silhouette recommendations
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={weatherTemp}
                  onChange={(e) => {
                    const next = Number(e.target.value) || 25;
                    setWeatherTemp(next);
                    loadData(next, weatherCond);
                  }}
                  className="w-20 px-3 py-1.5 bg-[#FAF8F5] border border-[#E2DBD0] rounded-lg text-xs font-mono-num"
                />
                <span className="text-xs text-[#57534E]">°C</span>
                <select
                  value={weatherCond}
                  onChange={(e) => {
                    setWeatherCond(e.target.value);
                    loadData(weatherTemp, e.target.value);
                  }}
                  className="px-3 py-1.5 bg-[#FAF8F5] border border-[#E2DBD0] rounded-lg text-xs"
                >
                  <option>Clear</option>
                  <option>Monsoon Rain</option>
                  <option>Humid</option>
                  <option>Breezy Cool</option>
                </select>
              </div>
            </div>

            {weatherAdvice && (
              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA] text-sm text-[#44403C] space-y-1.5">
                <div className="font-semibold text-[#1C1917]">{weatherAdvice.headline}</div>
                <p>{weatherAdvice.suggestion}</p>
                <div className="text-xs text-[#57534E]">
                  Best fabrics: {weatherAdvice.fabrics?.join(', ')} · Avoid: {weatherAdvice.avoid}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
