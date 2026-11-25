import { Router } from 'express';
import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '../db/index.ts';
import {
  notifications,
  outfitCalendar,
  products,
  savedOutfits,
  styleAnalyses,
  travelPlans,
  users,
  virtualTryOns,
  wardrobeItems,
  wishlistItems,
} from '../db/schema.ts';
import { ensureSeedProducts } from '../db/seed.ts';
import {
  AuthRequest,
  optionalAuth,
  requireAdmin,
  requireAuth,
} from '../middleware/auth.ts';
import {
  analyzePersonalStyle,
  analyzeVirtualTryOn,
  animateFashionPhotoToVideo,
  compareSavedOutfitsDecision,
  decodeInspirationAndRecreate,
  generateBudgetTiers,
  generateStylistOutfit,
  generateTravelOutfitPlan,
  matchExistingGarment,
  predictSmartSize,
  regenerateOutfitSlot,
  runStylistChat,
  StylistChatMode,
  validateBase64Image,
} from './aiService.ts';
import {
  compareProductListings,
  computeWardrobeIntelligence,
  getWeatherStylingAdvice,
} from './recommendationEngine.ts';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'stylesync-api' });
});

// ================= AUTH & PROFILE =================

apiRouter.get('/auth/me', requireAuth, async (req: AuthRequest, res) => {
  res.json({ user: req.dbUser });
});

apiRouter.post('/profile/onboarding', requireAuth, async (req: AuthRequest, res) => {
  try {
    const dbUser = req.dbUser!;
    const { preferences, skipped } = req.body || {};

    const mergedPrefs = {
      ...(dbUser.stylePreferences || {
        preferredStyles: ['Minimalist'],
        favoriteColors: ['Ivory', 'Olive'],
        clothingPreferences: [],
        preferredPlatforms: ['Myntra', 'Flipkart', 'Meesho'],
        budgetMin: 800,
        budgetMax: 5000,
        preferredBrands: [],
        commonOccasions: ['Casual', 'Work'],
        fitPreference: 'Regular',
        sizes: {},
      }),
      ...(preferences && typeof preferences === 'object' ? preferences : {}),
    };

    const [updated] = await db
      .update(users)
      .set({
        onboardingCompleted: true,
        stylePreferences: mergedPrefs,
        fashionTwinProfile: {
          learnedColors: mergedPrefs.favoriteColors || [],
          preferredCategories: dbUser.fashionTwinProfile?.preferredCategories || ['Tops', 'Trousers'],
          approvedTags: mergedPrefs.preferredStyles || [],
          dislikedTags: dbUser.fashionTwinProfile?.dislikedTags || [],
          feedbackCount: (dbUser.fashionTwinProfile?.feedbackCount || 0) + (skipped ? 0 : 1),
          styleSummary: skipped
            ? 'Default balanced wardrobe profile — customize anytime in Fashion Twin.'
            : `Curated ${(mergedPrefs.preferredStyles || []).join(' & ') || 'modern'} aesthetic aligned with ${(mergedPrefs.commonOccasions || []).join(', ') || 'everyday'} occasions.`,
        },
        updatedAt: new Date(),
      })
      .where(eq(users.id, dbUser.id))
      .returning();

    res.json({ user: updated });
  } catch (error) {
    console.error('Onboarding update failed:', error);
    res.status(500).json({ error: 'Failed to save onboarding preferences.' });
  }
});

apiRouter.put('/profile/preferences', requireAuth, async (req: AuthRequest, res) => {
  try {
    const dbUser = req.dbUser!;
    const { stylePreferences, displayName, fashionTwinProfile } = req.body || {};

    const [updated] = await db
      .update(users)
      .set({
        displayName: typeof displayName === 'string' && displayName.trim() ? displayName.trim() : dbUser.displayName,
        stylePreferences: stylePreferences ?? dbUser.stylePreferences,
        fashionTwinProfile: fashionTwinProfile ?? dbUser.fashionTwinProfile,
        updatedAt: new Date(),
      })
      .where(eq(users.id, dbUser.id))
      .returning();

    res.json({ user: updated });
  } catch (error) {
    console.error('Preferences update failed:', error);
    res.status(500).json({ error: 'Failed to update profile preferences.' });
  }
});

apiRouter.post('/profile/fashion-twin/feedback', requireAuth, async (req: AuthRequest, res) => {
  try {
    const dbUser = req.dbUser!;
    const { approvedTag, dislikedTag, color } = req.body || {};
    const twin = dbUser.fashionTwinProfile || {
      learnedColors: [],
      preferredCategories: [],
      approvedTags: [],
      dislikedTags: [],
      feedbackCount: 0,
      styleSummary: '',
    };

    const nextTwin = {
      ...twin,
      approvedTags: approvedTag
        ? Array.from(new Set([...twin.approvedTags, String(approvedTag)]))
        : twin.approvedTags,
      dislikedTags: dislikedTag
        ? Array.from(new Set([...twin.dislikedTags, String(dislikedTag)]))
        : twin.dislikedTags,
      learnedColors: color
        ? Array.from(new Set([...twin.learnedColors, String(color)]))
        : twin.learnedColors,
      feedbackCount: (twin.feedbackCount || 0) + 1,
    };

    const [updated] = await db
      .update(users)
      .set({ fashionTwinProfile: nextTwin, updatedAt: new Date() })
      .where(eq(users.id, dbUser.id))
      .returning();

    res.json({ user: updated });
  } catch (error) {
    console.error('Fashion Twin feedback failed:', error);
    res.status(500).json({ error: 'Failed to update Fashion Twin profile.' });
  }
});

// ================= PERSONAL STYLE ANALYSIS =================

apiRouter.get('/analysis/style', requireAuth, async (req: AuthRequest, res) => {
  try {
    const rows = await db
      .select()
      .from(styleAnalyses)
      .where(eq(styleAnalyses.userId, req.dbUser!.id))
      .orderBy(desc(styleAnalyses.createdAt));
    res.json({ analyses: rows });
  } catch (error) {
    console.error('Load style analyses failed:', error);
    res.status(500).json({ error: 'Failed to load style analyses.' });
  }
});

apiRouter.post('/analysis/style', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { imageData, notes } = req.body || {};
    if (!imageData) {
      return res.status(400).json({ error: 'Please upload a photograph for analysis.' });
    }
    validateBase64Image(imageData);

    const aiResult = await analyzePersonalStyle(imageData, notes);

    const [created] = await db
      .insert(styleAnalyses)
      .values({
        userId: req.dbUser!.id,
        imageData,
        skinTone: aiResult.skinTone,
        undertone: aiResult.undertone,
        complementaryColors: aiResult.complementaryColors,
        colorPalette: aiResult.colorPalette,
        bodyProportions: aiResult.bodyProportions,
        personalStyles: aiResult.personalStyles,
        stylingSuggestions: aiResult.stylingSuggestions,
        userEdited: false,
      })
      .returning();

    res.json({ analysis: created });
  } catch (error: any) {
    console.error('Style analysis error:', error);
    res.status(error?.status || 500).json({
      error: error?.message || 'Failed to analyze photograph. Please try again.',
    });
  }
});

apiRouter.put('/analysis/style/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid analysis ID.' });

    const { skinTone, undertone, personalStyles, complementaryColors, bodyProportions } =
      req.body || {};

    const existing = await db
      .select()
      .from(styleAnalyses)
      .where(and(eq(styleAnalyses.id, id), eq(styleAnalyses.userId, req.dbUser!.id)))
      .limit(1);

    if (!existing.length) return res.status(404).json({ error: 'Analysis not found.' });

    const [updated] = await db
      .update(styleAnalyses)
      .set({
        skinTone: skinTone ?? existing[0].skinTone,
        undertone: undertone ?? existing[0].undertone,
        personalStyles: personalStyles ?? existing[0].personalStyles,
        complementaryColors: complementaryColors ?? existing[0].complementaryColors,
        bodyProportions: bodyProportions ?? existing[0].bodyProportions,
        userEdited: true,
      })
      .where(and(eq(styleAnalyses.id, id), eq(styleAnalyses.userId, req.dbUser!.id)))
      .returning();

    res.json({ analysis: updated });
  } catch (error) {
    console.error('Update style analysis error:', error);
    res.status(500).json({ error: 'Failed to update style analysis.' });
  }
});

apiRouter.delete('/analysis/style/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid analysis ID.' });

    const deleted = await db
      .delete(styleAnalyses)
      .where(and(eq(styleAnalyses.id, id), eq(styleAnalyses.userId, req.dbUser!.id)))
      .returning({ id: styleAnalyses.id });

    if (!deleted.length) return res.status(404).json({ error: 'Analysis not found.' });
    res.json({ deletedId: deleted[0].id });
  } catch (error) {
    console.error('Delete style analysis error:', error);
    res.status(500).json({ error: 'Failed to delete photograph and analysis.' });
  }
});

// ================= AI PERSONAL FASHION STYLIST =================

apiRouter.post('/ai/stylist', requireAuth, async (req: AuthRequest, res) => {
  try {
    await ensureSeedProducts();
    const { query, weatherContext } = req.body || {};
    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ error: 'Please describe the outfit or occasion you need.' });
    }

    const userWardrobe = await db
      .select({
        id: wardrobeItems.id,
        name: wardrobeItems.name,
        category: wardrobeItems.category,
        color: wardrobeItems.color,
      })
      .from(wardrobeItems)
      .where(eq(wardrobeItems.userId, req.dbUser!.id));

    const catalogRows = await db.select().from(products);
    const catalogSummary = catalogRows.map((p) => {
      const best = [...(p.listings || [])].sort((a, b) => a.currentPrice - b.currentPrice)[0];
      return {
        id: p.id,
        name: p.name,
        category: p.category,
        color: p.color,
        price: best?.currentPrice || 1499,
        platform: best?.platform || 'Myntra',
        url: best?.productUrl || 'https://www.myntra.com',
        imageUrl: p.imageUrl,
      };
    });

    const outfit = await generateStylistOutfit(
      query.trim(),
      req.dbUser!.stylePreferences,
      userWardrobe,
      catalogSummary,
      weatherContext,
    );

    res.json({ outfit });
  } catch (error: any) {
    console.error('AI Stylist error:', error);
    res.status(error?.status || 500).json({
      error: error?.message || 'Unable to generate outfit recommendation.',
    });
  }
});

apiRouter.post('/ai/stylist/slot', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { currentOutfit, slotToReplace, instruction } = req.body || {};
    if (!currentOutfit || !slotToReplace) {
      return res.status(400).json({ error: 'Outfit and target component slot are required.' });
    }
    const replacement = await regenerateOutfitSlot(
      currentOutfit,
      slotToReplace,
      instruction || '',
      req.dbUser!.stylePreferences,
    );
    res.json({ replacement });
  } catch (error: any) {
    console.error('AI slot regeneration error:', error);
    res.status(error?.status || 500).json({
      error: error?.message || 'Unable to regenerate component.',
    });
  }
});

apiRouter.post('/ai/chat', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { messages, mode } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Conversation messages are required.' });
    }

    const userWardrobe = await db
      .select({
        name: wardrobeItems.name,
        category: wardrobeItems.category,
        color: wardrobeItems.color,
      })
      .from(wardrobeItems)
      .where(eq(wardrobeItems.userId, req.dbUser!.id));

    const validMode: StylistChatMode = ['general', 'fast', 'complex', 'deep'].includes(mode)
      ? mode
      : 'general';

    const result = await runStylistChat({
      messages,
      mode: validMode,
      prefs: req.dbUser!.stylePreferences,
      wardrobeSummary: userWardrobe,
    });

    res.json(result);
  } catch (error: any) {
    console.error('AI stylist chat error:', error);
    res.status(error?.status || 500).json({
      error: error?.message || 'Unable to reach Gemini Stylist Chat.',
    });
  }
});

apiRouter.post('/ai/animate-video', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { imageData, prompt, aspectRatio } = req.body || {};
    if (!imageData) {
      return res.status(400).json({ error: 'Please upload a photo to animate.' });
    }
    const ratio: '16:9' | '9:16' = aspectRatio === '9:16' ? '9:16' : '16:9';

    const result = await animateFashionPhotoToVideo({
      imageInput: imageData,
      prompt: typeof prompt === 'string' ? prompt : '',
      aspectRatio: ratio,
    });

    res.json(result);
  } catch (error: any) {
    console.error('Animate video error:', error);
    res.status(error?.status || 500).json({
      error: error?.message || 'Video generation failed.',
    });
  }
});

// ================= AI VIRTUAL TRY-ON STUDIO =================

apiRouter.get('/virtual-try-ons', requireAuth, async (req: AuthRequest, res) => {
  try {
    const rows = await db
      .select()
      .from(virtualTryOns)
      .where(eq(virtualTryOns.userId, req.dbUser!.id))
      .orderBy(desc(virtualTryOns.createdAt));
    res.json({ tryOns: rows });
  } catch (error) {
    console.error('Load virtual try-ons failed:', error);
    res.status(500).json({ error: 'Failed to load saved try-ons.' });
  }
});

apiRouter.post('/ai/virtual-try-on', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { personImage, productId, customProductName, customProductCategory, customProductColor } =
      req.body || {};
    if (!personImage) {
      return res.status(400).json({ error: 'Please upload a user photograph.' });
    }
    validateBase64Image(personImage);

    let product = {
      name: customProductName || 'Olive Green Chanderi Silk Kurti',
      category: customProductCategory || 'Kurtis',
      color: customProductColor || 'Olive Green',
      style: 'Modern Ethnic',
      imageUrl: '/src/assets/images/product_olive_kurti_1795618609659.jpg',
    };

    if (productId) {
      const found = await db
        .select()
        .from(products)
        .where(eq(products.id, Number(productId)))
        .limit(1);
      if (found.length > 0) {
        product = {
          name: found[0].name,
          category: found[0].category,
          color: found[0].color,
          style: found[0].style,
          imageUrl: found[0].imageUrl,
        };
      }
    }

    const result = await analyzeVirtualTryOn(personImage, product);

    let savedRecord = null;
    if (result.generatedImage) {
      const [inserted] = await db
        .insert(virtualTryOns)
        .values({
          userId: req.dbUser!.id,
          productName: product.name,
          productCategory: product.category,
          originalImage: personImage,
          generatedImage: result.generatedImage,
          isFavorite: false,
        })
        .returning();
      savedRecord = inserted;
    }

    res.json({ ...result, product, savedRecord });
  } catch (error: any) {
    console.error('Virtual try-on error:', error);
    res.status(error?.status || 500).json({
      error: error?.message || 'Virtual try-on processing failed.',
    });
  }
});

apiRouter.patch('/virtual-try-ons/:id/favorite', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await db
      .select()
      .from(virtualTryOns)
      .where(and(eq(virtualTryOns.id, id), eq(virtualTryOns.userId, req.dbUser!.id)))
      .limit(1);
    if (!existing.length) return res.status(404).json({ error: 'Try-on not found.' });

    const [updated] = await db
      .update(virtualTryOns)
      .set({ isFavorite: !existing[0].isFavorite })
      .where(and(eq(virtualTryOns.id, id), eq(virtualTryOns.userId, req.dbUser!.id)))
      .returning();

    res.json({ tryOn: updated });
  } catch (error) {
    console.error('Toggle try-on favorite failed:', error);
    res.status(500).json({ error: 'Failed to update favorite state.' });
  }
});

apiRouter.delete('/virtual-try-ons/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const deleted = await db
      .delete(virtualTryOns)
      .where(and(eq(virtualTryOns.id, id), eq(virtualTryOns.userId, req.dbUser!.id)))
      .returning({ id: virtualTryOns.id });
    if (!deleted.length) return res.status(404).json({ error: 'Try-on not found.' });
    res.json({ deletedId: deleted[0].id });
  } catch (error) {
    console.error('Delete try-on failed:', error);
    res.status(500).json({ error: 'Failed to delete try-on.' });
  }
});

// ================= INSPIRATION DECODER, OUTFIT RECREATOR & OUTFIT MATCHER =================

apiRouter.post('/ai/inspiration-decoder', requireAuth, async (req: AuthRequest, res) => {
  try {
    await ensureSeedProducts();
    const { imageData } = req.body || {};
    if (!imageData) return res.status(400).json({ error: 'Please upload an inspiration image.' });

    const userWardrobe = await db
      .select({
        id: wardrobeItems.id,
        name: wardrobeItems.name,
        category: wardrobeItems.category,
        color: wardrobeItems.color,
        style: wardrobeItems.style,
      })
      .from(wardrobeItems)
      .where(eq(wardrobeItems.userId, req.dbUser!.id));

    const catalogRows = await db.select().from(products);
    const catalogSummary = catalogRows.map((p) => {
      const best = [...(p.listings || [])].sort((a, b) => a.currentPrice - b.currentPrice)[0];
      return {
        id: p.id,
        name: p.name,
        category: p.category,
        color: p.color,
        price: best?.currentPrice || 1299,
        platform: best?.platform || 'Myntra',
        url: best?.productUrl || 'https://www.myntra.com',
      };
    });

    const decoded = await decodeInspirationAndRecreate(imageData, userWardrobe, catalogSummary);
    res.json({ decoded });
  } catch (error: any) {
    console.error('Inspiration decoder error:', error);
    res.status(error?.status || 500).json({
      error: error?.message || 'Failed to decode inspiration image.',
    });
  }
});

apiRouter.post('/ai/outfit-matcher', requireAuth, async (req: AuthRequest, res) => {
  try {
    await ensureSeedProducts();
    const { imageData } = req.body || {};
    if (!imageData) return res.status(400).json({ error: 'Please upload a clothing item image.' });

    const userWardrobe = await db
      .select({
        id: wardrobeItems.id,
        name: wardrobeItems.name,
        category: wardrobeItems.category,
        color: wardrobeItems.color,
      })
      .from(wardrobeItems)
      .where(eq(wardrobeItems.userId, req.dbUser!.id));

    const catalogRows = await db.select().from(products);
    const catalogSummary = catalogRows.map((p) => {
      const best = [...(p.listings || [])].sort((a, b) => a.currentPrice - b.currentPrice)[0];
      return {
        id: p.id,
        name: p.name,
        category: p.category,
        color: p.color,
        price: best?.currentPrice || 1299,
        platform: best?.platform || 'Myntra',
        url: best?.productUrl || 'https://www.myntra.com',
      };
    });

    const matched = await matchExistingGarment(imageData, userWardrobe, catalogSummary);
    res.json({ matched });
  } catch (error: any) {
    console.error('Outfit matcher error:', error);
    res.status(error?.status || 500).json({
      error: error?.message || 'Failed to match clothing item.',
    });
  }
});

// ================= BUDGET OUTFIT GENERATOR & SMART SIZE PREDICTOR =================

apiRouter.post('/ai/budget-looks', requireAuth, async (req: AuthRequest, res) => {
  try {
    await ensureSeedProducts();
    const { occasion, budget, stylePref, category, preferredColors } = req.body || {};
    const numBudget = Math.max(500, Number(budget) || 3000);

    const catalogRows = await db.select().from(products);
    const catalogSummary = catalogRows.map((p) => {
      const best = [...(p.listings || [])].sort((a, b) => a.currentPrice - b.currentPrice)[0];
      return {
        id: p.id,
        name: p.name,
        category: p.category,
        color: p.color,
        price: best?.currentPrice || 1299,
        platform: best?.platform || 'Myntra',
        url: best?.productUrl || 'https://www.myntra.com',
      };
    });

    const result = await generateBudgetTiers({
      occasion: occasion || 'Casual',
      budget: numBudget,
      stylePref: stylePref || 'Fusion',
      category: category || 'Complete Outfit',
      preferredColors: Array.isArray(preferredColors) ? preferredColors : ['Olive', 'Ivory'],
      catalogSummary,
    });
    res.json(result);
  } catch (error: any) {
    console.error('Budget generator error:', error);
    res.status(error?.status || 500).json({
      error: error?.message || 'Failed to generate budget outfit tiers.',
    });
  }
});

apiRouter.post('/ai/size-predictor', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { heightCm, chestCm, waistCm, hipCm, fitPreference, existingSize, brand, category } =
      req.body || {};
    const prediction = await predictSmartSize({
      heightCm: heightCm ? Number(heightCm) : undefined,
      chestCm: chestCm ? Number(chestCm) : undefined,
      waistCm: waistCm ? Number(waistCm) : undefined,
      hipCm: hipCm ? Number(hipCm) : undefined,
      fitPreference: fitPreference || 'Regular',
      existingSize: existingSize || 'M',
      brand: brand || 'Fabindia',
      category: category || 'Tops & Kurtis',
    });
    res.json({ prediction });
  } catch (error: any) {
    console.error('Size predictor error:', error);
    res.status(error?.status || 500).json({
      error: error?.message || 'Failed to predict size.',
    });
  }
});

// ================= DIGITAL WARDROBE & INTELLIGENCE =================

apiRouter.get('/wardrobe', requireAuth, async (req: AuthRequest, res) => {
  try {
    const items = await db
      .select()
      .from(wardrobeItems)
      .where(eq(wardrobeItems.userId, req.dbUser!.id))
      .orderBy(desc(wardrobeItems.createdAt));
    res.json({ items });
  } catch (error) {
    console.error('Fetch wardrobe failed:', error);
    res.status(500).json({ error: 'Failed to load digital wardrobe.' });
  }
});

apiRouter.post('/wardrobe', requireAuth, async (req: AuthRequest, res) => {
  try {
    const {
      name,
      category,
      color,
      colorHex,
      pattern,
      style,
      brand,
      size,
      season,
      purchasePrice,
      imageData,
      notes,
    } = req.body || {};

    if (!name || !category || !color) {
      return res.status(400).json({ error: 'Name, category, and color are required.' });
    }
    if (imageData) {
      validateBase64Image(imageData);
    }

    const [created] = await db
      .insert(wardrobeItems)
      .values({
        userId: req.dbUser!.id,
        name: String(name).trim(),
        category: String(category).trim(),
        color: String(color).trim(),
        colorHex: colorHex || '#A8A29E',
        pattern: pattern || 'Solid',
        style: style || 'Casual',
        brand: brand || '',
        size: size || '',
        season: season || 'All-Season',
        purchasePrice: Math.max(0, Number(purchasePrice) || 0),
        wearCount: 0,
        imageData: imageData || null,
        notes: notes || '',
      })
      .returning();

    res.status(201).json({ item: created });
  } catch (error: any) {
    console.error('Add wardrobe item failed:', error);
    res.status(500).json({ error: error?.message || 'Failed to add wardrobe item.' });
  }
});

apiRouter.put('/wardrobe/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await db
      .select()
      .from(wardrobeItems)
      .where(and(eq(wardrobeItems.id, id), eq(wardrobeItems.userId, req.dbUser!.id)))
      .limit(1);
    if (!existing.length) return res.status(404).json({ error: 'Item not found.' });

    const { name, category, color, style, brand, size, season, purchasePrice, notes } = req.body || {};
    const [updated] = await db
      .update(wardrobeItems)
      .set({
        name: name ?? existing[0].name,
        category: category ?? existing[0].category,
        color: color ?? existing[0].color,
        style: style ?? existing[0].style,
        brand: brand ?? existing[0].brand,
        size: size ?? existing[0].size,
        season: season ?? existing[0].season,
        purchasePrice: purchasePrice !== undefined ? Math.max(0, Number(purchasePrice) || 0) : existing[0].purchasePrice,
        notes: notes ?? existing[0].notes,
      })
      .where(and(eq(wardrobeItems.id, id), eq(wardrobeItems.userId, req.dbUser!.id)))
      .returning();

    res.json({ item: updated });
  } catch (error) {
    console.error('Update wardrobe item failed:', error);
    res.status(500).json({ error: 'Failed to update wardrobe item.' });
  }
});

apiRouter.post('/wardrobe/:id/wear', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await db
      .select()
      .from(wardrobeItems)
      .where(and(eq(wardrobeItems.id, id), eq(wardrobeItems.userId, req.dbUser!.id)))
      .limit(1);
    if (!existing.length) return res.status(404).json({ error: 'Item not found.' });

    const [updated] = await db
      .update(wardrobeItems)
      .set({
        wearCount: (existing[0].wearCount || 0) + 1,
        lastWornAt: new Date(),
      })
      .where(and(eq(wardrobeItems.id, id), eq(wardrobeItems.userId, req.dbUser!.id)))
      .returning();

    res.json({ item: updated });
  } catch (error) {
    console.error('Log wear failed:', error);
    res.status(500).json({ error: 'Failed to record wear count.' });
  }
});

apiRouter.delete('/wardrobe/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const deleted = await db
      .delete(wardrobeItems)
      .where(and(eq(wardrobeItems.id, id), eq(wardrobeItems.userId, req.dbUser!.id)))
      .returning({ id: wardrobeItems.id });
    if (!deleted.length) return res.status(404).json({ error: 'Item not found.' });
    res.json({ deletedId: deleted[0].id });
  } catch (error) {
    console.error('Delete wardrobe item failed:', error);
    res.status(500).json({ error: 'Failed to delete wardrobe item.' });
  }
});

apiRouter.get('/intelligence/summary', requireAuth, async (req: AuthRequest, res) => {
  try {
    const temp = Number(req.query.temp) || 26;
    const condition = String(req.query.condition || 'Clear');

    const items = await db
      .select()
      .from(wardrobeItems)
      .where(eq(wardrobeItems.userId, req.dbUser!.id));

    const outfits = await db
      .select({ id: savedOutfits.id })
      .from(savedOutfits)
      .where(eq(savedOutfits.userId, req.dbUser!.id));

    const intelligence = computeWardrobeIntelligence(
      items,
      outfits.length,
      req.dbUser!.stylePreferences?.preferredStyles || [],
    );

    const weatherAdvice = getWeatherStylingAdvice(temp, condition);
    res.json({ intelligence, weatherAdvice });
  } catch (error) {
    console.error('Intelligence summary failed:', error);
    res.status(500).json({ error: 'Failed to compute wardrobe intelligence.' });
  }
});

// ================= SAVED OUTFITS & DECISION ASSISTANT =================

apiRouter.get('/outfits', requireAuth, async (req: AuthRequest, res) => {
  try {
    const rows = await db
      .select()
      .from(savedOutfits)
      .where(eq(savedOutfits.userId, req.dbUser!.id))
      .orderBy(desc(savedOutfits.createdAt));
    res.json({ outfits: rows });
  } catch (error) {
    console.error('Load saved outfits failed:', error);
    res.status(500).json({ error: 'Failed to load saved outfits.' });
  }
});

apiRouter.post('/outfits', requireAuth, async (req: AuthRequest, res) => {
  try {
    const {
      title,
      occasion,
      collectionName,
      totalCost,
      source,
      items,
      stylingNotes,
      hairstyleSuggestion,
    } = req.body || {};

    if (!title || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Outfit title and component items are required.' });
    }

    const [created] = await db
      .insert(savedOutfits)
      .values({
        userId: req.dbUser!.id,
        title: String(title).trim(),
        occasion: occasion || 'Casual',
        collectionName: collectionName || 'Everyday Edit',
        totalCost: Math.max(0, Number(totalCost) || 0),
        source: source || 'ai_stylist',
        items,
        stylingNotes: stylingNotes || '',
        hairstyleSuggestion: hairstyleSuggestion || '',
      })
      .returning();

    res.status(201).json({ outfit: created });
  } catch (error) {
    console.error('Save outfit failed:', error);
    res.status(500).json({ error: 'Failed to save outfit.' });
  }
});

apiRouter.delete('/outfits/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const deleted = await db
      .delete(savedOutfits)
      .where(and(eq(savedOutfits.id, id), eq(savedOutfits.userId, req.dbUser!.id)))
      .returning({ id: savedOutfits.id });
    if (!deleted.length) return res.status(404).json({ error: 'Saved outfit not found.' });
    res.json({ deletedId: deleted[0].id });
  } catch (error) {
    console.error('Delete saved outfit failed:', error);
    res.status(500).json({ error: 'Failed to delete saved outfit.' });
  }
});

apiRouter.post('/ai/decision-assistant', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { outfitIds, targetOccasion } = req.body || {};
    if (!Array.isArray(outfitIds) || outfitIds.length < 2) {
      return res.status(400).json({ error: 'Select at least 2 saved outfits to compare.' });
    }

    const allSaved = await db
      .select()
      .from(savedOutfits)
      .where(eq(savedOutfits.userId, req.dbUser!.id));

    const selected = allSaved.filter((o) => outfitIds.includes(o.id));
    if (selected.length < 2) {
      return res.status(404).json({ error: 'Selected outfits not found.' });
    }

    const comparison = await compareSavedOutfitsDecision(
      selected,
      targetOccasion || 'Social Gathering',
      req.dbUser!.stylePreferences,
    );
    res.json({ comparison });
  } catch (error: any) {
    console.error('Decision assistant error:', error);
    res.status(error?.status || 500).json({
      error: error?.message || 'Failed to compare saved outfits.',
    });
  }
});

// ================= SMART SHOPPING & WISHLIST =================

apiRouter.get('/products', optionalAuth, async (req: AuthRequest, res) => {
  try {
    await ensureSeedProducts();
    const category = req.query.category ? String(req.query.category) : '';
    const search = req.query.q ? String(req.query.q).toLowerCase() : '';

    const rows = await db.select().from(products).orderBy(desc(products.createdAt));

    const filtered = rows.filter((p) => {
      if (category && category !== 'All' && p.category !== category) return false;
      if (
        search &&
        !p.name.toLowerCase().includes(search) &&
        !p.brand.toLowerCase().includes(search) &&
        !p.color.toLowerCase().includes(search) &&
        !p.style.toLowerCase().includes(search)
      ) {
        return false;
      }
      return true;
    });

    const enriched = filtered.map((p) => ({
      ...p,
      comparison: compareProductListings(p.listings || [], req.dbUser?.stylePreferences),
    }));

    res.json({ products: enriched });
  } catch (error) {
    console.error('Products fetch failed:', error);
    res.status(500).json({ error: 'Failed to load shopping catalog.' });
  }
});

apiRouter.get('/wishlist', requireAuth, async (req: AuthRequest, res) => {
  try {
    const rows = await db
      .select()
      .from(wishlistItems)
      .where(eq(wishlistItems.userId, req.dbUser!.id))
      .orderBy(desc(wishlistItems.createdAt));
    res.json({ wishlist: rows });
  } catch (error) {
    console.error('Load wishlist failed:', error);
    res.status(500).json({ error: 'Failed to load wishlist.' });
  }
});

apiRouter.post('/wishlist', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { productId, productSnapshot, targetPrice, priceDropAlertEnabled } = req.body || {};

    const [created] = await db
      .insert(wishlistItems)
      .values({
        userId: req.dbUser!.id,
        productId: productId ? Number(productId) : null,
        productSnapshot: productSnapshot || null,
        targetPrice: targetPrice ? Number(targetPrice) : null,
        priceDropAlertEnabled: priceDropAlertEnabled !== false,
      })
      .returning();

    if (priceDropAlertEnabled !== false && productSnapshot?.name) {
      await db.insert(notifications).values({
        userId: req.dbUser!.id,
        type: 'price_drop',
        title: `Tracking ${productSnapshot.name}`,
        message: `Price alert enabled${targetPrice ? ` for target ₹${targetPrice}` : ''}. Demo alert channel active.`,
        isRead: false,
      });
    }

    res.status(201).json({ item: created });
  } catch (error) {
    console.error('Add wishlist failed:', error);
    res.status(500).json({ error: 'Failed to save item to wishlist.' });
  }
});

apiRouter.delete('/wishlist/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const deleted = await db
      .delete(wishlistItems)
      .where(and(eq(wishlistItems.id, id), eq(wishlistItems.userId, req.dbUser!.id)))
      .returning({ id: wishlistItems.id });
    if (!deleted.length) return res.status(404).json({ error: 'Wishlist item not found.' });
    res.json({ deletedId: deleted[0].id });
  } catch (error) {
    console.error('Remove wishlist failed:', error);
    res.status(500).json({ error: 'Failed to remove wishlist item.' });
  }
});

// ================= OUTFIT CALENDAR & TRAVEL PLANNER =================

apiRouter.get('/calendar', requireAuth, async (req: AuthRequest, res) => {
  try {
    const rows = await db
      .select()
      .from(outfitCalendar)
      .where(eq(outfitCalendar.userId, req.dbUser!.id))
      .orderBy(outfitCalendar.eventDate);
    res.json({ events: rows });
  } catch (error) {
    console.error('Load calendar failed:', error);
    res.status(500).json({ error: 'Failed to load outfit calendar.' });
  }
});

apiRouter.post('/calendar', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { eventDate, eventTitle, occasion, outfitId, outfitSummary, weatherNote } = req.body || {};
    if (!eventDate || !eventTitle) {
      return res.status(400).json({ error: 'Date and event title are required.' });
    }

    const [created] = await db
      .insert(outfitCalendar)
      .values({
        userId: req.dbUser!.id,
        eventDate: String(eventDate),
        eventTitle: String(eventTitle).trim(),
        occasion: occasion || 'Casual',
        outfitId: outfitId ? Number(outfitId) : null,
        outfitSummary: outfitSummary || '',
        weatherNote: weatherNote || '',
      })
      .returning();

    res.status(201).json({ event: created });
  } catch (error) {
    console.error('Create calendar event failed:', error);
    res.status(500).json({ error: 'Failed to schedule outfit.' });
  }
});

apiRouter.delete('/calendar/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const deleted = await db
      .delete(outfitCalendar)
      .where(and(eq(outfitCalendar.id, id), eq(outfitCalendar.userId, req.dbUser!.id)))
      .returning({ id: outfitCalendar.id });
    if (!deleted.length) return res.status(404).json({ error: 'Calendar event not found.' });
    res.json({ deletedId: deleted[0].id });
  } catch (error) {
    console.error('Delete calendar event failed:', error);
    res.status(500).json({ error: 'Failed to delete scheduled outfit.' });
  }
});

apiRouter.get('/travel-plans', requireAuth, async (req: AuthRequest, res) => {
  try {
    const rows = await db
      .select()
      .from(travelPlans)
      .where(eq(travelPlans.userId, req.dbUser!.id))
      .orderBy(desc(travelPlans.createdAt));
    res.json({ plans: rows });
  } catch (error) {
    console.error('Load travel plans failed:', error);
    res.status(500).json({ error: 'Failed to load travel plans.' });
  }
});

apiRouter.post('/ai/travel-planner', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { destination, startDate, durationDays, activities, weatherPref } = req.body || {};
    if (!destination || !startDate) {
      return res.status(400).json({ error: 'Destination and start date are required.' });
    }

    const wardrobe = await db
      .select({
        name: wardrobeItems.name,
        category: wardrobeItems.category,
        color: wardrobeItems.color,
      })
      .from(wardrobeItems)
      .where(eq(wardrobeItems.userId, req.dbUser!.id));

    const generatedPlan = await generateTravelOutfitPlan({
      destination: String(destination).trim(),
      startDate: String(startDate),
      durationDays: Number(durationDays) || 3,
      activities: Array.isArray(activities) ? activities : ['Sightseeing', 'Dinner'],
      weatherPref: weatherPref || 'Mild & Sunny',
      wardrobeSummary: wardrobe,
    });

    const [created] = await db
      .insert(travelPlans)
      .values({
        userId: req.dbUser!.id,
        destination: String(destination).trim(),
        startDate: String(startDate),
        durationDays: Number(durationDays) || 3,
        activities: Array.isArray(activities) ? activities : ['Sightseeing', 'Dinner'],
        weatherPref: weatherPref || 'Mild & Sunny',
        generatedPlan,
      })
      .returning();

    res.status(201).json({ plan: created });
  } catch (error: any) {
    console.error('Travel planner error:', error);
    res.status(error?.status || 500).json({
      error: error?.message || 'Failed to generate travel capsule plan.',
    });
  }
});

apiRouter.delete('/travel-plans/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const deleted = await db
      .delete(travelPlans)
      .where(and(eq(travelPlans.id, id), eq(travelPlans.userId, req.dbUser!.id)))
      .returning({ id: travelPlans.id });
    if (!deleted.length) return res.status(404).json({ error: 'Travel plan not found.' });
    res.json({ deletedId: deleted[0].id });
  } catch (error) {
    console.error('Delete travel plan failed:', error);
    res.status(500).json({ error: 'Failed to delete travel plan.' });
  }
});

// ================= NOTIFICATIONS =================

apiRouter.get('/notifications', requireAuth, async (req: AuthRequest, res) => {
  try {
    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, req.dbUser!.id))
      .orderBy(desc(notifications.createdAt))
      .limit(20);
    res.json({ notifications: rows });
  } catch (error) {
    console.error('Load notifications failed:', error);
    res.status(500).json({ error: 'Failed to load notifications.' });
  }
});

apiRouter.patch('/notifications/:id/read', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const [updated] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, req.dbUser!.id)))
      .returning();
    if (!updated) return res.status(404).json({ error: 'Notification not found.' });
    res.json({ notification: updated });
  } catch (error) {
    console.error('Mark notification read failed:', error);
    res.status(500).json({ error: 'Failed to update notification.' });
  }
});

// ================= ADMIN CONSOLE (ROLE-BASED ACCESS) =================

apiRouter.get('/admin/overview', requireAuth, requireAdmin, async (_req, res) => {
  try {
    await ensureSeedProducts();
    const [userCount] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
    const [productCount] = await db.select({ count: sql<number>`count(*)::int` }).from(products);
    const [wardrobeCount] = await db.select({ count: sql<number>`count(*)::int` }).from(wardrobeItems);
    const [outfitCount] = await db.select({ count: sql<number>`count(*)::int` }).from(savedOutfits);
    const [analysisCount] = await db.select({ count: sql<number>`count(*)::int` }).from(styleAnalyses);

    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        role: users.role,
        onboardingCompleted: users.onboardingCompleted,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    const allProducts = await db.select().from(products).orderBy(desc(products.createdAt));

    res.json({
      stats: {
        users: userCount?.count || 0,
        products: productCount?.count || 0,
        wardrobeItems: wardrobeCount?.count || 0,
        savedOutfits: outfitCount?.count || 0,
        styleAnalyses: analysisCount?.count || 0,
      },
      users: allUsers,
      products: allProducts,
    });
  } catch (error) {
    console.error('Admin overview failed:', error);
    res.status(500).json({ error: 'Failed to load admin overview.' });
  }
});

apiRouter.patch('/admin/users/:id/role', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { role } = req.body || {};
    if (role !== 'user' && role !== 'admin') {
      return res.status(400).json({ error: 'Role must be "user" or "admin".' });
    }
    const [updated] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        role: users.role,
      });
    if (!updated) return res.status(404).json({ error: 'User not found.' });
    res.json({ user: updated });
  } catch (error) {
    console.error('Admin role update failed:', error);
    res.status(500).json({ error: 'Failed to update user role.' });
  }
});

apiRouter.post('/admin/products', requireAuth, requireAdmin, async (req, res) => {
  try {
    const {
      name,
      category,
      brand,
      color,
      colorHex,
      style,
      occasion,
      description,
      imageUrl,
      availableSizes,
      listings,
      isDemoData,
    } = req.body || {};

    if (!name || !category || !brand || !color) {
      return res.status(400).json({ error: 'Name, category, brand, and color are required.' });
    }

    const [created] = await db
      .insert(products)
      .values({
        name: String(name).trim(),
        category: String(category).trim(),
        brand: String(brand).trim(),
        color: String(color).trim(),
        colorHex: colorHex || '#A8A29E',
        style: style || 'Minimalist',
        occasion: occasion || 'Casual',
        description: description || '',
        imageUrl: imageUrl || '/src/assets/images/product_olive_kurti_1795618609659.jpg',
        availableSizes: Array.isArray(availableSizes) ? availableSizes : ['S', 'M', 'L'],
        listings: Array.isArray(listings) ? listings : [],
        isDemoData: isDemoData !== false,
      })
      .returning();

    res.status(201).json({ product: created });
  } catch (error) {
    console.error('Admin create product failed:', error);
    res.status(500).json({ error: 'Failed to create catalog product.' });
  }
});

apiRouter.delete('/admin/products/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const deleted = await db
      .delete(products)
      .where(eq(products.id, id))
      .returning({ id: products.id });
    if (!deleted.length) return res.status(404).json({ error: 'Product not found.' });
    res.json({ deletedId: deleted[0].id });
  } catch (error) {
    console.error('Admin delete product failed:', error);
    res.status(500).json({ error: 'Failed to delete product.' });
  }
});
