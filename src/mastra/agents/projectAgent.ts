import { createOpenAI } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";

import { runtimeStatusTool } from "../tools/runtimeStatus";

const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
  headers: {
    "HTTP-Referer": process.env.OPENROUTER_SITE_URL ?? "http://localhost:3000",
    "X-Title": process.env.OPENROUTER_APP_NAME ?? "LLM to Apps",
  },
});

export const projectAgent = new Agent({
  id: "projectAgent",
  name: "project-agent",
  description: "Orchestrates llm-to-apps project operations through manager and agent-tools.",
  instructions: `
You are the llm-to-apps project agent.

You coordinate application deployment and coding workflows. Use tools for facts about the runtime, manager, app containers, and project state. Do not invent deployment state: inspect first, then act.
`,
  model: openrouter(process.env.AGENT_MODEL ?? "anthropic/claude-sonnet-4"),
  tools: {
    runtimeStatus: runtimeStatusTool,
  },
});
