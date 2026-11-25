import React, { useEffect, useState } from 'react';
import { Bell, ExternalLink, Info, Ruler, Search, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';
import { Product } from '../types/stylesync';
import { ImageWithFallback } from '../components/ui/ImageWithFallback';

export const SmartShoppingView: React.FC = () => {
  const { notify } = useAuth();
  const [subTab, setSubTab] = useState<'compare' | 'budget' | 'sizing'>('compare');
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  // Budget Outfit Generator state
  const [budgetOccasion, setBudgetOccasion] = useState('Festive');
  const [budgetAmount, setBudgetAmount] = useState(3000);
  const [budgetStyle, setBudgetStyle] = useState('Fusion');
  const [budgetCategory, setBudgetCategory] = useState('Complete Outfit');
  const [budgetColors, setBudgetColors] = useState('Olive Green, Ivory');
  const [budgetTiers, setBudgetTiers] = useState<any[]>([]);
  const [budgetLoading, setBudgetLoading] = useState(false);

  // Size Predictor state
  const [heightCm, setHeightCm] = useState('165');
  const [chestCm, setChestCm] = useState('90');
  const [waistCm, setWaistCm] = useState('74');
  const [hipCm, setHipCm] = useState('96');
  const [fitPreference, setFitPreference] = useState('Regular');
  const [existingSize, setExistingSize] = useState('M');
  const [brand, setBrand] = useState('Fabindia');
  const [sizeCategory, setSizeCategory] = useState('Kurtis & Tops');
  const [sizeResult, setSizeResult] = useState<any>(null);
  const [sizeLoading, setSizeLoading] = useState(false);

  useEffect(() => {
    apiFetch<{ products: Product[] }>('/api/products')
      .then((d) => setProducts(d.products || []))
      .catch((err) => notify(err.message, 'error'));
  }, [notify]);

  const handleTrackWishlist = async (product: Product) => {
    const best = product.comparison?.scoredListings?.[0];
    try {
      await apiFetch('/api/wishlist', {
        method: 'POST',
        body: JSON.stringify({
          productId: product.id,
          targetPrice: best ? Math.round(best.currentPrice * 0.9) : null,
          priceDropAlertEnabled: true,
          productSnapshot: {
            name: product.name,
            brand: product.brand,
            category: product.category,
            imageUrl: product.imageUrl,
            currentPrice: best?.currentPrice || 999,
            platform: best?.platform || 'Myntra',
            productUrl: best?.productUrl || 'https://www.myntra.com',
          },
        }),
      });
      notify(`Saved ${product.name} to Wishlist with price tracking.`, 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const runBudgetGenerator = async (e: React.FormEvent) => {
    e.preventDefault();
    setBudgetLoading(true);
    try {
      const data = await apiFetch<{ tiers: any[] }>('/api/ai/budget-looks', {
        method: 'POST',
        body: JSON.stringify({
          occasion: budgetOccasion,
          budget: budgetAmount,
          stylePref: budgetStyle,
          category: budgetCategory,
          preferredColors: budgetColors.split(',').map((s) => s.trim()),
        }),
      });
      setBudgetTiers(data.tiers || []);
      notify('Generated Budget, Balanced, and Premium looks.', 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setBudgetLoading(false);
    }
  };

  const runSizePredictor = async (e: React.FormEvent) => {
    e.preventDefault();
    setSizeLoading(true);
    try {
      const data = await apiFetch<{ prediction: any }>('/api/ai/size-predictor', {
        method: 'POST',
        body: JSON.stringify({
          heightCm,
          chestCm,
          waistCm,
          hipCm,
          fitPreference,
          existingSize,
          brand,
          category: sizeCategory,
        }),
      });
      setSizeResult(data.prediction);
      notify('Size & fit estimate ready.', 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setSizeLoading(false);
    }
  };

  const categories = ['All', ...Array.from(new Set(products.map((p) => p.category)))];
  const filtered = products.filter((p) => {
    if (category !== 'All' && p.category !== category) return false;
    if (
      search &&
      !p.name.toLowerCase().includes(search.toLowerCase()) &&
      !p.brand.toLowerCase().includes(search.toLowerCase())
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
            Multi-Platform Value Intelligence · INR
          </p>
          <h1 className="font-editorial text-3xl lg:text-4xl font-semibold text-[#1C1917]">
            Smart Shopping, Budgets & Fit
          </h1>
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#EAE3D9] rounded-lg shrink-0">
          <button
            onClick={() => setSubTab('compare')}
            className={`px-3.5 py-2 text-xs font-medium rounded-md cursor-pointer ${
              subTab === 'compare' ? 'bg-white text-[#1C1917] shadow-xs' : 'text-[#57534E]'
            }`}
          >
            Platform Compare
          </button>
          <button
            onClick={() => setSubTab('budget')}
            className={`px-3.5 py-2 text-xs font-medium rounded-md cursor-pointer ${
              subTab === 'budget' ? 'bg-white text-[#1C1917] shadow-xs' : 'text-[#57534E]'
            }`}
          >
            Budget Generator
          </button>
          <button
            onClick={() => setSubTab('sizing')}
            className={`px-3.5 py-2 text-xs font-medium rounded-md cursor-pointer ${
              subTab === 'sizing' ? 'bg-white text-[#1C1917] shadow-xs' : 'text-[#57534E]'
            }`}
          >
            Size & Fit Predictor
          </button>
        </div>
      </div>

      {subTab === 'compare' && (
        <div className="space-y-6">
          <div className="bg-[#F2EDE6] border border-[#E2DBD0] rounded-xl p-4 flex items-start gap-3 text-xs text-[#44403C]">
            <Info className="w-4 h-4 text-[#9D5C63] shrink-0 mt-0.5" />
            <div>
              Showing clearly labelled demonstration catalog data across Myntra, Flipkart, and
              Meesho. Listings are ranked using price, customer rating, review count, and your
              preferred platforms—never assuming the lowest price is automatically best.
            </div>
          </div>

          <div className="bg-white border border-[#E7E2DA] rounded-xl p-4 flex flex-col sm:flex-row gap-3 justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-[#78716C] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products or brands..."
                className="w-full pl-9 pr-3 py-2 bg-[#FAF8F5] border border-[#E2DBD0] rounded-lg text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border cursor-pointer ${
                    category === cat
                      ? 'bg-[#1C1917] text-white border-[#1C1917]'
                      : 'bg-[#FAF8F5] text-[#44403C] border-[#E2DBD0]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filtered.map((product) => (
              <div
                key={product.id}
                className="bg-white border border-[#E7E2DA] rounded-xl overflow-hidden flex flex-col"
              >
                <div className="grid grid-cols-1 sm:grid-cols-12">
                  <div className="sm:col-span-5 aspect-[4/3] sm:aspect-auto bg-[#EFEAE2]">
                    <ImageWithFallback
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="sm:col-span-7 p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-xs text-[#57534E]">
                        <span>
                          {product.brand} · {product.category}
                        </span>
                        {product.isDemoData && <span>Demo Catalog</span>}
                      </div>
                      <h3 className="text-lg font-semibold text-[#1C1917] mt-1">{product.name}</h3>
                      <p className="text-xs text-[#57534E] mt-1 line-clamp-2">
                        {product.description}
                      </p>
                      <p className="text-xs text-[#9D5C63] mt-2 font-medium">
                        {product.comparison?.summary}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-2">
                      <span className="text-xs text-[#57534E]">
                        Sizes: {product.availableSizes.join(', ')}
                      </span>
                      <button
                        onClick={() => handleTrackWishlist(product)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#1C1917] hover:text-[#9D5C63] cursor-pointer"
                      >
                        <Bell className="w-3.5 h-3.5" /> Save & Alert
                      </button>
                    </div>
                  </div>
                </div>

                {/* Comparison Matrix */}
                <div className="border-t border-[#E7E2DA] bg-[#FAF8F5] divide-y divide-[#E7E2DA]">
                  {(product.comparison?.scoredListings || []).map((listing) => (
                    <div
                      key={listing.platform}
                      className="px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="font-semibold text-[#1C1917] w-16">
                          {listing.platform}
                        </span>
                        {listing.badges.map((b) => (
                          <span
                            key={b}
                            className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                              b === 'Best Value'
                                ? 'bg-[#9D5C63] text-white'
                                : b === 'Best Rated'
                                  ? 'bg-[#1C1917] text-white'
                                  : 'bg-[#EAE3D9] text-[#1C1917]'
                            }`}
                          >
                            {b}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="font-mono-num">
                          <span className="font-semibold text-[#1C1917]">
                            ₹{listing.currentPrice.toLocaleString('en-IN')}
                          </span>
                          <span className="text-[#78716C] line-through ml-1.5">
                            ₹{listing.originalPrice.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="font-mono-num text-[#44403C]">
                          {listing.rating}★ ({listing.reviewCount})
                        </div>
                        <a
                          href={listing.productUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-[#E2DBD0] rounded-md font-medium text-[#1C1917] hover:bg-[#F2EDE6]"
                        >
                          Buy Now <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {subTab === 'budget' && (
        <div className="space-y-6">
          <form
            onSubmit={runBudgetGenerator}
            className="bg-white border border-[#E7E2DA] rounded-xl p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end"
          >
            <div>
              <label className="block text-xs font-medium text-[#57534E] mb-1.5">Occasion</label>
              <input
                value={budgetOccasion}
                onChange={(e) => setBudgetOccasion(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#FAF8F5] border border-[#E2DBD0] rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#57534E] mb-1.5">
                Max Budget (₹)
              </label>
              <input
                type="number"
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(Number(e.target.value) || 1000)}
                className="w-full px-3 py-2.5 bg-[#FAF8F5] border border-[#E2DBD0] rounded-lg text-sm font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#57534E] mb-1.5">Style</label>
              <input
                value={budgetStyle}
                onChange={(e) => setBudgetStyle(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#FAF8F5] border border-[#E2DBD0] rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#57534E] mb-1.5">
                Preferred Colors
              </label>
              <input
                value={budgetColors}
                onChange={(e) => setBudgetColors(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#FAF8F5] border border-[#E2DBD0] rounded-lg text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={budgetLoading}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#1C1917] rounded-lg hover:bg-[#342F2C] cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              {budgetLoading ? 'Generating...' : 'Generate 3 Tiers'}
            </button>
          </form>

          {budgetTiers.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {budgetTiers.map((tier, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-[#E7E2DA] rounded-xl p-6 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-semibold text-[#9D5C63]">{tier.tierName}</span>
                      <span className="font-mono-num font-semibold text-[#1C1917]">
                        ₹{(tier.totalCost || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    {tier.exceedsBudget && (
                      <div className="text-[11px] text-[#8B2E2E] bg-[#FDF2F2] px-2.5 py-1 rounded mb-2">
                        Aspirational Alternative (Exceeds ₹{budgetAmount.toLocaleString('en-IN')})
                      </div>
                    )}
                    <h3 className="font-editorial text-2xl font-semibold text-[#1C1917] mb-2">
                      {tier.title}
                    </h3>
                    <p className="text-xs text-[#57534E] mb-4">{tier.rationale}</p>

                    <div className="space-y-2.5 border-t border-[#E7E2DA] pt-3">
                      {(tier.items || []).map((it: any, i: number) => (
                        <div key={i} className="flex items-center justify-between text-xs gap-2">
                          <div>
                            <span className="font-semibold">{it.slot}: </span>
                            <span>{it.name}</span>
                          </div>
                          <span className="font-mono-num shrink-0">
                            ₹{(it.price || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {subTab === 'sizing' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={runSizePredictor}
            className="lg:col-span-5 bg-white border border-[#E7E2DA] rounded-xl p-6 space-y-4"
          >
            <h2 className="font-editorial text-2xl font-semibold text-[#1C1917]">
              Smart Size & Fit Predictor
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#57534E] mb-1">Height (cm)</label>
                <input
                  type="number"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E2DBD0] rounded-lg text-sm font-mono-num"
                />
              </div>
              <div>
                <label className="block text-xs text-[#57534E] mb-1">Chest (cm)</label>
                <input
                  type="number"
                  value={chestCm}
                  onChange={(e) => setChestCm(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E2DBD0] rounded-lg text-sm font-mono-num"
                />
              </div>
              <div>
                <label className="block text-xs text-[#57534E] mb-1">Waist (cm)</label>
                <input
                  type="number"
                  value={waistCm}
                  onChange={(e) => setWaistCm(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E2DBD0] rounded-lg text-sm font-mono-num"
                />
              </div>
              <div>
                <label className="block text-xs text-[#57534E] mb-1">Hip (cm)</label>
                <input
                  type="number"
                  value={hipCm}
                  onChange={(e) => setHipCm(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E2DBD0] rounded-lg text-sm font-mono-num"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#57534E] mb-1">Target Brand</label>
                <input
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E2DBD0] rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-[#57534E] mb-1">Usual Size</label>
                <input
                  value={existingSize}
                  onChange={(e) => setExistingSize(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E2DBD0] rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-[#57534E] mb-1">Category</label>
                <select
                  value={sizeCategory}
                  onChange={(e) => setSizeCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E2DBD0] rounded-lg text-sm"
                >
                  <option>Kurtis & Tops</option>
                  <option>Dresses</option>
                  <option>Trousers & Jeans</option>
                  <option>Blazers & Outerwear</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#57534E] mb-1">Fit Preference</label>
                <select
                  value={fitPreference}
                  onChange={(e) => setFitPreference(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E2DBD0] rounded-lg text-sm"
                >
                  <option>Relaxed</option>
                  <option>Regular</option>
                  <option>Tailored</option>
                  <option>Oversized</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={sizeLoading}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-medium text-white bg-[#1C1917] rounded-lg hover:bg-[#342F2C] cursor-pointer"
            >
              <Ruler className="w-4 h-4" />
              {sizeLoading ? 'Calculating Fit...' : 'Predict Best Size'}
            </button>
          </form>

          <div className="lg:col-span-7 bg-white border border-[#E7E2DA] rounded-xl p-6">
            {!sizeResult ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12 text-[#57534E]">
                <Ruler className="w-8 h-8 opacity-40 mb-3" />
                <div className="text-sm font-medium text-[#1C1917]">
                  Enter measurements & brand to predict your fit
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-baseline justify-between border-b border-[#E7E2DA] pb-4">
                  <div>
                    <div className="text-xs text-[#57534E]">Recommended Size for {brand}</div>
                    <div className="font-editorial text-4xl font-semibold text-[#1C1917] mt-1">
                      Size {sizeResult.recommendedSize}
                    </div>
                  </div>
                  <div className="text-xs text-[#57534E]">
                    Alternative: <span className="font-semibold">{sizeResult.alternativeSize}</span>
                  </div>
                </div>
                <p className="text-sm text-[#44403C]">{sizeResult.fitExplanation}</p>
                <p className="text-xs text-[#57534E]">{sizeResult.brandSizingNote}</p>
                <ul className="space-y-1 text-xs text-[#44403C]">
                  {(sizeResult.measurementBreakdown || []).map((m: string, idx: number) => (
                    <li key={idx}>· {m}</li>
                  ))}
                </ul>
                <div className="p-3 rounded-lg bg-[#F2EDE6] text-xs text-[#57534E]">
                  {sizeResult.disclaimer}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
