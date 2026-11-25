import { eq } from 'drizzle-orm';
import { db } from './index.ts';
import {
  FashionTwinProfile,
  StylePreferences,
  users,
} from './schema.ts';

const DEFAULT_PREFERENCES: StylePreferences = {
  preferredStyles: ['Minimalist', 'Fusion'],
  favoriteColors: ['Ivory', 'Olive', 'Charcoal'],
  clothingPreferences: ['Breathable cotton', 'Tailored silhouettes'],
  preferredPlatforms: ['Myntra', 'Flipkart', 'Meesho'],
  budgetMin: 800,
  budgetMax: 5000,
  preferredBrands: ['Fabindia', 'W', 'Zara', 'H&M'],
  commonOccasions: ['Work', 'Casual', 'Festive'],
  fitPreference: 'Regular',
  sizes: {
    top: 'M',
    bottom: '30',
    footwear: 'UK 7',
  },
};

const DEFAULT_TWIN: FashionTwinProfile = {
  learnedColors: ['Ivory', 'Olive', 'Muted Rose'],
  preferredCategories: ['Kurtis', 'Trousers', 'Footwear'],
  approvedTags: ['Minimalist', 'Contemporary Ethnic'],
  dislikedTags: [],
  feedbackCount: 0,
  styleSummary: 'Refined everyday silhouettes balanced with modern festive accents.',
};

export async function getOrCreateUser(
  uid: string,
  email: string,
  displayName?: string | null,
  avatarUrl?: string | null,
) {
  try {
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.uid, uid))
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db
        .update(users)
        .set({
          email,
          displayName: displayName ?? existing[0].displayName,
          avatarUrl: avatarUrl ?? existing[0].avatarUrl,
          updatedAt: new Date(),
        })
        .where(eq(users.uid, uid))
        .returning();
      return updated;
    }

    const allUsers = await db.select({ id: users.id }).from(users).limit(1);
    const isInitialAdmin =
      allUsers.length === 0 || email.toLowerCase() === 'sharnikajayakumar69@gmail.com';

    const [created] = await db
      .insert(users)
      .values({
        uid,
        email,
        displayName: displayName || email.split('@')[0],
        avatarUrl: avatarUrl || null,
        role: isInitialAdmin ? 'admin' : 'user',
        onboardingCompleted: false,
        stylePreferences: DEFAULT_PREFERENCES,
        fashionTwinProfile: DEFAULT_TWIN,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          updatedAt: new Date(),
        },
      })
      .returning();

    return created;
  } catch (error) {
    console.error('Database user upsert failed:', error);
    throw new Error('Failed to synchronize user profile.', { cause: error });
  }
}

export async function getUserByUid(uid: string) {
  try {
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.uid, uid))
      .limit(1);
    return rows[0] ?? null;
  } catch (error) {
    console.error('Database user lookup failed:', error);
    throw new Error('Failed to load user profile.', { cause: error });
  }
}
