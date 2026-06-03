import { createTool } from "@mastra/core/tools";
import { z } from "zod";

const CompetitorSchema = z.object({
  name: z.string(),
  developer: z.string(),
  iconUrl: z.string(),
  rating: z.number(),
  ratingCount: z.number(),
  url: z.string(),
  category: z.string(),
});

interface ItunesSearchResult {
  trackName: string;
  sellerName: string;
  artworkUrl512: string;
  artworkUrl100: string;
  primaryGenreName: string;
  averageUserRating?: number;
  userRatingCount?: number;
  trackViewUrl: string;
}

function extractSearchKeyword(appName: string, category: string): string {
  // Use descriptive suffix after ":" or "–"/"—" (e.g. "Duolingo: Language Lessons" → "language lessons")
  const match = appName.match(/[:–—]\s*(.+)$/);
  if (match) return match[1].trim().toLowerCase();
  return `${category.toLowerCase()} app`;
}

function normalizeArtworkUrl(url?: string): string {
  return (url ?? "").trim().replace(/^http:\/\//i, "https://");
}

export async function executeFetchCompetitors({
  appName,
  category,
  country,
}: {
  appName: string;
  category: string;
  country: string;
}) {
  const keyword = extractSearchKeyword(appName, category);
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(keyword)}&country=${country}&entity=software&limit=10`;

  let results: ItunesSearchResult[] = [];
  try {
    const res = await fetch(url, { headers: { "User-Agent": "ASO-Audit-Agent/1.0" } });
    if (res.ok) {
      const data = await res.json() as { resultCount: number; results: ItunesSearchResult[] };
      results = data.results ?? [];
    }
  } catch {
    // iTunes unavailable — return empty
  }

  const competitors = results
    .filter((r) => r.trackName.toLowerCase() !== appName.toLowerCase())
    .slice(0, 3)
    .map((r) => ({
      name: r.trackName,
      developer: r.sellerName,
      iconUrl: normalizeArtworkUrl(r.artworkUrl512 || r.artworkUrl100),
      rating: r.averageUserRating ?? 0,
      ratingCount: Math.min(r.userRatingCount ?? 0, 500_000_000),
      url: r.trackViewUrl,
      category: r.primaryGenreName,
    }));

  return { competitors };
}

export const fetchCompetitorsTool = createTool({
  id: "fetchCompetitors",
  description:
    "Finds and fetches data for the top 3 competitor apps in the same category. Call this after the user confirms the app they want audited.",
  inputSchema: z.object({
    appName: z.string().describe("Name of the app being audited"),
    category: z.string().describe('App category e.g. "Music"'),
    country: z.string().describe('Two-letter country code e.g. "us"'),
  }),
  outputSchema: z.object({
    competitors: z.array(CompetitorSchema),
  }),
  execute: async ({ appName, category, country }) =>
    executeFetchCompetitors({ appName, category, country }),
});
