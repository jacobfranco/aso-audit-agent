import { streamText, tool, stepCountIs, convertToModelMessages } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { ASO_AGENT_INSTRUCTIONS } from "@/mastra/agents/aso-agent";
import {
  executeFetchAppDetails,
  AppMetadataSchema,
} from "@/mastra/tools/fetch-app-details";
import { executeFetchCompetitors } from "@/mastra/tools/fetch-competitors";
import {
  executeGenerateAuditReport,
  ASOAuditResultSchema,
} from "@/mastra/tools/generate-audit-report";
import { CompetitorSchema } from "@/mastra/workflows/competitor-workflow";

// Tools wired up for AI SDK streaming. Execute functions are imported from the
// Mastra tool files so there is zero logic duplication — Mastra owns the definitions.
const tools = {
  fetchAppDetails: tool({
    description:
      "Fetches detailed metadata for an Apple App Store app from its URL. Call this IMMEDIATELY when the user pastes any apps.apple.com URL.",
    inputSchema: z.object({
      url: z.string().describe("The Apple App Store URL"),
    }),
    execute: async ({ url }: { url: string }) =>
      executeFetchAppDetails({ url }),
  }),

  fetchCompetitors: tool({
    description:
      "Finds and fetches data for the top 3 competitor apps in the same category. Call this after the user confirms the app.",
    inputSchema: z.object({
      appName: z.string().describe("Name of the app being audited"),
      category: z.string().describe('App category e.g. "Music"'),
      country: z.string().describe('Two-letter country code e.g. "us"'),
    }),
    execute: async ({
      appName,
      category,
      country,
    }: {
      appName: string;
      category: string;
      country: string;
    }) => executeFetchCompetitors({ appName, category, country }),
  }),

  generateAuditReport: tool({
    description:
      "Generates a comprehensive ASO audit report. Call this after fetchCompetitors with the full appData and competitors.",
    inputSchema: z.object({
      appData: AppMetadataSchema,
      competitors: z.array(CompetitorSchema),
    }),
    execute: async ({
      appData,
      competitors,
    }: {
      appData: z.infer<typeof AppMetadataSchema>;
      competitors: z.infer<typeof CompetitorSchema>[];
    }) => executeGenerateAuditReport({ appData, competitors }),
  }),
};

export async function POST(req: Request) {
  const body = await req.json();
  const messages = body.messages ?? [];

  const modelMessages = await convertToModelMessages(messages, { tools });

  const result = streamText({
    model: openai("gpt-4o"),
    system: ASO_AGENT_INSTRUCTIONS,
    messages: modelMessages,
    stopWhen: stepCountIs(10),
    tools,
  });

  return result.toUIMessageStreamResponse();
}
