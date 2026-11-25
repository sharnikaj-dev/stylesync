export interface StylePreferences {
  preferredStyles: string[];
  favoriteColors: string[];
  clothingPreferences: string[];
  preferredPlatforms: string[];
  budgetMin: number;
  budgetMax: number;
  preferredBrands: string[];
  commonOccasions: string[];
  fitPreference: string;
  sizes: {
    top?: string;
    bottom?: string;
    footwear?: string;
  };
  heightCm?: number;
  measurements?: {
    chestCm?: number;
    waistCm?: number;
    hipCm?: number;
  };
}

export interface FashionTwinProfile {
  learnedColors: string[];
  preferredCategories: string[];
  approvedTags: string[];
  dislikedTags: string[];
  feedbackCount: number;
  styleSummary: string;
}

export interface AppUser {
  id: number;
  uid: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: 'user' | 'admin';
  onboardingCompleted: boolean;
  stylePreferences: StylePreferences | null;
  fashionTwinProfile: FashionTwinProfile | null;
}

export interface StyleAnalysis {
  id: number;
  imageData: string | null;
  skinTone: string;
  undertone: string;
  complementaryColors: string[];
  colorPalette: Array<{ name: string; hex: string; usage: string }>;
  bodyProportions: {
    summary: string;
    silhouettes: string[];
    stylingTips: string[];
  };
  personalStyles: string[];
  stylingSuggestions: string[];
  userEdited: boolean;
  createdAt: string;
}

export interface OutfitComponentItem {
  slot: string;
  name: string;
  color: string;
  price: number;
  platform?: string;
  productUrl?: string;
  imageUrl?: string;
  explanation: string;
  isOwned?: boolean;
}

export interface SavedOutfit {
  id: number;
  title: string;
  occasion: string;
  collectionName: string;
  totalCost: number;
  source: string;
  items: OutfitComponentItem[];
  stylingNotes?: string;
  hairstyleSuggestion?: string;
  createdAt: string;
}

export interface WardrobeItem {
  id: number;
  name: string;
  category: string;
  color: string;
  colorHex?: string;
  pattern?: string;
  style?: string;
  brand?: string;
  size?: string;
  season?: string;
  purchasePrice: number;
  wearCount: number;
  lastWornAt?: string;
  imageData?: string | null;
  notes?: string;
  createdAt: string;
}

export interface ScoredListing {
  platform: 'Myntra' | 'Flipkart' | 'Meesho';
  currentPrice: number;
  originalPrice: number;
  discountPercent: number;
  rating: number;
  reviewCount: number;
  productUrl: string;
  valueScore: number;
  badges: Array<'Best Price' | 'Best Rated' | 'Best Value'>;
  recommendationNote: string;
}

export interface Product {
  id: number;
  name: string;
  category: string;
  brand: string;
  color: string;
  colorHex?: string;
  style: string;
  occasion: string;
  description?: string;
  imageUrl: string;
  availableSizes: string[];
  listings: ScoredListing[];
  isDemoData: boolean;
  comparison?: {
    scoredListings: ScoredListing[];
    recommendedPlatform: string;
    summary: string;
  };
}

export interface VirtualTryOnRecord {
  id: number;
  productName: string;
  productCategory: string;
  originalImage: string;
  generatedImage: string;
  isFavorite: boolean;
  createdAt: string;
}

export interface WishlistItem {
  id: number;
  productId: number | null;
  productSnapshot: {
    name: string;
    brand: string;
    category: string;
    imageUrl: string;
    currentPrice: number;
    platform: string;
    productUrl: string;
  } | null;
  targetPrice: number | null;
  priceDropAlertEnabled: boolean;
  createdAt: string;
}

export interface CalendarEvent {
  id: number;
  eventDate: string;
  eventTitle: string;
  occasion?: string;
  outfitId?: number | null;
  outfitSummary?: string;
  weatherNote?: string;
}

export interface TravelPlan {
  id: number;
  destination: string;
  startDate: string;
  durationDays: number;
  activities: string[];
  weatherPref?: string;
  generatedPlan: {
    dailyOutfits: Array<{
      day: number;
      title: string;
      outfit: string;
      footwear: string;
      accessories: string;
    }>;
    packingChecklist: string[];
    footwearRecs: string[];
    accessories: string[];
    travelTips: string[];
  };
  createdAt: string;
}

export interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export type StudioTab =
  | 'dashboard'
  | 'style-analysis'
  | 'ai-stylist'
  | 'stylist-chat'
  | 'virtual-try-on'
  | 'runway-video'
  | 'match-decode'
  | 'wardrobe'
  | 'smart-shopping'
  | 'color-lab'
  | 'calendar-travel'
  | 'saved-decision'
  | 'fashion-twin'
  | 'admin';
