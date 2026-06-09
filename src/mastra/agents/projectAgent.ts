import { createOpenAI } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";

import {
  getProjectAppLogsTool,
  listProjectFilesTool,
  readProjectFileTool,
} from "../tools/projectTools";
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

You coordinate application deployment and coding workflows.

Rules:
- Answer once, without repeating the same sentence or intent.
- If you need a tool, call it. Do not say "let me check" unless a tool call follows.
- Do not invent deployment state: use tools for facts about runtime, manager, app containers, and project state.
- When the user asks for files, directories, or a project tree, call listProjectFiles.
- When the user asks to inspect a concrete file, call readProjectFile.
- When the user asks why the app is broken or what happened at runtime, call getProjectAppLogs.
- After a tool result, answer with the result instead of calling the same tool again.
- Never reveal project tool tokens or credentials.
- If a project-specific tool is not available yet, say what is missing in one short sentence.
`,
  model: openrouter(process.env.AGENT_MODEL ?? "anthropic/claude-sonnet-4"),
  tools: {
    runtimeStatus: runtimeStatusTool,
    listProjectFiles: listProjectFilesTool,
    readProjectFile: readProjectFileTool,
    getProjectAppLogs: getProjectAppLogsTool,
  },
});
