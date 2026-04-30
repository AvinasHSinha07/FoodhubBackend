import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '../../lib/prisma';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const MODEL_FALLBACKS = ['gemini-2.5-flash', 'gemini-2.0-flash-lite', 'gemini-flash-latest'];

const generateWithFallback = async (prompt: string): Promise<string> => {
  let lastError: unknown;
  for (const modelName of MODEL_FALLBACKS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (err: unknown) {
      const httpErr = err as { status?: number };
      if (httpErr?.status === 429 || httpErr?.status === 503 || httpErr?.status === 404) {
        lastError = err;
        continue;
      }
      throw err;
    }
  }
  throw lastError;
};

export const getSearchSuggestions = async (query: string): Promise<string[]> => {
  if (!query || query.trim().length < 2) return [];

  try {
    // Fetch real meal titles + category names from the DB
    const [meals, categories] = await Promise.all([
      prisma.meal.findMany({
        where: { isAvailable: true },
        select: { title: true, dietaryTag: true, category: { select: { name: true } } },
        take: 100,
      }),
      prisma.category.findMany({ select: { name: true } }),
    ]);

    const mealTitles = meals.map((m) => m.title);
    const mealDietTags = [...new Set(meals.map((m) => m.dietaryTag).filter(Boolean))];
    const categoryNames = categories.map((c) => c.name);

    const prompt = `You are a search autocomplete engine for FoodHub, a food delivery app.

The user has typed: "${query.trim()}"

Real meal titles in the database: ${mealTitles.join(', ')}
Available categories: ${categoryNames.join(', ')}
Dietary tags available: ${mealDietTags.join(', ')}

Generate exactly 5 smart search suggestions based on what the user typed.
Rules:
- Prioritize exact matches and partial matches from the real meal titles
- Add 1-2 creative but relevant suggestions (related cuisine, dietary option, or category)
- Keep each suggestion short (1-5 words)
- Do NOT include the same suggestion twice
- Return ONLY a raw JSON array of strings, nothing else. Example: ["Chicken Burger","Spicy Wings","Vegan Bowl","Thai Cuisine","Healthy Salad"]`;

    const rawText = await generateWithFallback(prompt);

    // Safely parse the JSON array from the response
    const match = rawText.match(/\[.*?\]/s);
    if (!match) return [];

    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return [];

    return parsed.slice(0, 5).filter((s) => typeof s === 'string' && s.trim().length > 0);
  } catch (error) {
    console.error('[SearchSuggestions] Error:', error);
    return [];
  }
};
