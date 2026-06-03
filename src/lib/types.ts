export interface AppMetadata {
  appId: string;
  name: string;
  developer: string;
  iconUrl: string;
  category: string;
  country: string;
  rating: number;
  ratingCount: number;
  description: string;
  subtitle?: string;
  price: string;
  screenshotUrls: string[];
  hasPreviewVideo: boolean;
  whatsNew?: string;
  promotionalText?: string;
  url: string;
}

export interface CompetitorData {
  name: string;
  developer: string;
  iconUrl: string;
  rating: number;
  ratingCount: number;
  url: string;
  category: string;
}

export interface ScoreDimension {
  score: number;
  weight: number;
  label: string;
  notes: string;
  evidence: string;
}

export interface Recommendation {
  title: string;
  description: string;
  evidence: string;
  before: string | null;
  after: string | null;
}

export interface CompetitorComparison {
  name: string;
  developer: string;
  rating: number;
  ratingCount: number;
  iconUrl: string | null;
  keywordCoverage: string;
  visualStyle: string;
  strengths: string;
  weaknesses: string;
}

export interface ASOAuditResult {
  app: {
    name: string;
    developer: string;
    iconUrl: string;
    category: string;
    rating: number;
    ratingCount: number;
    url: string;
  };
  dimensions: {
    title: ScoreDimension;
    subtitle: ScoreDimension;
    keywords: ScoreDimension;
    description: ScoreDimension;
    screenshots: ScoreDimension;
    preview: ScoreDimension;
    ratings: ScoreDimension;
    icon: ScoreDimension;
    conversion: ScoreDimension;
    competitive: ScoreDimension;
  };
  overallScore: number;
  quickWins: Recommendation[];
  highImpact: Recommendation[];
  strategic: Recommendation[];
  competitors: CompetitorComparison[];
  executiveSummary: string;
}
