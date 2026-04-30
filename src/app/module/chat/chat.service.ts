import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '../../lib/prisma';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export type TChatMessage = {
  role: 'user' | 'model';
  parts: string;
};

// ── Fetch real-time data from the database ─────────────────────────────────────
const fetchSiteContext = async (): Promise<string> => {
  try {
    const [meals, providers, categories, stats] = await Promise.all([
      // Available meals with category + restaurant name
      prisma.meal.findMany({
        where: { isAvailable: true },
        select: {
          id: true,
          title: true,
          description: true,
          price: true,
          dietaryTag: true,
          category: { select: { name: true } },
          provider: { select: { restaurantName: true, address: true, cuisineType: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 80, // limit to avoid token overflow
      }),

      // Active restaurants/providers
      prisma.providerProfile.findMany({
        select: {
          id: true,
          restaurantName: true,
          description: true,
          address: true,
          cuisineType: true,
          preparationTimeMinutes: true,
          _count: { select: { meals: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),

      // All categories
      prisma.category.findMany({
        select: {
          name: true,
          _count: { select: { meals: true } },
        },
        orderBy: { name: 'asc' },
      }),

      // Platform stats
      prisma.$transaction([
        prisma.user.count(),
        prisma.meal.count({ where: { isAvailable: true } }),
        prisma.order.count(),
        prisma.providerProfile.count(),
      ]),
    ]);

    const [totalUsers, totalMeals, totalOrders, totalProviders] = stats;

    // Format meals compactly
    const mealsContext = meals
      .map(
        (m) =>
          `• ${m.title} — $${Number(m.price).toFixed(2)} | Category: ${m.category.name}${m.dietaryTag ? ` | Tag: ${m.dietaryTag}` : ''} | Restaurant: ${m.provider.restaurantName}${m.description ? ` | "${m.description.slice(0, 80)}"` : ''}`
      )
      .join('\n');

    // Format restaurants compactly
    const restaurantsContext = providers
      .map(
        (p) =>
          `• ${p.restaurantName}${p.cuisineType ? ` (${p.cuisineType})` : ''} | Address: ${p.address} | Prep time: ~${p.preparationTimeMinutes}min | Meals: ${p._count.meals}${p.description ? ` | "${p.description.slice(0, 80)}"` : ''}`
      )
      .join('\n');

    // Format categories
    const categoriesContext = categories
      .map((c) => `• ${c.name} (${c._count.meals} meals)`)
      .join('\n');

    return `
=== FOODHUB LIVE DATA (fetched right now from the database) ===

PLATFORM STATS:
- Total registered users: ${totalUsers}
- Available meals: ${totalMeals}
- Total orders placed: ${totalOrders}
- Active restaurants/providers: ${totalProviders}

FOOD CATEGORIES:
${categoriesContext}

AVAILABLE MEALS (showing up to 80):
${mealsContext}

RESTAURANTS / PROVIDERS:
${restaurantsContext}

=== END OF LIVE DATA ===
`;
  } catch (error) {
    console.error('[FoodBot] Failed to fetch site context:', error);
    return '(Live data temporarily unavailable — answer based on general FoodHub knowledge)';
  }
};

// ── Build the system prompt with live data ─────────────────────────────────────
const buildSystemPrompt = async (): Promise<string> => {
  const liveData = await fetchSiteContext();

  return `You are FoodBot, a helpful and friendly AI assistant for FoodHub — a premium food delivery platform.

You have access to REAL, LIVE data from the FoodHub database (provided below). Use this data to give accurate, specific answers. When a user asks about meals, restaurants, prices, or categories, reference the actual data.

INSTRUCTIONS:
- Answer questions using the live data below — be specific with meal names, prices, and restaurant names
- If a user asks for recommendations, suggest real meals from the data
- If a user asks about dietary options (vegan, gluten-free, spicy, etc.) — filter from the real data
- Keep responses concise but informative (3-5 sentences or a short list)
- Be warm, enthusiastic, and food-passionate 🍽️
- For order tracking, account questions, or anything requiring login — tell them to check their dashboard
- Use emojis sparingly

${liveData}`;
};

// Models to try in priority order
const MODEL_FALLBACKS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash-lite',
  'gemini-flash-latest',
];

// ── Main chat function ─────────────────────────────────────────────────────────
export const getChatResponse = async (
  userMessage: string,
  history: TChatMessage[]
): Promise<string> => {
  // Build system prompt with fresh live data on every request
  const systemPrompt = await buildSystemPrompt();

  const contents = [
    {
      role: 'user' as const,
      parts: [{ text: systemPrompt }],
    },
    {
      role: 'model' as const,
      parts: [{ text: "Got it! I have the live FoodHub data loaded and I'm ready to help with specific meal recommendations, restaurant info, and more! 🍽️" }],
    },
    // Previous conversation turns
    ...history.map((msg) => ({
      role: msg.role as 'user' | 'model',
      parts: [{ text: msg.parts }],
    })),
    // Current user message
    {
      role: 'user' as const,
      parts: [{ text: userMessage }],
    },
  ];

  let lastError: unknown;

  // Try each model in order until one works
  for (const modelName of MODEL_FALLBACKS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent({
        contents,
        generationConfig: {
          maxOutputTokens: 600,
          temperature: 0.6,
        },
      });
      return result.response.text();
    } catch (err: unknown) {
      const httpErr = err as { status?: number };
      // Only fallback on rate-limit or server errors, not auth errors
      if (httpErr?.status === 429 || httpErr?.status === 503 || httpErr?.status === 404) {
        console.warn(`[FoodBot] Model ${modelName} failed (${httpErr.status}), trying next...`);
        lastError = err;
        continue;
      }
      throw err; // Rethrow non-retryable errors
    }
  }

  throw lastError;
};

