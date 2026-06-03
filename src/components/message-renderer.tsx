"use client";

import { useEffect, useState } from "react";
import type { UIMessage } from "ai";
import { Loader2 } from "lucide-react";
import { AppCard } from "./app-card";
import { AuditDashboard } from "./audit-dashboard";
import type { AppMetadata, ASOAuditResult } from "@/lib/types";

const TOOL_LABELS: Record<string, string> = {
  fetchAppDetails: "Fetching app details",
  fetchCompetitors: "Analyzing competitors",
  generateAuditReport: "Generating ASO audit",
};

interface MessageRendererProps {
  message: UIMessage;
  isLast: boolean;
  onSendMessage: (text: string) => void;
}

export function MessageRenderer({ message, isLast, onSendMessage }: MessageRendererProps) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-brand-600 text-white px-4 py-2.5 rounded-2xl rounded-br-sm text-sm leading-relaxed">
          {message.parts
            .filter((p) => p.type === "text")
            .map((p, i) =>
              p.type === "text" ? <span key={i}>{p.text}</span> : null
            )}
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="flex flex-col gap-3">
      {message.parts.map((part, i) => {
        if (part.type === "text" && part.text.trim()) {
          return (
            <div
              key={i}
              className="max-w-[85%] bg-zinc-900 border border-zinc-800 px-4 py-3 rounded-2xl rounded-bl-sm text-sm text-zinc-200 leading-relaxed prose prose-invert prose-sm max-w-none"
              dangerouslySetInnerHTML={{
                __html: part.text
                  .replace(/^#{1,3}\s+(.+)$/gm, "<strong>$1</strong>")
                  .replace(/^[-*]\s+(.+)$/gm, "· $1")
                  .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
                  .replace(/\n/g, "<br />"),
              }}
            />
          );
        }

        // AI SDK v6 encodes tool ID in the type: "tool-{toolId}" or legacy "dynamic-tool"
        const isToolPart =
          part.type === "dynamic-tool" || part.type.startsWith("tool-");

        if (isToolPart) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const p = part as any;
          const toolName: string =
            part.type === "dynamic-tool"
              ? (p.toolName as string)
              : part.type.slice("tool-".length);
          const state: string = p.state as string;
          const output: unknown = p.output;
          const errorText: string | undefined = p.errorText as string | undefined;

          if (state === "input-streaming" || state === "input-available") {
            return <ToolLoadingPill key={i} toolName={toolName} />;
          }

          if (state === "output-available") {
            if (toolName === "fetchAppDetails") {
              return (
                <div key={i} className="max-w-sm">
                  <AppCard
                    data={output as AppMetadata}
                    onConfirm={isLast ? () => onSendMessage("yes") : undefined}
                    onSendMessage={isLast ? onSendMessage : undefined}
                  />
                </div>
              );
            }
            if (toolName === "generateAuditReport") {
              return (
                <div key={i} className="w-full">
                  <AuditDashboard data={output as ASOAuditResult} />
                </div>
              );
            }
            // fetchCompetitors — silent, agent summarises verbally
            return null;
          }

          if (state === "output-error") {
            return (
              <div
                key={i}
                className="text-xs text-danger bg-danger/10 border border-danger/20 px-3 py-2 rounded-lg max-w-sm"
              >
                {toolName} failed: {errorText}
              </div>
            );
          }
        }

        return null;
      })}
    </div>
  );
}

function ToolLoadingPill({ toolName }: { toolName: string }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const label = TOOL_LABELS[toolName] ?? toolName;
  return (
    <div className="flex items-center gap-2 text-xs text-zinc-500 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-full w-fit">
      <Loader2 className="w-3 h-3 animate-spin text-brand-400" />
      <span>{label}…</span>
      {seconds >= 3 && (
        <span className="tabular-nums text-zinc-600">{seconds}s</span>
      )}
    </div>
  );
}
