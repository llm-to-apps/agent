import { createTool } from "@mastra/core/tools";
import { z } from "zod";

type ToolExecutionContext = {
  requestContext?: unknown;
};

type PersonalMcpFetchOptions = {
  context: ToolExecutionContext;
  method?: string;
  params?: Record<string, unknown>;
};

export const listPersonalAppsTool = createTool({
  id: "listPersonalApps",
  description:
    "List apps available to the current OS7 user through their Personal OS MCP.",
  inputSchema: z.object({}),
  outputSchema: z.any(),
  toModelOutput: (output) =>
    formatPersonalMcpResult("listPersonalApps", output),
  execute: async (_input, context) => {
    return personalMcpFetch({
      context: context ?? {},
      method: "tools/call",
      params: {
        name: "list_apps",
        arguments: {},
      },
    });
  },
});

export const getPersonalUsageSummaryTool = createTool({
  id: "getPersonalUsageSummary",
  description: "Return total agent token usage for the current OS7 user.",
  inputSchema: z.object({}),
  outputSchema: z.any(),
  toModelOutput: (output) =>
    formatPersonalMcpResult("getPersonalUsageSummary", output),
  execute: async (_input, context) => {
    return personalMcpFetch({
      context: context ?? {},
      method: "tools/call",
      params: {
        name: "get_usage_summary",
        arguments: {},
      },
    });
  },
});

export const searchAppsTool = createTool({
  id: "searchApps",
  description:
    "Search OS7 app templates by user intent, category, or free-text query before offering app installation.",
  inputSchema: z.object({
    query: z.string().optional(),
    category: z.string().optional(),
    intent: z.string().optional(),
  }),
  outputSchema: z.any(),
  toModelOutput: (output) => formatPersonalMcpResult("searchApps", output),
  execute: async ({ category, intent, query }, context) => {
    return personalMcpFetch({
      context: context ?? {},
      method: "tools/call",
      params: {
        name: "apps_search",
        arguments: {
          category,
          intent,
          query,
        },
      },
    });
  },
});

export const getAppTool = createTool({
  id: "getApp",
  description: "Get one OS7 app template from the catalog by app id.",
  inputSchema: z.object({
    appId: z.string().min(1),
  }),
  outputSchema: z.any(),
  toModelOutput: (output) => formatPersonalMcpResult("getApp", output),
  execute: async ({ appId }, context) => {
    return personalMcpFetch({
      context: context ?? {},
      method: "tools/call",
      params: {
        name: "apps_get",
        arguments: {
          appId,
        },
      },
    });
  },
});

export const requestInstallAppTool = createTool({
  id: "requestInstallApp",
  description:
    "Request installation of an OS7 app template for the current user. Use after the user agrees to install the app.",
  inputSchema: z.object({
    appId: z.string().min(1),
    reason: z.string().optional(),
  }),
  outputSchema: z.any(),
  toModelOutput: (output) =>
    formatPersonalMcpResult("requestInstallApp", output),
  execute: async ({ appId, reason }, context) => {
    return personalMcpFetch({
      context: context ?? {},
      method: "tools/call",
      params: {
        name: "apps_request_install",
        arguments: {
          appId,
          reason,
        },
      },
    });
  },
});

export const listInstalledAppsTool = createTool({
  id: "listInstalledApps",
  description: "List applications already installed for the current OS7 user.",
  inputSchema: z.object({}),
  outputSchema: z.any(),
  toModelOutput: (output) =>
    formatPersonalMcpResult("listInstalledApps", output),
  execute: async (_input, context) => {
    return personalMcpFetch({
      context: context ?? {},
      method: "tools/call",
      params: {
        name: "apps_list_installed",
        arguments: {},
      },
    });
  },
});

export const getInstallStatusTool = createTool({
  id: "getInstallStatus",
  description:
    "Check app installation/deployment status by installed app id or app template id.",
  inputSchema: z.object({
    appId: z.string().min(1),
  }),
  outputSchema: z.any(),
  toModelOutput: (output) =>
    formatPersonalMcpResult("getInstallStatus", output),
  execute: async ({ appId }, context) => {
    return personalMcpFetch({
      context: context ?? {},
      method: "tools/call",
      params: {
        name: "apps_get_install_status",
        arguments: {
          appId,
        },
      },
    });
  },
});

export const searchUploadedFilesTool = createTool({
  id: "searchUploadedFiles",
  description:
    "Search files attached to the current user message for relevant passages before answering document-related questions.",
  inputSchema: z.object({
    query: z.string().min(1),
  }),
  outputSchema: z.any(),
  toModelOutput: (output) =>
    formatPersonalMcpResult("searchUploadedFiles", output),
  execute: async ({ query }, context) => {
    const attachedFileIds = readRequestContextStringArray(
      context ?? {},
      "attachedFileIds",
    );

    return personalMcpFetch({
      context: context ?? {},
      method: "tools/call",
      params: {
        name: "search_uploaded_files",
        arguments: {
          attachedFileIds,
          query,
        },
      },
    });
  },
});

export const askAppAgentTool = createTool({
  id: "askAppAgent",
  description:
    "Delegate a task to one OS7 app agent in Use mode through Personal OS MCP. This cannot modify app code or run Dev mode.",
  inputSchema: z.object({
    appId: z.string().min(1),
    appName: z
      .string()
      .min(1)
      .describe("Human-readable app name for UI progress display."),
    message: z.string().min(1),
  }),
  outputSchema: z.any(),
  toModelOutput: (output) => formatPersonalMcpResult("askAppAgent", output),
  execute: async ({ appId, message }, context) => {
    return personalMcpFetch({
      context: context ?? {},
      method: "tools/call",
      params: {
        name: "ask_app_agent",
        arguments: {
          appId,
          message,
        },
      },
    });
  },
});

async function personalMcpFetch({
  context,
  method = "tools/list",
  params,
}: PersonalMcpFetchOptions) {
  const startedAt = Date.now();
  const personalMcpUrl = readRequestContextValue(context, "personalMcpUrl");
  const token = readRequestContextValue(context, "personalMcpToken");
  const requestId = readRequestContextValue(context, "requestId");
  const userId = readRequestContextValue(context, "userId");

  if (typeof personalMcpUrl !== "string" || !personalMcpUrl) {
    console.warn("[user-agent] missing personal mcp url", {
      requestId,
      userId,
    });
    throw new Error("Personal OS MCP URL is missing from request context.");
  }

  const hasToken = typeof token === "string" && token.length > 0;
  if (!hasToken) {
    console.warn("[user-agent] missing personal mcp token", {
      requestId,
      userId,
    });
    throw new Error("Personal OS MCP token is missing from request context.");
  }

  console.info("[user-agent] personal-mcp request", {
    requestId,
    userId,
    method,
    hasToken,
    params,
  });

  const response = await fetch(personalMcpUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: crypto.randomUUID(),
      method,
      params,
    }),
  });
  const rawBody = await response.text();
  const responseBody = parseJson(rawBody);
  const durationMs = Date.now() - startedAt;

  console.info("[user-agent] personal-mcp response", {
    requestId,
    userId,
    method,
    status: response.status,
    ok: response.ok,
    durationMs,
  });
  console.info("[user-agent] personal-mcp response payload", {
    requestId,
    userId,
    method,
  });
  console.info(JSON.stringify(responseBody, null, 2));

  if (!response.ok) {
    throw new Error(
      `Personal OS MCP request failed with ${response.status}: ${summarizeBody(responseBody)}`,
    );
  }

  if (
    isObjectRecord(responseBody) &&
    isObjectRecord(responseBody.error) &&
    typeof responseBody.error.message === "string"
  ) {
    throw new Error(
      `Personal OS MCP tool failed: ${responseBody.error.message}`,
    );
  }

  return isObjectRecord(responseBody) && "result" in responseBody
    ? unwrapMcpToolResult(responseBody.result)
    : responseBody;
}

function unwrapMcpToolResult(result: unknown) {
  if (isObjectRecord(result) && "structuredContent" in result) {
    return result.structuredContent;
  }

  return result;
}

function formatPersonalMcpResult(toolName: string, result: unknown) {
  const text = formatPersonalMcpResultText(toolName, result);

  return {
    type: "text" as const,
    value: text,
  };
}

function formatPersonalMcpResultText(toolName: string, result: unknown) {
  if (
    toolName === "listPersonalApps" &&
    isObjectRecord(result) &&
    Array.isArray(result.apps)
  ) {
    if (result.apps.length === 0) {
      return "I see no installed apps for this user.";
    }

    return [
      `I see these installed apps (${result.apps.length}):`,
      ...result.apps.map((app) =>
        isObjectRecord(app)
          ? `- ${String(app.templateName ?? app.id)} (${String(app.id)}): ${String(app.status ?? "unknown")}`
          : `- ${String(app)}`,
      ),
    ].join("\n");
  }

  return typeof result === "string" ? result : JSON.stringify(result, null, 2);
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

function readRequestContextStringArray(
  context: ToolExecutionContext,
  key: string,
) {
  const value = readRequestContextValue(context, key);

  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
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

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
