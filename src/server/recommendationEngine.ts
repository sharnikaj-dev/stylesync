import { ProductListing, StylePreferences } from '../db/schema.ts';

export interface ScoredListing extends ProductListing {
  valueScore: number;
  badges: Array<'Best Price' | 'Best Rated' | 'Best Value'>;
  recommendationNote: string;
}

export function compareProductListings(
  listings: ProductListing[],
  prefs?: StylePreferences | null,
): {
  scoredListings: ScoredListing[];
  recommendedPlatform: string;
  summary: string;
} {
  if (!listings || listings.length === 0) {
    return {
      scoredListings: [],
      recommendedPlatform: '',
      summary: 'No marketplace listings available.',
    };
  }

  const minPrice = Math.min(...listings.map((l) => l.currentPrice));
  const maxPrice = Math.max(...listings.map((l) => l.currentPrice));
  const maxRating = Math.max(...listings.map((l) => l.rating));
  const preferredPlatforms = prefs?.preferredPlatforms || [];

  const scored: ScoredListing[] = listings.map((listing) => {
    const priceNorm =
      maxPrice === minPrice
        ? 1
        : 1 - (listing.currentPrice - minPrice) / (maxPrice - minPrice);
    const ratingNorm = Math.max(0, Math.min(1, (listing.rating - 3.0) / 2.0));
    const reviewNorm = Math.min(1, Math.log10(Math.max(10, listing.reviewCount)) / 3.2);
    const prefBonus = preferredPlatforms.includes(listing.platform) ? 1 : 0.4;

    const valueScore = Math.round(
      (priceNorm * 0.35 + ratingNorm * 0.4 + reviewNorm * 0.15 + prefBonus * 0.1) * 100,
    );

    const badges: Array<'Best Price' | 'Best Rated' | 'Best Value'> = [];
    if (listing.currentPrice === minPrice) badges.push('Best Price');
    if (listing.rating === maxRating) badges.push('Best Rated');

    return {
      ...listing,
      valueScore,
      badges,
      recommendationNote:
        listing.rating >= 4.4
          ? 'Strong customer satisfaction and consistent quality indicators.'
          : listing.currentPrice === minPrice
            ? 'Most affordable price across tracked demonstration platforms.'
            : 'Balanced mid-tier pricing and verified buyer volume.',
    };
  });

  const bestValueItem = [...scored].sort((a, b) => b.valueScore - a.valueScore)[0];
  if (bestValueItem && !bestValueItem.badges.includes('Best Value')) {
    bestValueItem.badges.push('Best Value');
  }

  const bestRatedItem = [...scored].sort((a, b) => b.rating - a.rating)[0];
  const lowestPriceItem = [...scored].sort((a, b) => a.currentPrice - b.currentPrice)[0];

  const summary =
    bestValueItem.platform === lowestPriceItem.platform
      ? `${bestValueItem.platform} offers both the lowest price (₹${bestValueItem.currentPrice.toLocaleString('en-IN')}) and highest overall value score (${bestValueItem.valueScore}/100).`
      : `${bestValueItem.platform} is recommended for Best Value (${bestValueItem.rating}★ across ${bestValueItem.reviewCount} reviews at ₹${bestValueItem.currentPrice.toLocaleString('en-IN')}), balancing quality with savings over ${bestRatedItem.platform} while avoiding lower-rated tradeoffs.`;

  return {
    scoredListings: scored.sort((a, b) => b.valueScore - a.valueScore),
    recommendedPlatform: bestValueItem.platform,
    summary,
  };
}

export interface WardrobeIntelligenceInput {
  id: number;
  name: string;
  category: string;
  color: string;
  purchasePrice: number;
  wearCount: number;
  season?: string | null;
}

export function computeWardrobeIntelligence(
  items: WardrobeIntelligenceInput[],
  savedOutfitsCount: number,
  preferredStyles: string[] = [],
) {
  const totalItems = items.length;
  const totalValue = items.reduce((acc, item) => acc + (item.purchasePrice || 0), 0);
  const totalWears = items.reduce((acc, item) => acc + (item.wearCount || 0), 0);

  const costPerWearList = items.map((item) => {
    const wears = Math.max(1, item.wearCount || 0);
    const cpw = Math.round((item.purchasePrice || 0) / wears);
    return {
      id: item.id,
      name: item.name,
      category: item.category,
      purchasePrice: item.purchasePrice,
      wearCount: item.wearCount,
      costPerWear: cpw,
      efficiency:
        item.wearCount >= 8 ? 'High Reuse' : item.wearCount >= 3 ? 'Growing Use' : 'Underworn',
    };
  });

  const categoryCounts: Record<string, number> = {};
  for (const item of items) {
    categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
  }

  const essentialCategories = [
    { category: 'Tops', target: 3, tip: 'Versatile tops or shirts anchor daily rotation.' },
    { category: 'Trousers', target: 2, tip: 'Neutral tailored trousers pair across formal and casual looks.' },
    { category: 'Kurtis', target: 2, tip: 'Breathable kurtis unlock effortless festive and fusion outfits.' },
    { category: 'Footwear', target: 2, tip: 'One structured formal pair and one casual sneaker keep looks cohesive.' },
    { category: 'Bags', target: 1, tip: 'A structured everyday crossbody or tote elevates minimal silhouettes.' },
    { category: 'Accessories', target: 2, tip: 'Minimal jewellery or a classic watch completes proportions.' },
  ];

  const wardrobeGaps = essentialCategories
    .filter((req) => (categoryCounts[req.category] || 0) < req.target)
    .map((req) => ({
      category: req.category,
      owned: categoryCounts[req.category] || 0,
      recommended: req.target,
      reason: req.tip,
    }));

  const reusedItems = items.filter((i) => i.wearCount >= 3).length;
  const reuseRatio = totalItems > 0 ? reusedItems / totalItems : 0;
  const avgWears = totalItems > 0 ? totalWears / totalItems : 0;
  const outfitBonus = Math.min(25, savedOutfitsCount * 5);
  const sustainabilityScore =
    totalItems === 0
      ? 50
      : Math.min(100, Math.round(35 + reuseRatio * 35 + Math.min(20, avgWears * 2) + outfitBonus));

  return {
    totalItems,
    totalValue,
    totalWears,
    averageCostPerWear:
      totalWears > 0 ? Math.round(totalValue / totalWears) : totalItems > 0 ? totalValue : 0,
    costPerWearList: costPerWearList.sort((a, b) => b.costPerWear - a.costPerWear),
    categoryBreakdown: Object.entries(categoryCounts).map(([category, count]) => ({
      category,
      count,
    })),
    wardrobeGaps,
    sustainabilityScore,
    sustainabilityNote:
      sustainabilityScore >= 75
        ? `Strong circular habit across your ${preferredStyles.join(' & ') || 'curated'} wardrobe — high garment reuse keeps cost-per-wear low.`
        : 'Log wears on existing garments and recreate inspiration looks from items you already own to raise your score.',
  };
}

export function getWeatherStylingAdvice(tempCelsius: number, condition: string) {
  const cond = condition.toLowerCase();
  if (cond.includes('rain') || cond.includes('monsoon')) {
    return {
      headline: 'Monsoon-Ready Breathable Layers',
      fabrics: ['Quick-dry cotton blends', 'Georgette', 'Lightweight linen'],
      avoid: 'Floor-grazing hems and untreated suede footwear.',
      suggestion:
        'Opt for ankle-length trousers or midi silhouettes paired with water-resistant loafers and a compact crossbody.',
    };
  }
  if (tempCelsius >= 29) {
    return {
      headline: 'Warm Climate Airy Tailoring',
      fabrics: ['Handloom cotton', 'Chanderi silk', 'Linen'],
      avoid: 'Heavy multi-layer synthetic linings.',
      suggestion:
        'Lead with breathable ivory or olive separates, open necklines, and cushioned open-toe sandals or leather loafers.',
    };
  }
  if (tempCelsius <= 18) {
    return {
      headline: 'Cool-Weather Structured Layering',
      fabrics: ['Fine merino', 'Structured twill', 'Lined wool-blend blazers'],
      avoid: 'Unlayered sheer tops.',
      suggestion:
        'Layer a tailored ivory blazer or fine shawl over wide-leg trousers with closed leather footwear.',
    };
  }
  return {
    headline: 'Mild Transitional Dressing',
    fabrics: ['Cotton poplin', 'Light linen blends', 'Fluid crepe'],
    avoid: 'Overly heavy outerwear.',
    suggestion:
      'Pair a breathable base top with tailored trousers and keep a light blazer or dupatta handy for evening shifts.',
  };
}
