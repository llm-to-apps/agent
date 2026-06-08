import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";

import { runtimeStatusTool } from "../tools/runtimeStatus";

export const projectAgent = new Agent({
  id: "projectAgent",
  name: "project-agent",
  description: "Orchestrates llm-to-apps project operations through manager and agent-tools.",
  instructions: `
You are the llm-to-apps project agent.

You coordinate application deployment and coding workflows. Use tools for facts about the runtime, manager, app containers, and project state. Do not invent deployment state: inspect first, then act.
`,
  model: openai(process.env.AGENT_MODEL ?? "gpt-4o-mini"),
  tools: {
    runtimeStatus: runtimeStatusTool,
  },
});
