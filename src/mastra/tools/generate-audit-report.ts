import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import type { AppMetadata, CompetitorData, ASOAuditResult } from "@/lib/types";

const ScoreDimensionSchema = z.object({
  score: z.number().min(0).max(10),
  weight: z.number(),
  label: z.string(),
  notes: z.string().describe("Analysis notes for this dimension"),
  evidence: z.string().describe("Specific evidence from the listing"),
});

const RecommendationSchema = z.object({
  title: z.string(),
  description: z.string(),
  evidence: z.string().describe("Data point supporting this recommendation"),
  before: z.string().nullable().describe("Current text (for text changes), or null if not applicable"),
  after: z.string().nullable().describe("Suggested replacement text, or null if not applicable"),
});

const CompetitorComparisonSchema = z.object({
  name: z.string(),
  developer: z.string(),
  rating: z.number(),
  ratingCount: z.number(),
  iconUrl: z.string().nullable().describe("Leave null — injected from source data"),
  keywordCoverage: z.string(),
  visualStyle: z.string(),
  strengths: z.string(),
  weaknesses: z.string(),
});

export const ASOAuditResultSchema = z.object({
  app: z.object({
    name: z.string(),
    developer: z.string(),
    iconUrl: z.string(),
    category: z.string(),
    rating: z.number(),
    ratingCount: z.number(),
    url: z.string(),
  }),
  dimensions: z.object({
    title: ScoreDimensionSchema,
    subtitle: ScoreDimensionSchema,
    keywords: ScoreDimensionSchema,
    description: ScoreDimensionSchema,
    screenshots: ScoreDimensionSchema,
    preview: ScoreDimensionSchema,
    ratings: ScoreDimensionSchema,
    icon: ScoreDimensionSchema,
    conversion: ScoreDimensionSchema,
    competitive: ScoreDimensionSchema,
  }),
  overallScore: z
    .number()
    .min(0)
    .max(100)
    .describe("Σ(score × weight) × 10 — weights sum to 1.0 so max is 100"),
  quickWins: z
    .array(RecommendationSchema)
    .min(3)
    .max(5)
    .describe("Exactly 3–5 changes implementable today with high impact"),
  highImpact: z
    .array(RecommendationSchema)
    .min(3)
    .max(5)
    .describe("Exactly 3–5 changes requiring more effort"),
  strategic: z
    .array(RecommendationSchema)
    .min(3)
    .max(5)
    .describe("Exactly 3–5 longer-term strategic improvements"),
  competitors: z.array(CompetitorComparisonSchema),
  executiveSummary: z
    .string()
    .describe("2–3 sentence summary of top findings"),
});

const AppDataInputSchema = z.object({
  appId: z.string(),
  name: z.string(),
  developer: z.string(),
  iconUrl: z.string(),
  category: z.string(),
  country: z.string(),
  rating: z.number(),
  ratingCount: z.number(),
  description: z.string(),
  subtitle: z.string().optional(),
  price: z.string(),
  screenshotUrls: z.array(z.string()),
  hasPreviewVideo: z.boolean(),
  whatsNew: z.string().optional(),
  promotionalText: z.string().optional(),
  url: z.string(),
});

const CompetitorInputSchema = z.object({
  name: z.string(),
  developer: z.string(),
  iconUrl: z.string(),
  rating: z.number(),
  ratingCount: z.number(),
  url: z.string(),
  category: z.string(),
});

const AUDIT_SYSTEM_PROMPT = `You are an expert in App Store Optimization with deep knowledge of Apple's ranking algorithms. Perform a comprehensive ASO health audit and produce a prioritized action plan.

Score the listing on each dimension on a 0–10 scale. overallScore = Σ(score × weight) × 10. Weights sum to 1.0, so the max overallScore is 100.

Dimension             | Weight | Key checks
----------------------|--------|------------
Title (30 chars)      |  15%   | Primary keyword present? Character utilization (aim for 28–30)? Brand vs. keyword balance? Natural, not stuffed?
Subtitle (30 chars)   |  15%   | Distinct secondary keywords (no repeats from title)? Benefit-driven? Full character utilization?
Keyword field (100c)  |  15%   | No duplicates with title/subtitle? Singular forms? No spaces after commas? No wasted filler words? All 100 chars used?
Description           |  10%   | First 3 lines hook above the fold? Benefit-framed features? Social proof? Clear CTA? Natural keyword integration?
Screenshots           |  10%   | All 10 slots used? First 2–3 communicate core value? Readable on-image text (Apple OCR-indexes it)? Cohesive design?
App preview video     |   5%   | Exists? Hook in first 3 seconds? 15–30 seconds long? Understandable without sound?
Ratings & reviews     |  15%   | Average rating (4.5+ is good)? Recent trend? Themes in praise/complaints? Developer responds to negatives?
Icon                  |   5%   | Distinctive in search results? Clear at small sizes? Category-appropriate? Avoids unreadable text?
Conversion signals    |   5%   | Promotional text used? "What's New" informative? In-App Events? Custom product pages?
Competitive position  |   5%   | Keyword coverage vs. top 3 competitors? Visual differentiation? Rating gap?

SCORING RUBRIC — apply consistently and be fair. Use ONE DECIMAL PLACE precision (e.g. 7.4, 8.2, 5.8 — not just 7, 8, 6):
- 9.0–10.0: Fully optimized, best-in-class execution, minimal room to improve
- 7.0–8.9: Well-optimized with only minor gaps
- 5.0–6.9: Partially optimized — meaningful opportunities exist but basics are covered
- 3.0–4.9: Significantly underutilized — core best practices missing
- 0.0–2.9: Missing entirely or critically flawed

Give credit for what is done well. A subtitle at 28/30 chars with relevant keywords should score 7.5–8.0, not 5–6.

SCORE ANCHORS — use these concrete anchors to avoid under-scoring observable strengths:
- Title at 26–30/30 characters with relevant keywords and natural phrasing should normally score 8.8–9.4.
- Subtitle at 28–30/30 characters with relevant secondary keywords should normally score 8.0–8.8; if it is keyword-rich but weak on differentiation, score 7.2–7.8.
- No app preview video should score 0.0 because the asset is missing entirely.
- If the icon evidence is clearly positive (distinctive, recognizable, clear at small sizes, category-appropriate) and there are no stated visual concerns, score at least 8.8.
- Do not use 8.0 as a generic ceiling. 8.0 means good but still materially improvable; excellent metadata should score closer to 9.

KEYWORD FIELD: The App Store keyword field is not publicly visible. Infer keyword strategy from what IS observable — title/subtitle/description keyword diversity, targeting precision, and overlap. Write evidence about what the visible metadata signals about keyword strategy. Do NOT write "not publicly visible" or "assumed partially utilized".

ICON: Evaluate based on the app's brand recognition and category norms. The icon is present (URL provided). Score on distinctiveness, clarity at small sizes, and category-appropriateness. Do not write placeholder text or ask for an image.

EVIDENCE QUALITY — every evidence string must be a genuine observation, not a restatement of input data:
- Bad: "Has preview video: false" → Good: "No app preview video — first impression relies entirely on static screenshots, losing a key conversion driver"
- Bad: "Promotional text: NOT SET" → Good: "Promotional text slot unused — 170 chars of above-the-fold prime real estate left empty"
- Bad: "Rating: 4.782, 40081428" → Good: "4.78★ across 40.1M ratings — exceptional social proof and one of the strongest conversion signals in the category"
- Bad: "Keyword coverage inferred from title/subtitle/description" → Good: actual specific observation about which keywords are targeted and which gaps exist
- Every piece of evidence must contain at least one specific insight about what the data means for ASO performance

BEFORE/AFTER QUALITY RULES:
- The "after" text MUST be strictly better — more keyword-rich, benefit-driven, and natural-sounding
- Never suggest shorter text, grammatically weaker constructions, or factually questionable claims
- For freemium apps, never add "Free" to metadata — it is misleading and violates App Store guidelines
- Every suggested text change must fit within Apple's character limits for that field`;

function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

const CANONICAL_WEIGHTS: Record<keyof ASOAuditResult["dimensions"], number> = {
  title: 0.15,
  subtitle: 0.15,
  keywords: 0.15,
  description: 0.1,
  screenshots: 0.1,
  preview: 0.05,
  ratings: 0.15,
  icon: 0.05,
  conversion: 0.05,
  competitive: 0.05,
};

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "app",
  "apps",
  "by",
  "for",
  "from",
  "in",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
]);

function roundScore(score: number): number {
  return Math.max(0, Math.min(10, Math.round(score * 10) / 10));
}

function applyFloor(score: number, floor: number): number {
  return roundScore(Math.max(score, floor));
}

function applyCap(score: number, cap: number): number {
  return roundScore(Math.min(score, cap));
}

function keywordTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function hasDescriptiveTitleKeywords(appData: AppMetadata): boolean {
  const titleTokens = keywordTokens(appData.name);
  if (/[:\-–—]\s*\S/.test(appData.name)) return true;

  const visibleContext = [
    appData.category,
    appData.subtitle ?? "",
    appData.description.slice(0, 1000),
  ].join(" ");
  const contextTokens = new Set(keywordTokens(visibleContext));

  return titleTokens.some((token) => contextTokens.has(token));
}

function hasPositiveTitleKeywordEvidence(text: string): boolean {
  const positive =
    text.includes("relevant keyword") ||
    text.includes("primary keyword") ||
    text.includes("keyword-rich") ||
    text.includes("keyword rich") ||
    text.includes("natural");
  const negative =
    /(?:lacks?|missing|no|without|not)\s+(?:a\s+|the\s+)?(?:primary\s+|relevant\s+)?keywords?/.test(text) ||
    text.includes("keyword gap");

  return positive && !negative;
}

function evidenceText(dim: ASOAuditResult["dimensions"][keyof ASOAuditResult["dimensions"]]) {
  return `${dim.evidence} ${dim.notes}`.toLowerCase();
}

function hasPositiveIconEvidence(text: string): boolean {
  const positiveSignals = [
    "distinctive",
    "recognizable",
    "recognisable",
    "clear",
    "small sizes",
    "small size",
    "category-appropriate",
    "category appropriate",
    "memorable",
    "simple",
    "strong brand",
  ];
  return positiveSignals.filter((signal) => text.includes(signal)).length >= 2;
}

function hasIconConcern(text: string): boolean {
  const concerns = [
    "generic",
    "unclear",
    "cluttered",
    "unreadable",
    "hard to",
    "low contrast",
    "not distinctive",
    "lacks",
    "weak",
    "text-heavy",
  ];
  return concerns.some((concern) => text.includes(concern));
}

function hasSubtitleDifferentiationGap(text: string): boolean {
  const gaps = [
    "lacks differentiation",
    "weak differentiation",
    "rather than differentiation",
    "generic",
    "not benefit",
    "less benefit",
    "could be more benefit",
    "undifferentiated",
  ];
  return gaps.some((gap) => text.includes(gap));
}

function recalculateOverallScore(dimensions: ASOAuditResult["dimensions"]): number {
  const weighted = (Object.keys(CANONICAL_WEIGHTS) as Array<keyof ASOAuditResult["dimensions"]>)
    .reduce((sum, key) => sum + dimensions[key].score * CANONICAL_WEIGHTS[key], 0);
  return Math.round(weighted * 10 * 10) / 10;
}

function calibrateAuditResult(
  result: ASOAuditResult,
  appData: AppMetadata
): ASOAuditResult {
  const dimensions = { ...result.dimensions };

  for (const key of Object.keys(CANONICAL_WEIGHTS) as Array<keyof ASOAuditResult["dimensions"]>) {
    dimensions[key] = {
      ...dimensions[key],
      weight: CANONICAL_WEIGHTS[key],
      score: roundScore(dimensions[key].score),
    };
  }

  const titleLength = appData.name.trim().length;
  const titleHasKeywords = hasDescriptiveTitleKeywords(appData);
  const titleText = evidenceText(dimensions.title);
  const titleEvidenceSaysRelevant = hasPositiveTitleKeywordEvidence(titleText);

  if (titleLength >= 28 && (titleHasKeywords || titleEvidenceSaysRelevant)) {
    dimensions.title.score = applyFloor(dimensions.title.score, 9.2);
  } else if (titleLength >= 26 && (titleHasKeywords || titleEvidenceSaysRelevant)) {
    dimensions.title.score = applyFloor(dimensions.title.score, 9.0);
  } else if (titleLength >= 24 && (titleHasKeywords || titleEvidenceSaysRelevant)) {
    dimensions.title.score = applyFloor(dimensions.title.score, 8.7);
  } else if (titleLength >= 20 && (titleHasKeywords || titleEvidenceSaysRelevant)) {
    dimensions.title.score = applyFloor(dimensions.title.score, 8.0);
  }

  if (titleLength > 30) {
    dimensions.title.score = applyCap(dimensions.title.score, 7.0);
  }

  const subtitle = appData.subtitle?.trim() ?? "";
  if (!subtitle) {
    dimensions.subtitle.score = 0;
  } else {
    const subtitleLength = subtitle.length;
    const subtitleText = evidenceText(dimensions.subtitle);
    const differentiationGap = hasSubtitleDifferentiationGap(subtitleText);
    const subtitleTokens = keywordTokens(subtitle);
    const titleTokens = new Set(keywordTokens(appData.name));
    const distinctTokenCount = subtitleTokens.filter((token) => !titleTokens.has(token)).length;

    if (subtitleLength >= 28) {
      dimensions.subtitle.score = applyFloor(
        dimensions.subtitle.score,
        differentiationGap ? 7.2 : distinctTokenCount >= 2 ? 8.4 : 8.0
      );
      if (differentiationGap) {
        dimensions.subtitle.score = applyCap(dimensions.subtitle.score, 7.8);
      }
    } else if (subtitleLength >= 24) {
      dimensions.subtitle.score = applyFloor(
        dimensions.subtitle.score,
        differentiationGap ? 7.0 : distinctTokenCount >= 2 ? 7.8 : 7.4
      );
    }
  }

  if (!appData.hasPreviewVideo) {
    dimensions.preview.score = 0;
    if (!dimensions.preview.evidence.toLowerCase().includes("no app preview")) {
      dimensions.preview.evidence =
        "No app preview video present — first impression relies entirely on static screenshots, losing a key conversion driver.";
    }
  }

  const screenshotCount = appData.screenshotUrls.length;
  if (screenshotCount === 0) {
    dimensions.screenshots.score = 0;
  } else if (screenshotCount >= 10) {
    dimensions.screenshots.score = applyFloor(dimensions.screenshots.score, 8.0);
  } else if (screenshotCount >= 8) {
    dimensions.screenshots.score = applyFloor(dimensions.screenshots.score, 7.2);
  } else if (screenshotCount <= 3) {
    dimensions.screenshots.score = applyCap(dimensions.screenshots.score, 5.5);
  }

  if (appData.rating >= 4.7 && appData.ratingCount >= 100_000) {
    dimensions.ratings.score = applyFloor(dimensions.ratings.score, 9.2);
  } else if (appData.rating >= 4.5 && appData.ratingCount >= 10_000) {
    dimensions.ratings.score = applyFloor(dimensions.ratings.score, 8.6);
  } else if (appData.rating >= 4.2 && appData.ratingCount >= 1_000) {
    dimensions.ratings.score = applyFloor(dimensions.ratings.score, 7.5);
  } else if (appData.rating > 0 && appData.rating < 3.8) {
    dimensions.ratings.score = applyCap(dimensions.ratings.score, 5.9);
  }

  const iconText = evidenceText(dimensions.icon);
  if (hasPositiveIconEvidence(iconText) && !hasIconConcern(iconText)) {
    dimensions.icon.score = applyFloor(dimensions.icon.score, 8.8);
  }

  return {
    ...result,
    dimensions,
    overallScore: recalculateOverallScore(dimensions),
  };
}

function normalizeArtworkUrl(url?: string): string {
  return (url ?? "").trim().replace(/^http:\/\//i, "https://");
}

function cleanName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function tokenOverlapScore(a: string, b: string): number {
  const aTokens = new Set(keywordTokens(a));
  const bTokens = new Set(keywordTokens(b));
  if (aTokens.size === 0 || bTokens.size === 0) return 0;

  let overlap = 0;
  for (const token of aTokens) {
    if (bTokens.has(token)) overlap += 1;
  }
  return overlap / Math.max(aTokens.size, bTokens.size);
}

function findCompetitorSource(
  comp: Pick<CompetitorData, "name" | "developer">,
  index: number,
  competitors: CompetitorData[]
): CompetitorData | undefined {
  if (competitors.length === 0) return undefined;

  const compName = cleanName(comp.name);
  const compDeveloper = cleanName(comp.developer);
  let best: { score: number; competitor: CompetitorData | undefined } = {
    score: -1,
    competitor: undefined,
  };

  competitors.forEach((candidate) => {
    const candidateName = cleanName(candidate.name);
    const candidateDeveloper = cleanName(candidate.developer);
    let score = 0;

    if (compName === candidateName) score += 100;
    else if (compName.includes(candidateName) || candidateName.includes(compName)) score += 70;
    else score += tokenOverlapScore(comp.name, candidate.name) * 50;

    if (compDeveloper && candidateDeveloper) {
      if (compDeveloper === candidateDeveloper) score += 30;
      else if (compDeveloper.includes(candidateDeveloper) || candidateDeveloper.includes(compDeveloper)) {
        score += 15;
      }
    }

    if (score > best.score) {
      best = { score, competitor: candidate };
    }
  });

  return best.score >= 20 ? best.competitor : competitors[index];
}

interface ItunesSearchItem {
  trackName: string;
  sellerName: string;
  artworkUrl512: string;
  artworkUrl100: string;
  primaryGenreName: string;
  averageUserRating?: number;
  userRatingCount?: number;
  trackViewUrl: string;
}

async function fetchCompetitorsFallback(appData: AppMetadata): Promise<CompetitorData[]> {
  const match = appData.name.match(/[:–—]\s*(.+)$/);
  const keyword = match ? match[1].trim().toLowerCase() : `${appData.category.toLowerCase()} app`;
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(keyword)}&country=${appData.country}&entity=software&limit=10`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "ASO-Audit-Agent/1.0" } });
    if (!res.ok) return [];
    const data = await res.json() as { results: ItunesSearchItem[] };
    return (data.results ?? [])
      .filter((r) => r.trackName !== appData.name)
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
  } catch {
    return [];
  }
}

export async function executeGenerateAuditReport({
  appData,
  competitors: inputCompetitors,
}: {
  appData: AppMetadata;
  competitors: CompetitorData[];
}): Promise<ASOAuditResult> {
  // Fallback: if the agent didn't forward competitors, fetch them directly
  const competitors =
    inputCompetitors.length > 0 ? inputCompetitors : await fetchCompetitorsFallback(appData);

  const competitorSummary = competitors.map((c) => ({
    name: c.name,
    developer: c.developer,
    rating: c.rating,
    ratingCount: c.ratingCount,
    category: c.category,
    url: c.url,
  }));

  const prompt = `Analyze this App Store listing and produce a comprehensive ASO audit:

APP:
Name: ${appData.name}
Developer: ${appData.developer}
Category: ${appData.category}
Country: ${appData.country}
Rating: ${appData.rating.toFixed(2)} ★ (${fmtCount(appData.ratingCount)} ratings)
Price: ${appData.price}
Subtitle: ${appData.subtitle ?? "Not set"}
Promotional text: ${appData.promotionalText ?? "Not set (0 of 170 chars used)"}
App preview video: ${appData.hasPreviewVideo ? "Yes" : "None"}
Screenshots: ${appData.screenshotUrls.length} of 10 slots filled
What's New: ${appData.whatsNew ? `"${appData.whatsNew.slice(0, 400)}"` : "Empty"}
Icon: Present

DESCRIPTION (first 1500 chars):
${appData.description.slice(0, 1500)}

COMPETITORS (analyze ONLY these apps — do not suggest others, use their exact names):
${JSON.stringify(competitorSummary, null, 2)}

Produce a thorough, specific audit. Apply the scoring rubric fairly. Every recommendation must cite evidence and include before/after for text changes.`;

  try {
    const { object } = await generateObject({
      model: openai("gpt-4o"),
      schema: ASOAuditResultSchema,
      system: AUDIT_SYSTEM_PROMPT,
      prompt,
      maxOutputTokens: 4000,
    });

    // Inject ground-truth iconUrls from source data. The model owns the analysis,
    // but source order/name/developer matching owns image URLs.
    const enrichedCompetitors = object.competitors.map((comp, index) => {
      const match = findCompetitorSource(comp, index, competitors);
      const fallback = competitors[index];
      const iconUrl = normalizeArtworkUrl(match?.iconUrl || fallback?.iconUrl);
      return { ...comp, iconUrl: iconUrl || null };
    });

    return calibrateAuditResult({
      ...object,
      app: {
        name: appData.name,
        developer: appData.developer,
        iconUrl: normalizeArtworkUrl(appData.iconUrl),
        category: appData.category,
        rating: appData.rating,
        ratingCount: appData.ratingCount,
        url: appData.url,
      },
      competitors: enrichedCompetitors,
    }, appData);
  } catch (err) {
    console.error("[generateAuditReport] generateObject failed:", err);
    throw err;
  }
}

export const generateAuditReportTool = createTool({
  id: "generateAuditReport",
  description:
    "Generates a comprehensive ASO audit report with dimension scores, quick wins, high-impact changes, strategic recommendations, and competitor comparison. Call this after fetchCompetitors.",
  inputSchema: z.object({
    appData: AppDataInputSchema,
    competitors: z.array(CompetitorInputSchema),
  }),
  outputSchema: ASOAuditResultSchema,
  execute: async ({ appData, competitors }) =>
    executeGenerateAuditReport({ appData, competitors }),
});
