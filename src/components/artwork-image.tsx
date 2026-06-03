"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { clsx } from "clsx";

interface ArtworkImageProps {
  src?: string | null;
  alt: string;
  className: string;
  imageClassName?: string;
  sizes?: string;
}

function buildArtworkCandidates(src?: string | null): string[] {
  const trimmed = src?.trim();
  if (!trimmed) return [];

  const normalized = trimmed.replace(/^http:\/\//i, "https://");
  const candidates = new Set<string>([normalized]);
  const sizePattern = /\/\d+x\d+bb\.(jpg|jpeg|png|webp)(\?.*)?$/i;

  for (const size of ["512x512bb", "256x256bb", "100x100bb"]) {
    candidates.add(normalized.replace(sizePattern, `/${size}.$1$2`));
  }

  return Array.from(candidates);
}

export function ArtworkImage({
  src,
  alt,
  className,
  imageClassName,
  sizes,
}: ArtworkImageProps) {
  const candidates = useMemo(() => buildArtworkCandidates(src), [src]);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const currentSrc = candidates[candidateIndex];

  useEffect(() => {
    setCandidateIndex(0);
  }, [src]);

  return (
    <div
      className={clsx(
        "relative overflow-hidden bg-zinc-800 flex-shrink-0",
        className
      )}
    >
      {currentSrc ? (
        <Image
          src={currentSrc}
          alt={alt}
          fill
          className={clsx("object-cover", imageClassName)}
          sizes={sizes}
          unoptimized
          onError={() => setCandidateIndex((index) => index + 1)}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-zinc-500">
          <ImageIcon className="w-1/2 h-1/2" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
