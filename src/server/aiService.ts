import { GoogleGenAI, Type } from '@google/genai';
import { StylePreferences } from '../db/schema.ts';

const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_IMAGE_BYTES = 6 * 1024 * 1024; // 6 MB decoded

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Add your Gemini API key in Settings > Secrets.',
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export function validateBase64Image(dataUrlOrBase64: string, fallbackMime = 'image/jpeg') {
  if (!dataUrlOrBase64 || typeof dataUrlOrBase64 !== 'string') {
    throw new Error('Image payload is missing.');
  }
  let mimeType = fallbackMime;
  let base64Data = dataUrlOrBase64;

  const match = dataUrlOrBase64.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (match) {
    mimeType = match[1].toLowerCase();
    base64Data = match[2];
  }

  if (!ALLOWED_IMAGE_MIMES.has(mimeType)) {
    throw new Error('Unsupported image format. Please upload JPEG, PNG, or WebP.');
  }

  const estimatedBytes = Math.floor((base64Data.length * 3) / 4);
  if (estimatedBytes > MAX_IMAGE_BYTES) {
    throw new Error('Image size exceeds the 6 MB limit.');
  }

  return { mimeType, base64Data };
}

async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const status = err?.status || err?.code;
      if (status === 400 || status === 401 || status === 403 || status === 404) {
        throw err;
      }
      if (i < retries) {
        await new Promise((r) => setTimeout(r, 600 * Math.pow(2, i)));
      }
    }
  }
  throw lastError;
}

export async function analyzePersonalStyle(
  imageInput: string,
  userNotes?: string,
) {
  const { mimeType, base64Data } = validateBase64Image(imageInput);
  const ai = getClient();

  const prompt = `Analyze this user's photograph as a supportive, body-positive luxury fashion stylist.
IMPORTANT GUIDELINES:
- Treat skin tone, undertone, and visible body proportions strictly as approximate visual guidance, never as definitive measurements.
- Never make negative judgments about appearance or suggest any body type cannot wear particular clothing.
- Recommend flattering silhouettes, harmonious color palettes with hex codes, style aesthetics, and outfit combinations.
${userNotes ? `User context: ${userNotes}` : ''}`;

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            skinTone: { type: Type.STRING },
            undertone: { type: Type.STRING },
            complementaryColors: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            colorPalette: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  hex: { type: Type.STRING },
                  usage: { type: Type.STRING },
                },
                required: ['name', 'hex', 'usage'],
              },
            },
            bodyProportions: {
              type: Type.OBJECT,
              properties: {
                summary: { type: Type.STRING },
                silhouettes: { type: Type.ARRAY, items: { type: Type.STRING } },
                stylingTips: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ['summary', 'silhouettes', 'stylingTips'],
            },
            personalStyles: { type: Type.ARRAY, items: { type: Type.STRING } },
            stylingSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: [
            'skinTone',
            'undertone',
            'complementaryColors',
            'colorPalette',
            'bodyProportions',
            'personalStyles',
            'stylingSuggestions',
          ],
        },
      },
    }),
  );

  return JSON.parse((response.text ?? '{}').trim());
}

export async function generateStylistOutfit(
  userQuery: string,
  prefs: StylePreferences | null,
  wardrobeSummary: Array<{ id: number; name: string; category: string; color: string }>,
  catalogSummary: Array<{ id: number; name: string; category: string; color: string; price: number; platform: string; url: string; imageUrl: string }>,
  weatherContext?: string,
) {
  const ai = getClient();

  const systemPrompt = `You are StyleSync AI, an editorial personal fashion stylist.
Generate a complete, cohesive outfit in INR (₹) tailored to the user's request, occasion, budget, weather, and preferences.
Include complete slots where appropriate: Top or Kurti, Bottom Wear, Dupatta or Layering, Footwear, Jewellery, Handbag, Accessories, and Hairstyle Suggestion.
Match existing wardrobe items when suitable (mark isOwned: true and price: 0) or match available catalog items with their real prices and URLs. Never exceed the user's stated budget unless explicitly noted in stylingNotes.`;

  const contextPayload = JSON.stringify({
    request: userQuery,
    preferences: prefs,
    weather: weatherContext || 'Mild ambient',
    wardrobe: wardrobeSummary.slice(0, 20),
    catalog: catalogSummary.slice(0, 12),
  });

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Create a personalized outfit curation for this request and context:\n${contextPayload}`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            occasion: { type: Type.STRING },
            detectedBudget: { type: Type.INTEGER },
            totalCost: { type: Type.INTEGER },
            stylingNotes: { type: Type.STRING },
            hairstyleSuggestion: { type: Type.STRING },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  slot: { type: Type.STRING },
                  name: { type: Type.STRING },
                  color: { type: Type.STRING },
                  price: { type: Type.INTEGER },
                  platform: { type: Type.STRING },
                  productUrl: { type: Type.STRING },
                  imageUrl: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                  isOwned: { type: Type.BOOLEAN },
                },
                required: ['slot', 'name', 'color', 'price', 'explanation', 'isOwned'],
              },
            },
          },
          required: ['title', 'occasion', 'totalCost', 'stylingNotes', 'hairstyleSuggestion', 'items'],
        },
      },
    }),
  );

  return JSON.parse((response.text ?? '{}').trim());
}

export async function regenerateOutfitSlot(
  currentOutfit: any,
  slotToReplace: string,
  instruction: string,
  prefs: StylePreferences | null,
) {
  const ai = getClient();

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Current outfit: ${JSON.stringify(currentOutfit)}
User preferences: ${JSON.stringify(prefs)}
Replace ONLY the "${slotToReplace}" slot following this instruction: "${instruction || 'Suggest a stylish alternative that harmonizes with the rest of the outfit'}".`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            slot: { type: Type.STRING },
            name: { type: Type.STRING },
            color: { type: Type.STRING },
            price: { type: Type.INTEGER },
            platform: { type: Type.STRING },
            productUrl: { type: Type.STRING },
            explanation: { type: Type.STRING },
            isOwned: { type: Type.BOOLEAN },
          },
          required: ['slot', 'name', 'color', 'price', 'explanation', 'isOwned'],
        },
      },
    }),
  );

  return JSON.parse((response.text ?? '{}').trim());
}

export async function decodeInspirationAndRecreate(
  imageInput: string,
  wardrobeSummary: Array<{ id: number; name: string; category: string; color: string; style?: string | null }>,
  catalogSummary: Array<{ id: number; name: string; category: string; color: string; price: number; platform: string; url: string }>,
) {
  const { mimeType, base64Data } = validateBase64Image(imageInput);
  const ai = getClient();

  const prompt = `Analyze this fashion inspiration photograph.
1. Identify clothing categories, dominant colors, accessories, and overall styling aesthetic.
2. Extract each outfit component.
3. Compare against the user's digital wardrobe to mark items already owned or closely similar (reuseStatus: "owned" | "similar" | "missing").
4. Recommend only the missing or affordable alternative items from the catalog or curated options to minimize unnecessary shopping.
User wardrobe: ${JSON.stringify(wardrobeSummary.slice(0, 25))}
Catalog items: ${JSON.stringify(catalogSummary.slice(0, 12))}`;

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallAesthetic: { type: Type.STRING },
            dominantColors: { type: Type.ARRAY, items: { type: Type.STRING } },
            stylingBreakdown: { type: Type.STRING },
            components: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  slot: { type: Type.STRING },
                  detectedItem: { type: Type.STRING },
                  color: { type: Type.STRING },
                  reuseStatus: { type: Type.STRING },
                  matchedWardrobeItem: { type: Type.STRING },
                  affordableAlternative: { type: Type.STRING },
                  estimatedPrice: { type: Type.INTEGER },
                  platform: { type: Type.STRING },
                  productUrl: { type: Type.STRING },
                },
                required: ['slot', 'detectedItem', 'color', 'reuseStatus', 'affordableAlternative', 'estimatedPrice'],
              },
            },
            reuseSavingsNote: { type: Type.STRING },
          },
          required: ['overallAesthetic', 'dominantColors', 'stylingBreakdown', 'components', 'reuseSavingsNote'],
        },
      },
    }),
  );

  return JSON.parse((response.text ?? '{}').trim());
}

export async function matchExistingGarment(
  imageInput: string,
  wardrobeSummary: Array<{ id: number; name: string; category: string; color: string }>,
  catalogSummary: Array<{ id: number; name: string; category: string; color: string; price: number; platform: string; url: string }>,
) {
  const { mimeType, base64Data } = validateBase64Image(imageInput);
  const ai = getClient();

  const prompt = `Inspect this clothing item photo. Identify its clothing category, dominant color, pattern, and style.
Then generate 3 distinct complete matching outfit combinations built around this item (e.g. casual, smart-casual/work, elevated evening), specifying matching tops/bottoms, footwear, jewellery, bags, watches, and accessories, referencing owned wardrobe pieces when possible.
User wardrobe: ${JSON.stringify(wardrobeSummary.slice(0, 20))}
Catalog: ${JSON.stringify(catalogSummary.slice(0, 12))}`;

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedGarment: {
              type: Type.OBJECT,
              properties: {
                category: { type: Type.STRING },
                dominantColor: { type: Type.STRING },
                pattern: { type: Type.STRING },
                style: { type: Type.STRING },
              },
              required: ['category', 'dominantColor', 'pattern', 'style'],
            },
            combinations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  vibe: { type: Type.STRING },
                  totalAddOnCost: { type: Type.INTEGER },
                  items: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        slot: { type: Type.STRING },
                        name: { type: Type.STRING },
                        color: { type: Type.STRING },
                        price: { type: Type.INTEGER },
                        isOwned: { type: Type.BOOLEAN },
                        platform: { type: Type.STRING },
                        productUrl: { type: Type.STRING },
                      },
                      required: ['slot', 'name', 'color', 'price', 'isOwned'],
                    },
                  },
                  stylingNote: { type: Type.STRING },
                },
                required: ['title', 'vibe', 'totalAddOnCost', 'items', 'stylingNote'],
              },
            },
          },
          required: ['detectedGarment', 'combinations'],
        },
      },
    }),
  );

  return JSON.parse((response.text ?? '{}').trim());
}

export async function generateBudgetTiers(params: {
  occasion: string;
  budget: number;
  stylePref: string;
  category: string;
  preferredColors: string[];
  catalogSummary: Array<{ id: number; name: string; category: string; color: string; price: number; platform: string; url: string }>;
}) {
  const ai = getClient();

  const prompt = `Generate 3 complete outfit tiers for:
Occasion: ${params.occasion}
Target Maximum Budget: ₹${params.budget}
Fashion Preference: ${params.stylePref}
Focus Category: ${params.category}
Preferred Colors: ${params.preferredColors.join(', ')}
Catalog reference: ${JSON.stringify(params.catalogSummary.slice(0, 12))}

Create:
1. "Budget Look" (comfortably below ₹${params.budget})
2. "Balanced Look" (close to ₹${params.budget} with best value-per-quality)
3. "Premium Look" (either maximized within ₹${params.budget} or explicitly flagged exceedsBudget: true as an aspirational alternative).`;

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tiers: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  tierName: { type: Type.STRING },
                  title: { type: Type.STRING },
                  totalCost: { type: Type.INTEGER },
                  exceedsBudget: { type: Type.BOOLEAN },
                  rationale: { type: Type.STRING },
                  items: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        slot: { type: Type.STRING },
                        name: { type: Type.STRING },
                        color: { type: Type.STRING },
                        price: { type: Type.INTEGER },
                        platform: { type: Type.STRING },
                        productUrl: { type: Type.STRING },
                      },
                      required: ['slot', 'name', 'color', 'price', 'platform'],
                    },
                  },
                },
                required: ['tierName', 'title', 'totalCost', 'exceedsBudget', 'rationale', 'items'],
              },
            },
          },
          required: ['tiers'],
        },
      },
    }),
  );

  return JSON.parse((response.text ?? '{}').trim());
}

export async function predictSmartSize(input: {
  heightCm?: number;
  chestCm?: number;
  waistCm?: number;
  hipCm?: number;
  fitPreference: string;
  existingSize: string;
  brand: string;
  category: string;
}) {
  const ai = getClient();

  const prompt = `Predict the best clothing size for this user profile:
${JSON.stringify(input)}
Provide a recommended size (e.g. XS, S, M, L, XL, or waist number), confidence note, fit explanation across shoulders/waist/length, and a clear reminder that sizing is an estimate and brand cuts vary.`;

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendedSize: { type: Type.STRING },
            alternativeSize: { type: Type.STRING },
            fitExplanation: { type: Type.STRING },
            brandSizingNote: { type: Type.STRING },
            measurementBreakdown: { type: Type.ARRAY, items: { type: Type.STRING } },
            disclaimer: { type: Type.STRING },
          },
          required: [
            'recommendedSize',
            'alternativeSize',
            'fitExplanation',
            'brandSizingNote',
            'measurementBreakdown',
            'disclaimer',
          ],
        },
      },
    }),
  );

  return JSON.parse((response.text ?? '{}').trim());
}

export async function generateTravelOutfitPlan(input: {
  destination: string;
  startDate: string;
  durationDays: number;
  activities: string[];
  weatherPref: string;
  wardrobeSummary: Array<{ name: string; category: string; color: string }>;
}) {
  const ai = getClient();

  const prompt = `Create a capsule travel wardrobe plan for:
Destination: ${input.destination}
Start Date: ${input.startDate}
Duration: ${Math.min(10, Math.max(1, input.durationDays))} days
Activities: ${input.activities.join(', ')}
Weather: ${input.weatherPref}
Owned Wardrobe: ${JSON.stringify(input.wardrobeSummary.slice(0, 20))}

Maximize outfit re-wearing and capsule packing efficiency.`;

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            dailyOutfits: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  day: { type: Type.INTEGER },
                  title: { type: Type.STRING },
                  outfit: { type: Type.STRING },
                  footwear: { type: Type.STRING },
                  accessories: { type: Type.STRING },
                },
                required: ['day', 'title', 'outfit', 'footwear', 'accessories'],
              },
            },
            packingChecklist: { type: Type.ARRAY, items: { type: Type.STRING } },
            footwearRecs: { type: Type.ARRAY, items: { type: Type.STRING } },
            accessories: { type: Type.ARRAY, items: { type: Type.STRING } },
            travelTips: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['dailyOutfits', 'packingChecklist', 'footwearRecs', 'accessories', 'travelTips'],
        },
      },
    }),
  );

  return JSON.parse((response.text ?? '{}').trim());
}

export async function compareSavedOutfitsDecision(
  outfits: Array<{ id: number; title: string; occasion: string; totalCost: number; items: any[] }>,
  targetOccasion: string,
  prefs: StylePreferences | null,
) {
  const ai = getClient();

  const prompt = `Compare these saved outfits for the occasion "${targetOccasion}" and user preferences ${JSON.stringify(prefs)}:
${JSON.stringify(outfits)}
Pick the single strongest recommendation with clear styling, comfort, cost, and occasion reasoning, plus individual pros/tradeoffs for each outfit.`;

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            winnerOutfitId: { type: Type.INTEGER },
            winnerTitle: { type: Type.STRING },
            verdictSummary: { type: Type.STRING },
            comparisons: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  outfitId: { type: Type.INTEGER },
                  title: { type: Type.STRING },
                  suitabilitySummary: { type: Type.STRING },
                  strength: { type: Type.STRING },
                  tweakSuggestion: { type: Type.STRING },
                },
                required: ['outfitId', 'title', 'suitabilitySummary', 'strength', 'tweakSuggestion'],
              },
            },
          },
          required: ['winnerOutfitId', 'winnerTitle', 'verdictSummary', 'comparisons'],
        },
      },
    }),
  );

  return JSON.parse((response.text ?? '{}').trim());
}

export async function analyzeVirtualTryOn(
  personImageInput: string,
  product: { name: string; category: string; color: string; style: string; imageUrl: string },
) {
  const { mimeType, base64Data } = validateBase64Image(personImageInput);
  const ai = getClient();

  // First run real Gemini multimodal fit, drape & color harmony evaluation on the uploaded photograph
  const fitResponse = await withRetry(() =>
    ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          {
            text: `Evaluate how the garment "${product.name}" (${product.color}, ${product.category}, ${product.style} style) will pair with the person in this photograph.
Provide respectful, supportive styling guidance covering color harmony with their complexion, drape and silhouette notes, and recommended footwear/accessory pairings.`,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            colorHarmony: { type: Type.STRING },
            silhouetteFitNote: { type: Type.STRING },
            recommendedPairings: { type: Type.ARRAY, items: { type: Type.STRING } },
            overallVerdict: { type: Type.STRING },
          },
          required: ['colorHarmony', 'silhouetteFitNote', 'recommendedPairings', 'overallVerdict'],
        },
      },
    }),
  );

  const fitAnalysis = JSON.parse((fitResponse.text ?? '{}').trim());

  // Attempt image-generation virtual try-on only if a billing-enabled API key supports it;
  // gracefully inform the user if free-tier limits apply instead of faking a composite overlay.
  let generatedImage: string | null = null;
  let requiresPaidKey = false;
  let setupMessage: string | null = null;

  try {
    const imgResponse = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-image',
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          {
            text: `Photorealistic fashion virtual try-on: Dress the person in this photo in a ${product.color} ${product.name} (${product.category}, ${product.style} style), preserving their exact face, pose, skin tone, and background lighting naturally.`,
          },
        ],
      },
    });

    for (const part of imgResponse.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData?.data) {
        const outMime = part.inlineData.mimeType ?? 'image/png';
        generatedImage = `data:${outMime};base64,${part.inlineData.data}`;
        break;
      }
    }
    if (!generatedImage) {
      requiresPaidKey = true;
      setupMessage =
        'Photorealistic Virtual Try-On image rendering requires a billing-enabled Gemini API key in Settings > Secrets. Showing live Gemini fit & color analysis plus lookbook preview.';
    }
  } catch (err: any) {
    requiresPaidKey = true;
    setupMessage =
      'Photorealistic Virtual Try-On image rendering requires a billing-enabled Gemini API key in Settings > Secrets. Showing live Gemini fit & color analysis plus lookbook preview.';
    console.warn('Virtual Try-On image generation unavailable on current API key tier:', err?.message || err);
  }

  return {
    fitAnalysis,
    generatedImage,
    requiresPaidKey,
    setupMessage,
    demoLookbookImage: product.imageUrl,
  };
}

export type StylistChatMode = 'general' | 'fast' | 'complex' | 'deep';

const CHAT_MODEL_MAP: Record<StylistChatMode, { model: string; roleTitle: string }> = {
  general: {
    model: 'gemini-4-hydrogen',
    roleTitle: 'Personal Fashion Stylist',
  },
  fast: {
    model: 'gemini-3.1-flash-lite',
    roleTitle: 'Quick Outfit & Color Check Assistant',
  },
  complex: {
    model: 'gemini-4-neon',
    roleTitle: 'Interactive Capsule & Occasion Architect',
  },
  deep: {
    model: 'gemini-4-carbon',
    roleTitle: 'Deep Wardrobe & Fit Strategy Advisor',
  },
};

export interface ChatTurnMessage {
  role: 'user' | 'model';
  text: string;
}

export async function runStylistChat(params: {
  messages: ChatTurnMessage[];
  mode: StylistChatMode;
  prefs: StylePreferences | null;
  wardrobeSummary: Array<{ name: string; category: string; color: string }>;
}) {
  const ai = getClient();
  const selected = CHAT_MODEL_MAP[params.mode] || CHAT_MODEL_MAP.general;

  if (!params.messages || params.messages.length === 0) {
    throw new Error('At least one message is required.');
  }

  const latestMessage = params.messages[params.messages.length - 1];
  if (latestMessage.role !== 'user' || !latestMessage.text.trim()) {
    throw new Error('Please enter a message for your stylist.');
  }

  const priorHistory = params.messages.slice(0, -1).map((m) => ({
    role: m.role,
    parts: [{ text: m.text }],
  }));

  const systemInstruction = `You are StyleSync AI acting in the role of ${selected.roleTitle}.
Your tone is editorial, warm, practical, and body-positive.
Always remember: visual undertone and proportion readings are approximate stylistic estimates shaped by lighting and camera white balance—never definitive measurements. Encourage users to wear every silhouette they love while offering harmonious styling tips.
User style preferences: ${JSON.stringify(params.prefs || {})}
User's owned digital wardrobe highlights: ${JSON.stringify(params.wardrobeSummary.slice(0, 20))}
Give concrete, actionable fashion recommendations (in INR ₹ when discussing budgets), prioritizing wardrobe reuse alongside thoughtful additions.`;

  try {
    const chat = ai.chats.create({
      model: selected.model,
      config: {
        systemInstruction,
      },
      history: priorHistory,
    });

    const response = await withRetry(() =>
      chat.sendMessage({
        message: latestMessage.text.trim(),
      }),
    );

    return {
      reply: response.text || 'I could not generate a response for that styling question.',
      model: selected.model,
      roleTitle: selected.roleTitle,
    };
  } catch (err: any) {
    const status = err?.status || err?.code;
    if (status === 403 || status === 429) {
      throw Object.assign(
        new Error(
          `The ${selected.model} model requires a billing-enabled Gemini API key in Settings > Secrets, or switch to Everyday Stylist (gemini-4-hydrogen) / Quick Check (gemini-3.1-flash-lite).`,
        ),
        { status },
      );
    }
    throw err;
  }
}

export async function animateFashionPhotoToVideo(params: {
  imageInput: string;
  prompt: string;
  aspectRatio: '16:9' | '9:16';
}) {
  const { mimeType, base64Data } = validateBase64Image(params.imageInput);
  const ai = getClient();

  const aspectRatio = params.aspectRatio === '9:16' ? '9:16' : '16:9';
  const motionPrompt =
    params.prompt.trim() ||
    'Subtle luxury fashion campaign motion: soft natural breeze gently ripples the fabric drape while warm atelier sunlight shifts smoothly.';

  try {
    const interaction = await ai.interactions.create(
      {
        model: 'gemini-omni-1.2-flash',
        input: [
          {
            type: 'image',
            mime_type: mimeType,
            data: base64Data,
          },
          {
            type: 'text',
            text: motionPrompt,
          },
        ],
        background: false,
        store: false,
        stream: false,
        response_format: {
          type: 'video',
          aspect_ratio: aspectRatio,
        },
      },
      { timeout: 300000 },
    );

    const videoPart = interaction.output_video;
    if (videoPart?.data) {
      const outMime = videoPart.mime_type || 'video/mp4';
      return {
        videoUrl: `data:${outMime};base64,${videoPart.data}`,
        mimeType: outMime,
        aspectRatio,
      };
    }

    if (videoPart?.uri) {
      return {
        videoUrl: videoPart.uri,
        mimeType: videoPart.mime_type || 'video/mp4',
        aspectRatio,
      };
    }

    throw new Error('Video generation completed without a playable video output.');
  } catch (err: any) {
    const status = err?.status || err?.code;
    if (status === 403 || status === 429) {
      throw Object.assign(
        new Error(
          'Video animation with gemini-omni-1.2-flash requires a billing-enabled Gemini API key in Settings > Secrets.',
        ),
        { status },
      );
    }
    throw err;
  }
}

