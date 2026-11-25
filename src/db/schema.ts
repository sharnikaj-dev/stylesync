import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

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

export interface ProductListing {
  platform: 'Myntra' | 'Flipkart' | 'Meesho';
  currentPrice: number;
  originalPrice: number;
  discountPercent: number;
  rating: number;
  reviewCount: number;
  productUrl: string;
}

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  role: text('role').notNull().default('user'),
  onboardingCompleted: boolean('onboarding_completed').notNull().default(false),
  stylePreferences: jsonb('style_preferences').$type<StylePreferences>(),
  fashionTwinProfile: jsonb('fashion_twin_profile').$type<FashionTwinProfile>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const styleAnalyses = pgTable('style_analyses', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  imageData: text('image_data'),
  skinTone: text('skin_tone').notNull(),
  undertone: text('undertone').notNull(),
  complementaryColors: jsonb('complementary_colors').$type<string[]>().notNull(),
  colorPalette: jsonb('color_palette')
    .$type<Array<{ name: string; hex: string; usage: string }>>()
    .notNull(),
  bodyProportions: jsonb('body_proportions')
    .$type<{ summary: string; silhouettes: string[]; stylingTips: string[] }>()
    .notNull(),
  personalStyles: jsonb('personal_styles').$type<string[]>().notNull(),
  stylingSuggestions: jsonb('styling_suggestions').$type<string[]>().notNull(),
  userEdited: boolean('user_edited').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const wardrobeItems = pgTable('wardrobe_items', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  color: text('color').notNull(),
  colorHex: text('color_hex'),
  pattern: text('pattern'),
  style: text('style'),
  brand: text('brand'),
  size: text('size'),
  season: text('season'),
  purchasePrice: integer('purchase_price').notNull().default(0),
  wearCount: integer('wear_count').notNull().default(0),
  lastWornAt: timestamp('last_worn_at'),
  imageData: text('image_data'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const savedOutfits = pgTable('saved_outfits', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  occasion: text('occasion').notNull().default('Casual'),
  collectionName: text('collection_name').notNull().default('Everyday Edit'),
  totalCost: integer('total_cost').notNull().default(0),
  source: text('source').notNull().default('ai_stylist'),
  items: jsonb('items').$type<OutfitComponentItem[]>().notNull(),
  stylingNotes: text('styling_notes'),
  hairstyleSuggestion: text('hairstyle_suggestion'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const virtualTryOns = pgTable('virtual_try_ons', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  productName: text('product_name').notNull(),
  productCategory: text('product_category').notNull(),
  originalImage: text('original_image').notNull(),
  generatedImage: text('generated_image').notNull(),
  isFavorite: boolean('is_favorite').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  brand: text('brand').notNull(),
  color: text('color').notNull(),
  colorHex: text('color_hex'),
  style: text('style').notNull(),
  occasion: text('occasion').notNull(),
  description: text('description'),
  imageUrl: text('image_url').notNull(),
  availableSizes: jsonb('available_sizes').$type<string[]>().notNull(),
  listings: jsonb('listings').$type<ProductListing[]>().notNull(),
  isDemoData: boolean('is_demo_data').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const wishlistItems = pgTable('wishlist_items', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  productId: integer('product_id').references(() => products.id, {
    onDelete: 'cascade',
  }),
  productSnapshot: jsonb('product_snapshot').$type<{
    name: string;
    brand: string;
    category: string;
    imageUrl: string;
    currentPrice: number;
    platform: string;
    productUrl: string;
  }>(),
  targetPrice: integer('target_price'),
  priceDropAlertEnabled: boolean('price_drop_alert_enabled')
    .notNull()
    .default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const outfitCalendar = pgTable('outfit_calendar', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  eventDate: text('event_date').notNull(),
  eventTitle: text('event_title').notNull(),
  occasion: text('occasion'),
  outfitId: integer('outfit_id').references(() => savedOutfits.id, {
    onDelete: 'set null',
  }),
  outfitSummary: text('outfit_summary'),
  weatherNote: text('weather_note'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const travelPlans = pgTable('travel_plans', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  destination: text('destination').notNull(),
  startDate: text('start_date').notNull(),
  durationDays: integer('duration_days').notNull(),
  activities: jsonb('activities').$type<string[]>().notNull(),
  weatherPref: text('weather_pref'),
  generatedPlan: jsonb('generated_plan')
    .$type<{
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
    }>()
    .notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  type: text('type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  styleAnalyses: many(styleAnalyses),
  wardrobeItems: many(wardrobeItems),
  savedOutfits: many(savedOutfits),
  virtualTryOns: many(virtualTryOns),
  wishlistItems: many(wishlistItems),
  outfitCalendar: many(outfitCalendar),
  travelPlans: many(travelPlans),
  notifications: many(notifications),
}));
