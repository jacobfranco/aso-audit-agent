import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";

export const CompetitorSchema = z.object({
  name: z.string(),
  developer: z.string(),
  iconUrl: z.string(),
  rating: z.number(),
  ratingCount: z.number(),
  url: z.string(),
  category: z.string(),
});

export type Competitor = z.infer<typeof CompetitorSchema>;

interface ItunesSearchResult {
  trackId: number;
  trackName: string;
  sellerName: string;
  artworkUrl512: string;
  artworkUrl100: string;
  primaryGenreName: string;
  averageUserRating?: number;
  userRatingCount?: number;
  trackViewUrl: string;
}

function normalizeArtworkUrl(url?: string): string {
  return (url ?? "").trim().replace(/^http:\/\//i, "https://");
}

// Step 1: Search iTunes for competitor apps by category keyword
const searchCompetitorsStep = createStep({
  id: "searchCompetitors",
  inputSchema: z.object({
    keyword: z.string(),
    country: z.string(),
    excludeAppName: z.string(),
  }),
  outputSchema: z.object({
    competitors: z.array(CompetitorSchema),
  }),
  execute: async ({ inputData }) => {
    const { keyword, country, excludeAppName } = inputData;

    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(keyword)}&country=${country}&entity=software&limit=10`;

    let data: { resultCount: number; results: ItunesSearchResult[] };
    try {
      const res = await fetch(url, { headers: { "User-Agent": "ASO-Audit-Agent/1.0" } });
      if (!res.ok) return { competitors: [] };
      data = await res.json() as typeof data;
    } catch {
      return { competitors: [] };
    }

    if (!data.resultCount || data.results.length === 0) return { competitors: [] };

    const competitors: Competitor[] = data.results
      .filter((r) => r.trackName.toLowerCase() !== excludeAppName.toLowerCase())
      .slice(0, 3)
      .map((r) => ({
        name: r.trackName,
        developer: r.sellerName,
        iconUrl: normalizeArtworkUrl(r.artworkUrl512 || r.artworkUrl100),
        rating: r.averageUserRating ?? 0,
        ratingCount: r.userRatingCount ?? 0,
        url: r.trackViewUrl,
        category: r.primaryGenreName,
      }));

    return { competitors };
  },
});

// Step 2: Validate and normalise the competitor list
const normaliseCompetitorsStep = createStep({
  id: "normaliseCompetitors",
  inputSchema: z.object({
    competitors: z.array(CompetitorSchema),
  }),
  outputSchema: z.object({
    competitors: z.array(CompetitorSchema),
  }),
  execute: async ({ inputData }) => {
    const competitors = inputData.competitors.map((c) => ({
      ...c,
      // Ensure iconUrl is never an empty string
      iconUrl: normalizeArtworkUrl(c.iconUrl),
      // Cap absurdly high rating counts (data anomalies from iTunes)
      ratingCount: Math.min(c.ratingCount, 500_000_000),
    }));
    return { competitors };
  },
});

export const competitorWorkflow = createWorkflow({
  id: "competitorFetch",
  inputSchema: z.object({
    keyword: z.string(),
    country: z.string(),
    excludeAppName: z.string(),
  }),
  outputSchema: z.object({
    competitors: z.array(CompetitorSchema),
  }),
})
  .then(searchCompetitorsStep)
  .then(normaliseCompetitorsStep)
  .commit();
