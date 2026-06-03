"use client";

import { useState, type FormEvent } from "react";
import { Star, Send } from "lucide-react";
import { clsx } from "clsx";
import { ArtworkImage } from "./artwork-image";
import type { AppMetadata } from "@/lib/types";

interface AppCardProps {
  data: AppMetadata;
  onConfirm?: () => void;
  onSendMessage?: (text: string) => void;
}

function formatRatingCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(0)}K`;
  return count.toString();
}

export function AppCard({ data, onConfirm, onSendMessage }: AppCardProps) {
  const [denying, setDenying] = useState(false);
  const [altUrl, setAltUrl] = useState("");
  const showActions = !!onConfirm;

  function handleDenySubmit(e: FormEvent) {
    e.preventDefault();
    const url = altUrl.trim();
    if (url) {
      onSendMessage?.(url);
      setAltUrl("");
      setDenying(false);
    }
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden max-w-sm">
      <div className="flex items-start gap-4 p-4">
        <ArtworkImage
          src={data.iconUrl}
          alt={`${data.name} icon`}
          className="w-16 h-16 rounded-2xl"
          sizes="64px"
        />

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate">{data.name}</h3>
          {data.subtitle && (
            <p className="text-xs text-zinc-400 truncate mt-0.5">{data.subtitle}</p>
          )}
          <p className="text-sm text-zinc-400 mt-0.5 truncate">{data.developer}</p>

          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded-full">
              {data.category}
            </span>
            <span className="text-xs text-zinc-500 uppercase tracking-wide">
              {data.country.toUpperCase()}
            </span>
          </div>

          <div className="flex items-center gap-1 mt-2">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span className="text-sm font-medium text-zinc-200">
              {data.rating.toFixed(1)}
            </span>
            <span className="text-xs text-zinc-500">
              ({formatRatingCount(data.ratingCount)})
            </span>
            <span className="text-xs text-zinc-600 mx-1">·</span>
            <span className="text-xs text-zinc-500">{data.price}</span>
          </div>
        </div>
      </div>

      {showActions && !denying && (
        <div className="flex border-t border-zinc-800">
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 text-sm font-medium text-emerald-400 hover:bg-emerald-950/30 transition-colors"
          >
            Yes, audit this
          </button>
          <div className="w-px bg-zinc-800" />
          <button
            onClick={() => setDenying(true)}
            className="flex-1 py-2.5 text-sm font-medium text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors"
          >
            Wrong app
          </button>
        </div>
      )}

      {showActions && denying && (
        <form
          onSubmit={handleDenySubmit}
          className="flex items-center gap-2 p-3 border-t border-zinc-800"
        >
          <input
            autoFocus
            value={altUrl}
            onChange={(e) => setAltUrl(e.target.value)}
            placeholder="Paste the correct App Store URL…"
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-brand-500/60 min-w-0"
          />
          <button
            type="submit"
            disabled={!altUrl.trim()}
            className={clsx(
              "flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg transition-colors",
              altUrl.trim()
                ? "bg-brand-600 hover:bg-brand-500 text-white"
                : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
            )}
          >
            <Send className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => { setDenying(false); setAltUrl(""); }}
            className="flex-shrink-0 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            Cancel
          </button>
        </form>
      )}
    </div>
  );
}
