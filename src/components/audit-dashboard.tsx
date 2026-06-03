"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { Zap, TrendingUp, Compass, Star, Users } from "lucide-react";
import { ScoreBar, OverallScore } from "./score-bar";
import { ArtworkImage } from "./artwork-image";
import type { ASOAuditResult, Recommendation, CompetitorComparison } from "@/lib/types";

interface AuditDashboardProps {
  data: ASOAuditResult;
}

type Tab = "scorecard" | "quickwins" | "highimpact" | "strategic" | "competitors";

const DIMENSION_ORDER: Array<keyof ASOAuditResult["dimensions"]> = [
  "title",
  "subtitle",
  "keywords",
  "description",
  "screenshots",
  "preview",
  "ratings",
  "icon",
  "conversion",
  "competitive",
];

const DIMENSION_LABELS: Record<keyof ASOAuditResult["dimensions"], string> = {
  title: "Title",
  subtitle: "Subtitle",
  keywords: "Keyword Field",
  description: "Description",
  screenshots: "Screenshots",
  preview: "App Preview Video",
  ratings: "Ratings & Reviews",
  icon: "Icon",
  conversion: "Conversion Signals",
  competitive: "Competitive Position",
};

const TAB_BORDER: Record<"quickwins" | "highimpact" | "strategic", string> = {
  quickwins: "border-l-brand-500",
  highimpact: "border-l-brand-500",
  strategic: "border-l-brand-500",
};

function RecommendationCard({
  rec,
  index,
  variant,
}: {
  rec: Recommendation;
  index: number;
  variant: "quickwins" | "highimpact" | "strategic";
}) {
  return (
    <div
      className={clsx(
        "border border-zinc-800 rounded-xl p-4 space-y-3 hover:border-zinc-700 transition-colors border-l-4",
        TAB_BORDER[variant]
      )}
    >
      <div className="flex items-start gap-2.5">
        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-zinc-800 text-zinc-400 text-[10px] flex items-center justify-center font-semibold mt-0.5">
          {index + 1}
        </span>
        <h4 className="font-medium text-zinc-100 text-sm leading-snug">{rec.title}</h4>
      </div>
      <p className="text-sm text-zinc-400 leading-relaxed pl-7">{rec.description}</p>

      {rec.evidence && (
        <div className="flex items-start gap-2 bg-zinc-950/50 rounded-lg px-3 py-2 ml-7">
          <span className="text-zinc-600 shrink-0 mt-0.5 text-xs">▸</span>
          <p className="text-xs text-zinc-500">{rec.evidence}</p>
        </div>
      )}

      {(rec.before || rec.after) && (
        <div className="space-y-2 pt-1 pl-7">
          {rec.before && (
            <div className="p-3 bg-zinc-950/60 border border-zinc-800 rounded-lg">
              <p className="text-xs text-zinc-500 font-medium mb-1">Current</p>
              <p className="text-xs text-zinc-300 font-mono leading-relaxed">{rec.before}</p>
            </div>
          )}
          {rec.after && (
            <div className="p-3 bg-success/10 border border-success/20 rounded-lg">
              <p className="text-xs text-success font-medium mb-1">Example</p>
              <p className="text-xs text-zinc-300 font-mono leading-relaxed">{rec.after}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

function CompetitorCards({
  competitors,
  appRating,
}: {
  competitors: CompetitorComparison[];
  appRating: number;
}) {
  return (
    <div className="space-y-3">
      {competitors.map((c, i) => {
        const diff = c.rating - appRating;
        const diffColor =
          diff > 0.05 ? "text-danger" : diff < -0.05 ? "text-success" : "text-brand-500";
        const diffStr =
          Math.abs(diff) < 0.05
            ? "(≈)"
            : `(${diff > 0 ? "+" : ""}${diff.toFixed(2)})`;

        return (
          <div key={i} className="border border-zinc-800 rounded-xl p-4 space-y-3 hover:border-zinc-700 transition-colors">
            {/* Header row */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <ArtworkImage
                  src={c.iconUrl}
                  alt={`${c.name} icon`}
                  className="w-10 h-10 rounded-xl"
                  sizes="40px"
                />
                <div className="min-w-0">
                  <p className="font-medium text-zinc-200 text-sm truncate">{c.name}</p>
                  <p className="text-xs text-zinc-500 truncate">{c.developer}</p>
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <div className="flex items-center gap-1.5 justify-end">
                  <Star className="w-3.5 h-3.5 fill-brand-500 text-brand-500" />
                  <span className="font-semibold text-sm tabular-nums text-brand-500">{c.rating.toFixed(1)}</span>
                  <span className={clsx("text-xs font-medium tabular-nums", diffColor)}>{diffStr}</span>
                </div>
                <p className="text-xs text-zinc-600 tabular-nums mt-0.5">{formatCount(c.ratingCount)}</p>
              </div>
            </div>

            {/* Strengths + Weaknesses */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-success/10 border border-success/20 rounded-lg p-2.5">
                <p className="text-xs text-success font-medium mb-1">Strengths</p>
                <p className="text-xs text-zinc-400 leading-relaxed">{c.strengths}</p>
              </div>
              <div className="bg-danger/10 border border-danger/20 rounded-lg p-2.5">
                <p className="text-xs text-danger font-medium mb-1">Weaknesses</p>
                <p className="text-xs text-zinc-400 leading-relaxed">{c.weaknesses}</p>
              </div>
            </div>

            {/* Keyword coverage */}
            {c.keywordCoverage && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
                <span className="text-xs text-zinc-500 font-medium">Keyword coverage: </span>
                <span className="text-xs text-zinc-400">{c.keywordCoverage}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function AuditDashboard({ data }: AuditDashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>("scorecard");

  const tabs: Array<{ id: Tab; label: string; icon: React.ReactNode; count?: number }> = [
    { id: "scorecard", label: "Score Card", icon: <TrendingUp className="w-3.5 h-3.5" /> },
    {
      id: "quickwins",
      label: "Quick Wins",
      icon: <Zap className="w-3.5 h-3.5" />,
      count: data.quickWins.length,
    },
    {
      id: "highimpact",
      label: "High-Impact Changes",
      icon: <TrendingUp className="w-3.5 h-3.5" />,
      count: data.highImpact.length,
    },
    {
      id: "strategic",
      label: "Strategic Recommendations",
      icon: <Compass className="w-3.5 h-3.5" />,
      count: data.strategic.length,
    },
    {
      id: "competitors",
      label: "Competitors",
      icon: <Users className="w-3.5 h-3.5" />,
      count: data.competitors.length,
    },
  ];

  return (
    <div className="border border-zinc-800 rounded-2xl bg-zinc-900/50 overflow-hidden w-full">
      {/* Header */}
      <div className="p-5 border-b border-zinc-800 flex items-center gap-4">
        <ArtworkImage
          src={data.app.iconUrl}
          alt={`${data.app.name} icon`}
          className="w-14 h-14 rounded-xl"
          sizes="56px"
        />
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-white truncate">{data.app.name}</h2>
          <p className="text-sm text-zinc-400 truncate">{data.app.developer}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span className="text-sm text-zinc-300">{data.app.rating.toFixed(1)}</span>
            <span className="text-xs text-zinc-500">({formatCount(data.app.ratingCount)})</span>
            <span className="text-zinc-700">·</span>
            <span className="text-xs text-zinc-500">{data.app.category}</span>
          </div>
        </div>
        <OverallScore score={data.overallScore} />
      </div>

      {/* Executive summary */}
      {data.executiveSummary && (
        <div className="px-5 py-3 bg-zinc-950/50 border-b border-zinc-800">
          <p className="text-sm text-zinc-400 leading-relaxed">{data.executiveSummary}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-zinc-800 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              "flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors",
              activeTab === tab.id
                ? "border-brand-500 text-brand-400"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={clsx(
                  "w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-semibold",
                  activeTab === tab.id
                    ? "bg-brand-500/20 text-brand-400"
                    : "bg-zinc-800 text-zinc-500"
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-5">
        {activeTab === "scorecard" && (
          <div className="space-y-4">
            {DIMENSION_ORDER.map((key) => {
              const dim = data.dimensions[key];
              return (
                <ScoreBar
                  key={key}
                  score={dim.score}
                  weight={dim.weight}
                  label={DIMENSION_LABELS[key]}
                  notes={dim.evidence}
                />
              );
            })}
          </div>
        )}

        {activeTab === "quickwins" && (
          <div className="space-y-3">
            <p className="text-xs text-zinc-500 mb-4">High-impact changes you can ship today.</p>
            {data.quickWins.map((rec, i) => (
              <RecommendationCard key={i} rec={rec} index={i} variant="quickwins" />
            ))}
          </div>
        )}

        {activeTab === "highimpact" && (
          <div className="space-y-3">
            <p className="text-xs text-zinc-500 mb-4">
              Changes that require more effort but move the needle significantly.
            </p>
            {data.highImpact.map((rec, i) => (
              <RecommendationCard key={i} rec={rec} index={i} variant="highimpact" />
            ))}
          </div>
        )}

        {activeTab === "strategic" && (
          <div className="space-y-3">
            <p className="text-xs text-zinc-500 mb-4">
              Longer-term improvements for sustained ASO growth.
            </p>
            {data.strategic.map((rec, i) => (
              <RecommendationCard key={i} rec={rec} index={i} variant="strategic" />
            ))}
          </div>
        )}

        {activeTab === "competitors" && (
          <div>
            {data.competitors.length > 0 ? (
              <CompetitorCards competitors={data.competitors} appRating={data.app.rating} />
            ) : (
              <p className="text-sm text-zinc-500 text-center py-8">
                No competitor data available.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
