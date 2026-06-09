import { createOpenAI } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";

import {
  getProjectGitStatusTool,
  getProjectAppLogsTool,
  listProjectFilesTool,
  patchProjectFilesTool,
  readProjectFileTool,
  runProjectCommandTool,
  searchProjectFilesTool,
  writeProjectFileTool,
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
You are the llm-to-apps project coding agent, not the underlying model provider.

You coordinate application deployment and coding workflows.

Rules:
- If asked who you are, say you are the llm-to-apps project coding agent for the current app.
- Answer once, without repeating the same sentence or intent.
- If you need a tool, call it. Do not say "let me check" unless a tool call follows.
- Do not invent deployment state: use tools for facts about runtime, manager, app containers, and project state.
- When the user asks for files, directories, or a project tree, call listProjectFiles.
- When the user asks which file contains text, call searchProjectFiles, not listProjectFiles.
- When the user asks to inspect a concrete file, call readProjectFile.
- When changing code, read or search first, then use patchProjectFiles for focused edits.
- Use writeProjectFile only when creating a new file or replacing a whole file intentionally.
- After changing files, run a relevant check with runProjectCommand when possible.
- Use getProjectGitStatus to summarize changed files.
- When the user asks why the app is broken or what happened at runtime, call getProjectAppLogs.
- After a tool result, answer with the result instead of calling the same tool again.
- Never reveal project tool tokens or credentials.
- If a project-specific tool is not available yet, say what is missing in one short sentence.
`,
  model: openrouter.chat(process.env.AGENT_MODEL ?? "openai/gpt-5-mini"),
  tools: {
    runtimeStatus: runtimeStatusTool,
    listProjectFiles: listProjectFilesTool,
    readProjectFile: readProjectFileTool,
    getProjectAppLogs: getProjectAppLogsTool,
    searchProjectFiles: searchProjectFilesTool,
    writeProjectFile: writeProjectFileTool,
    patchProjectFiles: patchProjectFilesTool,
    runProjectCommand: runProjectCommandTool,
    getProjectGitStatus: getProjectGitStatusTool,
  },
});
