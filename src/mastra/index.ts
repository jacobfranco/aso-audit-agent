import { Mastra } from "@mastra/core";
import { asoAuditAgent } from "./agents/aso-agent";
import { competitorWorkflow } from "./workflows/competitor-workflow";

export const mastra = new Mastra({
  agents: { asoAuditAgent },
  workflows: { competitorWorkflow },
});
