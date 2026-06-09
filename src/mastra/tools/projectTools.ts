import { createTool } from "@mastra/core/tools";
import { z } from "zod";

type ToolExecutionContext = {
  requestContext?: unknown;
};

type AgentToolsFetchOptions = {
  path: string;
  query?: Record<string, string | number | undefined>;
  context: ToolExecutionContext;
};

export const listProjectFilesTool = createTool({
  id: "listProjectFiles",
  description:
    "List files and directories in the current project through the project's agent-tools endpoint.",
  inputSchema: z.object({
    path: z.string().optional().default("."),
    maxDepth: z.number().int().min(0).max(8).optional().default(2),
  }),
  outputSchema: z.any(),
  execute: async ({ maxDepth, path }, context) => {
    return agentToolsFetch({
      context: context ?? {},
      path: "/files/tree",
      query: { path, maxDepth },
    });
  },
});

export const readProjectFileTool = createTool({
  id: "readProjectFile",
  description:
    "Read a file from the current project through the project's agent-tools endpoint.",
  inputSchema: z.object({
    path: z.string().min(1),
  }),
  outputSchema: z.any(),
  execute: async ({ path }, context) => {
    return agentToolsFetch({
      context: context ?? {},
      path: "/files/read",
      query: { path },
    });
  },
});

export const getProjectAppLogsTool = createTool({
  id: "getProjectAppLogs",
  description:
    "Return application logs from the current project container through the project's agent-tools endpoint.",
  inputSchema: z.object({
    tail: z.number().int().min(1).max(1000).optional().default(200),
  }),
  outputSchema: z.any(),
  execute: async ({ tail }, context) => {
    return agentToolsFetch({
      context: context ?? {},
      path: "/app/logs",
      query: { tail },
    });
  },
});

async function agentToolsFetch({ context, path, query }: AgentToolsFetchOptions) {
  const startedAt = Date.now();
  const toolsUrl = readRequestContextValue(context, "toolsUrl");
  const token = readRequestContextValue(context, "agentToolsToken");
  const projectId = readRequestContextValue(context, "projectId");

  if (typeof toolsUrl !== "string" || !toolsUrl) {
    console.warn("[project-agent] missing project tools url", { projectId });
    throw new Error("Project tools URL is missing from request context.");
  }

  const url = new URL(path.replace(/^\//, ""), ensureTrailingSlash(toolsUrl));
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }

  const hasToken = typeof token === "string" && token.length > 0;

  console.info("[project-agent] agent-tools request", {
    projectId,
    path,
    hasToken,
    query,
  });

  const response = await fetch(url, {
    headers: hasToken
      ? {
          Authorization: `Bearer ${token}`,
        }
      : undefined,
  });
  const rawBody = await response.text();
  const body = parseJson(rawBody);
  const durationMs = Date.now() - startedAt;

  console.info("[project-agent] agent-tools response", {
    projectId,
    path,
    status: response.status,
    ok: response.ok,
    durationMs,
  });

  if (!response.ok) {
    throw new Error(
      `Project tools request failed with ${response.status}: ${summarizeBody(body)}`,
    );
  }

  return body;
}

function readRequestContextValue(context: ToolExecutionContext, key: string) {
  const requestContext = context.requestContext;

  if (!requestContext) {
    return undefined;
  }

  if (
    typeof requestContext === "object" &&
    "get" in requestContext &&
    typeof requestContext.get === "function"
  ) {
    return requestContext.get(key);
  }

  if (typeof requestContext === "object") {
    return (requestContext as Record<string, unknown>)[key];
  }

  return undefined;
}

function ensureTrailingSlash(url: string) {
  return url.endsWith("/") ? url : `${url}/`;
}

function parseJson(rawBody: string) {
  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    return rawBody;
  }
}

function summarizeBody(body: unknown) {
  if (typeof body === "string") {
    return body.slice(0, 300);
  }

  return JSON.stringify(body).slice(0, 300);
}
