"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";

interface ScoreBarProps {
  score: number;
  weight: number;
  label: string;
  notes?: string;
  animate?: boolean;
}

function scoreColor(score: number) {
  if (score >= 8) return "bg-success";
  if (score >= 6) return "bg-info";
  if (score >= 4) return "bg-warning";
  return "bg-danger";
}

function scoreTextColor(score: number) {
  if (score >= 8) return "text-success";
  if (score >= 6) return "text-info";
  if (score >= 4) return "text-warning";
  return "text-danger";
}

function scoreLabel(score: number) {
  if (score >= 8) return "Good";
  if (score >= 6) return "Fair";
  if (score >= 4) return "Needs Work";
  return "Poor";
}

export function ScoreBar({ score, label, notes, animate = true }: ScoreBarProps) {
  const [width, setWidth] = useState(animate ? 0 : score * 10);

  useEffect(() => {
    if (!animate) return;
    const t = setTimeout(() => setWidth(score * 10), 80);
    return () => clearTimeout(t);
  }, [score, animate]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-zinc-200 font-medium">{label}</span>
        <div className="flex items-center gap-1.5">
          <span className={clsx("text-xs font-medium", scoreTextColor(score))}>
            {scoreLabel(score)}
          </span>
          <span className={clsx("font-mono font-semibold tabular-nums", scoreTextColor(score))}>
            {score.toFixed(1)}
          </span>
        </div>
      </div>

      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={clsx(
            "h-full rounded-full transition-all duration-700 ease-out score-bar-fill",
            scoreColor(score)
          )}
          style={{ width: `${width}%` }}
        />
      </div>

      {notes && (
        <p className="text-xs text-zinc-500 leading-relaxed">{notes}</p>
      )}
    </div>
  );
}

const ARC_RADIUS = 42;
const ARC_CIRCUMFERENCE = 2 * Math.PI * ARC_RADIUS;

interface OverallScoreProps {
  score: number;
}

export function OverallScore({ score }: OverallScoreProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const duration = 1200;
    const tick = () => {
      const elapsed = Date.now() - start;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setProgress(eased);
      if (t < 1) requestAnimationFrame(tick);
    };
    const raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  const displayed = Math.round(score * progress);
  const dashOffset = ARC_CIRCUMFERENCE * (1 - (score / 100) * progress);

  const arcColor =
    score >= 80 ? "#00DFA2" : score >= 60 ? "#0079FF" : score >= 40 ? "#F6FA70" : "#FF0060";
  const textColor =
    score >= 80
      ? "text-success"
      : score >= 60
        ? "text-info"
        : score >= 40
          ? "text-warning"
          : "text-danger";
  const grade =
    score >= 80 ? "Excellent" : score >= 60 ? "Good" : score >= 40 ? "Needs Work" : "Critical";

  return (
    <div className="relative w-28 h-28 flex-shrink-0">
      <svg
        className="absolute inset-0 w-full h-full -rotate-90"
        viewBox="0 0 100 100"
      >
        <circle
          cx="50"
          cy="50"
          r={ARC_RADIUS}
          fill="none"
          stroke="#27272a"
          strokeWidth="8"
        />
        <circle
          cx="50"
          cy="50"
          r={ARC_RADIUS}
          fill="none"
          stroke={arcColor}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={ARC_CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={clsx("text-3xl font-bold tabular-nums leading-none", textColor)}>
          {displayed}
        </span>
        <span className="text-[10px] text-zinc-500 mt-1">{grade}</span>
      </div>
    </div>
  );
}
