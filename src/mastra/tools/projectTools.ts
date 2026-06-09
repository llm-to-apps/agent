import { createTool } from "@mastra/core/tools";
import { z } from "zod";

type ToolExecutionContext = {
  requestContext?: unknown;
};

type AgentToolsFetchOptions = {
  method?: "GET" | "POST";
  path: string;
  query?: Record<string, string | number | undefined>;
  requestBody?: unknown;
  okStatuses?: number[];
  context: ToolExecutionContext;
};

type AppMcpFetchOptions = {
  context: ToolExecutionContext;
  method?: string;
  params?: Record<string, unknown>;
};

export const listProjectFilesTool = createTool({
  id: "listProjectFiles",
  description:
    "List files and directories in the current project through the project's agent-tools endpoint.",
  inputSchema: z.object({
    path: z.string().optional().default("."),
    maxDepth: z.coerce.number().int().min(0).max(8).optional().default(2),
  }),
  outputSchema: z.any(),
  toModelOutput: (output) => formatAgentToolsResult("listProjectFiles", output),
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
    "Read a file or a line range from the current project through the project's agent-tools endpoint.",
  inputSchema: z.object({
    path: z.string().min(1),
    startLine: z.coerce.number().int().min(1).optional(),
    endLine: z.coerce.number().int().min(1).optional(),
  }),
  outputSchema: z.any(),
  toModelOutput: (output) => formatAgentToolsResult("readProjectFile", output),
  execute: async ({ endLine, path, startLine }, context) => {
    return agentToolsFetch({
      context: context ?? {},
      path: "/files/read",
      okStatuses: [404],
      query: { path, startLine, endLine },
    });
  },
});

export const getProjectAppLogsTool = createTool({
  id: "getProjectAppLogs",
  description:
    "Return application logs from the current project container through the project's agent-tools endpoint.",
  inputSchema: z.object({
    tail: z.coerce.number().int().min(1).max(1000).optional().default(200),
  }),
  outputSchema: z.any(),
  toModelOutput: (output) => formatAgentToolsResult("getProjectAppLogs", output),
  execute: async ({ tail }, context) => {
    return agentToolsFetch({
      context: context ?? {},
      path: "/app/logs",
      query: { tail },
    });
  },
});

export const getProjectAppStatusTool = createTool({
  id: "getProjectAppStatus",
  description:
    "Return the supervised application process status from the current project's agent-tools endpoint.",
  inputSchema: z.object({}),
  outputSchema: z.any(),
  toModelOutput: (output) => formatAgentToolsResult("getProjectAppStatus", output),
  execute: async (_input, context) => {
    return agentToolsFetch({
      context: context ?? {},
      path: "/app/status",
    });
  },
});

export const restartProjectAppTool = createTool({
  id: "restartProjectApp",
  description:
    "Restart the supervised application process in the current project container. Use this after code or dependency changes when the dev server needs to reload.",
  inputSchema: z.object({}),
  outputSchema: z.any(),
  toModelOutput: (output) => formatAgentToolsResult("restartProjectApp", output),
  execute: async (_input, context) => {
    return agentToolsFetch({
      method: "POST",
      context: context ?? {},
      path: "/app/restart",
    });
  },
});

export const searchProjectFilesTool = createTool({
  id: "searchProjectFiles",
  description:
    "Search file contents in the current project through the project's agent-tools endpoint.",
  inputSchema: z.object({
    query: z.string().min(1),
    path: z.string().optional().default("."),
  }),
  outputSchema: z.any(),
  toModelOutput: (output) => formatAgentToolsResult("searchProjectFiles", output),
  execute: async ({ path, query }, context) => {
    return agentToolsFetch({
      method: "POST",
      context: context ?? {},
      path: "/shell/run",
      okStatuses: [200, 400],
      requestBody: {
        command: "sh",
        args: [
          "-lc",
          [
            'find "$SEARCH_PATH" -type f',
            '! -path "*/.git/*"',
            '! -path "*/node_modules/*"',
            '! -path "*/.next/*"',
            '! -path "*/dist/*"',
            '! -path "*/build/*"',
            '-print0',
            '| xargs -0 grep -n -F "$SEARCH_QUERY"',
            "| head -n 200",
          ].join(" "),
        ],
        env: {
          SEARCH_PATH: path,
          SEARCH_QUERY: query,
        },
        timeoutSeconds: 60,
      },
    });
  },
});

export const writeProjectFileTool = createTool({
  id: "writeProjectFile",
  description:
    "Write a complete file in the current project through the project's agent-tools endpoint.",
  inputSchema: z.object({
    path: z.string().min(1),
    content: z.string(),
    append: z.boolean().optional().default(false),
  }),
  outputSchema: z.any(),
  toModelOutput: (output) => formatAgentToolsResult("writeProjectFile", output),
  execute: async ({ append, content, path }, context) => {
    return agentToolsFetch({
      method: "POST",
      context: context ?? {},
      path: "/files/write",
      requestBody: { path, content, append },
    });
  },
});

export const replaceTextInFileTool = createTool({
  id: "replaceTextInFile",
  description:
    "Replace exact text in one project file. Prefer this for renames and simple copy changes instead of patchProjectFiles or writeProjectFile.",
  inputSchema: z.object({
    path: z.string().min(1),
    search: z.string().min(1),
    replace: z.string(),
    expectedReplacements: z.coerce.number().int().min(1).optional(),
  }),
  outputSchema: z.any(),
  toModelOutput: (output) => formatAgentToolsResult("replaceTextInFile", output),
  execute: async ({ expectedReplacements, path, replace, search }, context) => {
    return agentToolsFetch({
      method: "POST",
      context: context ?? {},
      path: "/files/replace-text",
      requestBody: { path, search, replace, expectedReplacements },
    });
  },
});

export const patchProjectFilesTool = createTool({
  id: "patchProjectFiles",
  description:
    "Apply a high-confidence unified diff patch to files in the current project. If this fails, read the file and use writeProjectFile instead of retrying another patch.",
  inputSchema: z.object({
    patch: z.string().min(1),
  }),
  outputSchema: z.any(),
  toModelOutput: (output) => formatAgentToolsResult("patchProjectFiles", output),
  execute: async ({ patch }, context) => {
    return agentToolsFetch({
      method: "POST",
      context: context ?? {},
      path: "/files/patch",
      requestBody: { patch },
    });
  },
});

export const runProjectCommandTool = createTool({
  id: "runProjectCommand",
  description:
    "Run a verification or user-requested shell command in the current project container. Do not use this for source search; use searchProjectFiles instead. Omit cwd or use a relative cwd such as '.'. Absolute cwd values are rejected by agent-tools.",
  inputSchema: z.object({
    command: z.string().min(1),
    cwd: z.string().optional().default("."),
    timeoutSeconds: z.coerce.number().int().min(1).max(300).optional().default(60),
  }),
  outputSchema: z.any(),
  toModelOutput: (output) => formatAgentToolsResult("runProjectCommand", output),
  execute: async ({ command, cwd, timeoutSeconds }, context) => {
    return agentToolsFetch({
      method: "POST",
      context: context ?? {},
      path: "/shell/run",
      okStatuses: [200, 400],
      requestBody: { command, cwd, timeoutSeconds },
    });
  },
});

export const getProjectGitStatusTool = createTool({
  id: "getProjectGitStatus",
  description:
    "Return git status for the current project through the project's agent-tools endpoint.",
  inputSchema: z.object({}),
  outputSchema: z.any(),
  toModelOutput: (output) => formatAgentToolsResult("getProjectGitStatus", output),
  execute: async (_input, context) => {
    return agentToolsFetch({
      context: context ?? {},
      path: "/git/status",
    });
  },
});

export const getProjectDiffTool = createTool({
  id: "getProjectDiff",
  description:
    "Return the current git diff for the project after edits. Use this to verify what changed before summarizing.",
  inputSchema: z.object({}),
  outputSchema: z.any(),
  toModelOutput: (output) => formatAgentToolsResult("getProjectDiff", output),
  execute: async (_input, context) => {
    return agentToolsFetch({
      context: context ?? {},
      path: "/git/diff",
    });
  },
});

export const listAppMcpToolsTool = createTool({
  id: "listAppMcpTools",
  description:
    "List product/runtime MCP tools exposed by the current application backend. Use this for app data operations, not code changes.",
  inputSchema: z.object({}),
  outputSchema: z.any(),
  toModelOutput: (output) => formatAgentToolsResult("listAppMcpTools", output),
  execute: async (_input, context) => {
    return appMcpFetch({
      context: context ?? {},
      method: "tools/list",
    });
  },
});

export const callAppMcpToolTool = createTool({
  id: "callAppMcpTool",
  description:
    "Call one product/runtime MCP tool exposed by the current application backend. Use this for business actions such as adding Money categories or transactions.",
  inputSchema: z.object({
    name: z.string().min(1),
    arguments: z.record(z.string(), z.unknown()).optional().default({}),
  }),
  outputSchema: z.any(),
  toModelOutput: (output) => formatAgentToolsResult("callAppMcpTool", output),
  execute: async ({ arguments: toolArguments, name }, context) => {
    return appMcpFetch({
      context: context ?? {},
      method: "tools/call",
      params: {
        name,
        arguments: toolArguments,
      },
    });
  },
});

async function agentToolsFetch({
  context,
  method = "GET",
  okStatuses,
  path,
  query,
  requestBody,
}: AgentToolsFetchOptions) {
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
    method,
    path,
    hasToken,
    query,
  });
  logAgentToolsDebug("[project-agent] agent-tools request payload", {
    projectId,
    method,
    path,
    query,
    requestBody,
  });

  const response = await fetch(url, {
    method,
    headers: {
      ...(hasToken ? { Authorization: `Bearer ${token}` } : {}),
      ...(requestBody === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: requestBody === undefined ? undefined : JSON.stringify(requestBody),
  });
  const rawBody = await response.text();
  const responseBody = parseJson(rawBody);
  const durationMs = Date.now() - startedAt;

  console.info("[project-agent] agent-tools response", {
    projectId,
    path,
    status: response.status,
    ok: response.ok,
    durationMs,
  });
  logAgentToolsDebug("[project-agent] agent-tools response payload", {
    projectId,
    path,
    status: response.status,
    ok: response.ok,
    durationMs,
    responseBody,
    rawBody,
  });

  const isExpectedStatus = response.ok || okStatuses?.includes(response.status);

  if (!isExpectedStatus) {
    throw new Error(
      `Project tools request failed with ${response.status}: ${summarizeBody(responseBody)}`,
    );
  }

  return responseBody;
}

async function appMcpFetch({ context, method = "tools/list", params }: AppMcpFetchOptions) {
  const startedAt = Date.now();
  const appMcpUrl = readRequestContextValue(context, "appMcpUrl");
  const token = readRequestContextValue(context, "appMcpToken");
  const projectId = readRequestContextValue(context, "projectId");

  if (typeof appMcpUrl !== "string" || !appMcpUrl) {
    console.warn("[project-agent] missing app mcp url", { projectId });
    throw new Error("Application MCP URL is missing from request context.");
  }

  const hasToken = typeof token === "string" && token.length > 0;

  console.info("[project-agent] app-mcp request", {
    projectId,
    method,
    hasToken,
    params,
  });
  logAgentToolsDebug("[project-agent] app-mcp request payload", {
    projectId,
    method,
    params,
  });

  const response = await fetch(appMcpUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(hasToken ? { Authorization: `Bearer ${token}` } : {}),
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

  console.info("[project-agent] app-mcp response", {
    projectId,
    method,
    status: response.status,
    ok: response.ok,
    durationMs,
  });
  logAgentToolsDebug("[project-agent] app-mcp response payload", {
    projectId,
    method,
    status: response.status,
    ok: response.ok,
    durationMs,
    responseBody,
    rawBody,
  });

  if (!response.ok) {
    throw new Error(
      `Application MCP request failed with ${response.status}: ${summarizeBody(responseBody)}`,
    );
  }

  if (
    isObjectRecord(responseBody) &&
    isObjectRecord(responseBody.error) &&
    typeof responseBody.error.message === "string"
  ) {
    throw new Error(`Application MCP tool failed: ${responseBody.error.message}`);
  }

  return isObjectRecord(responseBody) && "result" in responseBody
    ? responseBody.result
    : responseBody;
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

function logAgentToolsDebug(message: string, payload: unknown) {
  if (!isDebugLoggingEnabled()) {
    return;
  }

  console.info(message, JSON.stringify(payload, null, 2));
}

function isDebugLoggingEnabled() {
  return process.env.AGENT_TOOLS_DEBUG === "true" || process.env.DEBUG === "true";
}

function formatAgentToolsResult(toolName: string, result: unknown) {
  const text = formatAgentToolsResultText(toolName, result);

  return {
    type: "text" as const,
    value: text,
  };
}

function formatAgentToolsResultText(toolName: string, result: unknown) {
  if (toolName === "listProjectFiles" && isFileTreeResult(result)) {
    return [
      `Files (${result.entries.length}):`,
      ...result.entries.map((entry) => {
        const suffix = entry.type === "dir" ? "/" : "";
        return `- ${entry.path}${suffix}`;
      }),
    ].join("\n");
  }

  if (toolName === "readProjectFile" && isReadFileResult(result)) {
    const range =
      typeof result.startLine === "number" && typeof result.endLine === "number"
        ? `:${result.startLine}-${result.endLine}`
        : "";
    return [`${result.path}${range}:`, "```", result.content, "```"].join("\n");
  }

  if (
    toolName === "readProjectFile" &&
    isObjectRecord(result) &&
    typeof result.error === "string"
  ) {
    return `File could not be read: ${result.error}`;
  }

  if (toolName === "getProjectAppLogs" && isObjectRecord(result)) {
    const logs = result.logs ?? result.content ?? result.stdout;

    if (typeof logs === "string") {
      return logs.trim() || "No application logs returned.";
    }
  }

  if (
    (toolName === "getProjectAppStatus" || toolName === "restartProjectApp") &&
    isObjectRecord(result)
  ) {
    return [
      `running: ${String(result.running ?? false)}`,
      `pid: ${String(result.pid ?? 0)}`,
      typeof result.supervisorEnabled === "boolean"
        ? `supervisorEnabled: ${String(result.supervisorEnabled)}`
        : "",
      typeof result.restartCount === "number" ? `restartCount: ${result.restartCount}` : "",
      typeof result.maxRestarts === "number" ? `maxRestarts: ${result.maxRestarts}` : "",
      typeof result.command === "string" ? `command: ${result.command}` : "",
      typeof result.started === "string" ? `started: ${result.started}` : "",
      typeof result.lastExit === "string" ? `lastExit: ${result.lastExit}` : "",
      typeof result.lastExitError === "string" && result.lastExitError
        ? `lastExitError: ${result.lastExitError}`
        : "",
      typeof result.logPath === "string" ? `logPath: ${result.logPath}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (toolName === "searchProjectFiles" && isCommandResult(result)) {
    if (result.exitCode === 1 || !result.stdout.trim()) {
      return "No matches found.";
    }

    return result.stdout.trim();
  }

  if (
    (toolName === "runProjectCommand" ||
      toolName === "patchProjectFiles" ||
      toolName === "getProjectDiff" ||
      toolName === "getProjectGitStatus") &&
    isCommandResult(result)
  ) {
    return [
      `Command: ${result.command}`,
      `Exit code: ${result.exitCode}`,
      result.stdout.trim() ? `stdout:\n${result.stdout.trim()}` : "",
      result.stderr.trim() ? `stderr:\n${result.stderr.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (toolName === "writeProjectFile" && isObjectRecord(result) && typeof result.path === "string") {
    return `Wrote ${result.path}.`;
  }

  if (
    toolName === "replaceTextInFile" &&
    isObjectRecord(result) &&
    typeof result.path === "string"
  ) {
    const replacements =
      typeof result.replacements === "number" ? ` (${result.replacements} replacements)` : "";
    return `Updated ${result.path}${replacements}.`;
  }

  if (toolName === "listAppMcpTools" && isObjectRecord(result) && Array.isArray(result.tools)) {
    const toolNames = result.tools
      .map((tool) => (isObjectRecord(tool) && typeof tool.name === "string" ? tool.name : ""))
      .filter(Boolean);

    return [
      `Application MCP tools (${result.tools.length}):`,
      ...result.tools.map((tool) => {
        if (isObjectRecord(tool) && typeof tool.name === "string") {
          const description = typeof tool.description === "string" ? ` - ${tool.description}` : "";
          return `- ${tool.name}${description}`;
        }

        return `- ${JSON.stringify(tool)}`;
      }),
      "",
      `Available tool names: ${toolNames.length > 0 ? toolNames.join(", ") : "none"}`,
      "Do not call listAppMcpTools again for this request. If none of these tools matches the requested application data action, answer that the application MCP capability is missing.",
    ].join("\n");
  }

  if (toolName === "callAppMcpTool") {
    return JSON.stringify(result, null, 2);
  }

  return JSON.stringify(result, null, 2);
}

function isFileTreeResult(result: unknown): result is {
  entries: Array<{ path: string; type: "file" | "dir" }>;
} {
  return (
    isObjectRecord(result) &&
    Array.isArray(result.entries) &&
    result.entries.every(
      (entry) =>
        isObjectRecord(entry) &&
        typeof entry.path === "string" &&
        (entry.type === "file" || entry.type === "dir"),
    )
  );
}

function isReadFileResult(result: unknown): result is {
  path: string;
  content: string;
  startLine?: number;
  endLine?: number;
} {
  return (
    isObjectRecord(result) &&
    typeof result.path === "string" &&
    typeof result.content === "string"
  );
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isCommandResult(result: unknown): result is {
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
} {
  return (
    isObjectRecord(result) &&
    typeof result.command === "string" &&
    typeof result.exitCode === "number" &&
    typeof result.stdout === "string" &&
    typeof result.stderr === "string"
  );
}
