import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import Firecrawl from "@mendable/firecrawl-js";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";

const firecrawl = new Firecrawl({ apiKey: process.env.FIRECRAWL_API_KEY });

export const AppMetadataSchema = z.object({
  appId: z.string().describe("App ID extracted from URL"),
  name: z.string().describe("App name"),
  developer: z.string().describe("Developer/publisher name"),
  iconUrl: z.string().describe("App icon image URL"),
  category: z.string().describe("Primary app category"),
  country: z.string().describe("Two-letter country code from URL (e.g. us)"),
  rating: z.number().describe("Average star rating 0–5"),
  ratingCount: z.number().describe("Total number of ratings as integer"),
  description: z.string().describe("Full app description text"),
  subtitle: z.string().optional().describe("Short subtitle below the title"),
  price: z.string().describe('Price string e.g. "Free" or "$4.99"'),
  screenshotUrls: z.array(z.string()).describe("Screenshot image URLs found on page"),
  hasPreviewVideo: z.boolean().describe("Whether an app preview video exists"),
  whatsNew: z.string().optional().describe("What's New / release notes text"),
  promotionalText: z.string().optional().describe("Promotional text above description"),
  url: z.string().describe("Original App Store URL"),
});

export type AppMetadata = z.infer<typeof AppMetadataSchema>;

// iTunes Search API lookup — Apple's own public API, no auth required
interface ItunesApp {
  trackId: number;
  trackName: string;
  sellerName: string;
  artworkUrl512: string;
  artworkUrl100: string;
  primaryGenreName: string;
  averageUserRating?: number;
  userRatingCount?: number;
  description?: string;
  screenshotUrls?: string[];
  ipadScreenshotUrls?: string[];
  price?: number;
  formattedPrice?: string;
  releaseNotes?: string;
  previewUrl?: string;
  appletvScreenshotUrls?: string[];
}

async function fetchFromItunes(appId: string, country: string): Promise<ItunesApp> {
  const url = `https://itunes.apple.com/lookup?id=${appId}&country=${country}&entity=software&lang=en-us`;
  const res = await fetch(url, { headers: { "User-Agent": "ASO-Audit-Agent/1.0" } });
  if (!res.ok) throw new Error(`iTunes API returned ${res.status}`);
  const data = await res.json() as { resultCount: number; results: ItunesApp[] };
  if (!data.resultCount || data.results.length === 0) {
    throw new Error(`App ID ${appId} not found in iTunes Search API (country: ${country})`);
  }
  return data.results[0];
}

function normalizeArtworkUrl(url?: string): string {
  return (url ?? "").trim().replace(/^http:\/\//i, "https://");
}

// Firecrawl enrichment for fields iTunes doesn't expose (subtitle, promotional text).
// Non-critical — failures are silently ignored.
async function enrichFromFirecrawl(
  url: string
): Promise<{ subtitle?: string; promotionalText?: string }> {
  try {
    const scraped = await firecrawl.scrape(url, { formats: ["markdown"] });
    if (!scraped.markdown) return {};

    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: z.object({
        subtitle: z.string().optional().describe("Short tagline directly under the app name"),
        promotionalText: z.string().optional().describe("Promotional text above the description"),
      }),
      prompt: `Extract the subtitle and promotional text from this Apple App Store page if present.

Page content:
${scraped.markdown.slice(0, 4000)}

Return undefined for fields that are absent.`,
    });

    return object;
  } catch {
    return {};
  }
}

export async function executeFetchAppDetails({ url }: { url: string }): Promise<AppMetadata> {
  const urlMatch = url.match(/apps\.apple\.com\/([a-z]{2})\/app\/[^/]+\/id(\d+)/i);
  const country = urlMatch?.[1] ?? "us";
  const appId = urlMatch?.[2] ?? "";

  if (!appId) throw new Error("Could not extract app ID from URL — is this a valid App Store link?");

  const [itunes, extra] = await Promise.all([
    fetchFromItunes(appId, country),
    enrichFromFirecrawl(url),
  ]);

  const screenshots = [
    ...(itunes.screenshotUrls ?? []),
    ...(itunes.ipadScreenshotUrls ?? []),
  ];

  return {
    appId,
    name: itunes.trackName,
    developer: itunes.sellerName,
    iconUrl: normalizeArtworkUrl(itunes.artworkUrl512 || itunes.artworkUrl100),
    category: itunes.primaryGenreName,
    country,
    rating: itunes.averageUserRating ?? 0,
    ratingCount: itunes.userRatingCount ?? 0,
    description: itunes.description ?? "",
    subtitle: extra.subtitle,
    price: itunes.formattedPrice ?? (itunes.price === 0 ? "Free" : `$${itunes.price}`),
    screenshotUrls: screenshots,
    hasPreviewVideo: !!itunes.previewUrl,
    whatsNew: itunes.releaseNotes,
    promotionalText: extra.promotionalText,
    url,
  };
}

export const fetchAppDetailsTool = createTool({
  id: "fetchAppDetails",
  description:
    "Fetches detailed metadata for an Apple App Store app from its URL. Call this IMMEDIATELY when the user pastes any apps.apple.com URL.",
  inputSchema: z.object({
    url: z.string().describe("The Apple App Store URL"),
  }),
  outputSchema: AppMetadataSchema,
  execute: async ({ url }) => executeFetchAppDetails({ url }),
});
