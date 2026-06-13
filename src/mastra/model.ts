import { createOpenAI } from "@ai-sdk/openai";

export const defaultAgentModel = "openai/gpt-5-mini";
export const defaultProjectDevAgentModel = "openai/gpt-5";
export const defaultProjectUseAgentModel = "x-ai/grok-4.3";
export const defaultUserAgentModel = "openai/gpt-5";

type AgentRequestContext = {
  model?: unknown;
};

const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
  headers: {
    "HTTP-Referer": process.env.PLATFORM_BASE_URL ?? "http://localhost:3000",
  },
});

export function agentChatModel(requestContext?: unknown) {
  return openrouter.chat(requestedModel(requestContext, defaultAgentModel));
}

export function projectDevAgentChatModel(requestContext?: unknown) {
  return openrouter.chat(requestedModel(requestContext, defaultProjectDevAgentModel));
}

export function projectUseAgentChatModel(requestContext?: unknown) {
  return openrouter.chat(requestedModel(requestContext, defaultProjectUseAgentModel));
}

export function userAgentChatModel(requestContext?: unknown) {
  return openrouter.chat(requestedModel(requestContext, defaultUserAgentModel));
}

function requestedModel(requestContext: unknown, fallback: string) {
  if (!requestContext || typeof requestContext !== "object") {
    return fallback;
  }

  const model = (requestContext as AgentRequestContext).model;

  return typeof model === "string" && model.trim() ? model : fallback;
}
