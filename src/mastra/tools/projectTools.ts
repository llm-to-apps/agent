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

type PersonalMcpFetchOptions = {
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
    process: z.enum(["prod", "dev"]).optional().default("prod"),
  }),
  outputSchema: z.any(),
  toModelOutput: (output) => formatAgentToolsResult("getProjectAppLogs", output),
  execute: async ({ process, tail }, context) => {
    return agentToolsFetch({
      context: context ?? {},
      path: "/app/logs",
      query: { process, tail },
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

export const startProjectDevServerTool = createTool({
  id: "startProjectDevServer",
  description:
    "Start the supervised dev server in the current project container without stopping the production server.",
  inputSchema: z.object({}),
  outputSchema: z.any(),
  toModelOutput: (output) => formatAgentToolsResult("startProjectDevServer", output),
  execute: async (_input, context) => {
    return agentToolsFetch({
      method: "POST",
      context: context ?? {},
      path: "/app/dev/start",
    });
  },
});

export const stopProjectDevServerTool = createTool({
  id: "stopProjectDevServer",
  description: "Stop the supervised dev server in the current project container.",
  inputSchema: z.object({}),
  outputSchema: z.any(),
  toModelOutput: (output) => formatAgentToolsResult("stopProjectDevServer", output),
  execute: async (_input, context) => {
    return agentToolsFetch({
      method: "POST",
      context: context ?? {},
      path: "/app/dev/stop",
    });
  },
});

export const restartProjectProdServerTool = createTool({
  id: "restartProjectProdServer",
  description:
    "Restart the supervised production server in the current project container. Use after a successful production build.",
  inputSchema: z.object({}),
  outputSchema: z.any(),
  toModelOutput: (output) => formatAgentToolsResult("restartProjectProdServer", output),
  execute: async (_input, context) => {
    return agentToolsFetch({
      method: "POST",
      context: context ?? {},
      path: "/app/prod/restart",
    });
  },
});

export const buildProjectAppTool = createTool({
  id: "buildProjectApp",
  description:
    "Run the configured application build command through agent-tools. This does not switch the running app process to production mode.",
  inputSchema: z.object({
    timeoutSeconds: z.coerce.number().int().min(1).max(1800).optional(),
  }),
  outputSchema: z.any(),
  toModelOutput: (output) => formatAgentToolsResult("buildProjectApp", output),
  execute: async ({ timeoutSeconds }, context) => {
    return agentToolsFetch({
      method: "POST",
      context: context ?? {},
      path: "/app/build",
      okStatuses: [400],
      requestBody: { timeoutSeconds },
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

export const saveProjectChangesTool = createTool({
  id: "saveProjectChanges",
  description:
    "Commit all current project file changes with the provided message and push them to the project's Git remote. Use this after successful edits when the user wants changes saved or published.",
  inputSchema: z.object({
    message: z.string().min(1),
  }),
  outputSchema: z.any(),
  toModelOutput: (output) => formatAgentToolsResult("saveProjectChanges", output),
  execute: async ({ message }, context) => {
    return agentToolsFetch({
      method: "POST",
      context: context ?? {},
      path: "/git/save",
      okStatuses: [200, 400],
      requestBody: { message },
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

export const generateSandboxedUiTool = createTool({
  id: "generateSandboxedUi",
  description:
    "Create an OS7 canvas and write a complete sandboxed HTML/CSS/JS document into it. Use this when the user needs a generated interface, not just chat text. If the UI displays app data, retrieve the data first with the relevant tools and embed that data in the HTML as initial JSON state.",
  inputSchema: z.object({
    title: z.string().min(1).max(160),
    mode: z
      .enum(["static", "dataSnapshot", "interactive"])
      .optional()
      .default("static")
      .describe(
        "static for UI without app data, dataSnapshot for UI with retrieved app data, interactive for UI that declares host actions.",
      ),
    prompt: z
      .string()
      .min(1)
      .max(4000)
      .describe("Short description of what this generated interface is for."),
    dataSources: z
      .array(
        z.object({
          name: z.string().min(1).max(120),
          source: z.enum(["appMcp", "uploadedFiles", "agentContext"]),
          tool: z.string().min(1).max(160).optional(),
          input: z.unknown().optional(),
          data: z.unknown(),
        }),
      )
      .optional()
      .default([])
      .describe(
        "Data snapshots used by the canvas. For app data UIs, include the actual retrieved data and also embed it into the HTML.",
      ),
    actions: z
      .array(
        z.object({
          name: z.string().min(1).max(160),
          description: z.string().min(1).max(500),
          inputSchema: z.unknown().optional(),
        }),
      )
      .optional()
      .default([])
      .describe(
        "Host actions the iframe UI intends to request later via postMessage. Declare only actions the app can support.",
      ),
    html: z
      .string()
      .min(1)
      .max(200_000)
      .describe(
        "A complete iframe-ready HTML document with inline CSS and JavaScript. Include doctype, html, head, style, body, and script when useful. External scripts and styles are allowed only from the canvas runtime CSP allowlist. Prefer Tailwind CSS via https://cdn.tailwindcss.com for polished styling, Vue 3 global build via unpkg/jsdelivr for interactive state, and Chart.js via jsdelivr for charts. Default to a light, neutral, operational UI unless the user explicitly asks for dark mode. Do not output .vue files, JSX, TypeScript, npm installs, Vite configs, import maps, or build steps. For dataSnapshot or interactive mode, embed dataSources as initial JSON state inside the document before creating the UI.",
      ),
  }),
  outputSchema: z.any(),
  toModelOutput: (output) => formatAgentToolsResult("generateSandboxedUi", output),
  execute: async ({ actions, dataSources, html, mode, prompt, title }) => {
    return {
      actionCount: actions.length,
      dataSourceCount: dataSources.length,
      htmlLength: html.length,
      mode,
      prompt,
      title,
      message:
        "Generated UI tool call accepted. The host runtime will create and persist the canvas.",
    };
  },
});

export const searchUploadedProjectFilesTool = createTool({
  id: "searchUploadedProjectFiles",
  description:
    "Search files attached to the current project chat message for relevant passages before answering document-related questions.",
  inputSchema: z.object({
    query: z.string().min(1),
  }),
  outputSchema: z.any(),
  toModelOutput: (output) =>
    formatAgentToolsResult("searchUploadedProjectFiles", output),
  execute: async ({ query }, context) => {
    const attachedFileIds = readRequestContextStringArray(
      context ?? {},
      "attachedFileIds",
    );
    const projectId = readRequestContextValue(context ?? {}, "projectId");

    return personalMcpFetch({
      context: context ?? {},
      method: "tools/call",
      params: {
        name: "search_uploaded_files",
        arguments: {
          attachedFileIds,
          projectId,
          query,
          scope: "project_agent",
        },
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
  const requestId = readRequestContextValue(context, "requestId");

  if (typeof toolsUrl !== "string" || !toolsUrl) {
    console.warn("[project-agent] missing project tools url", { projectId, requestId });
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
    requestId,
    projectId,
    method,
    path,
    hasToken,
    query,
  });
  logAgentToolsDebug("[project-agent] agent-tools request payload", {
    requestId,
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
    requestId,
    projectId,
    path,
    status: response.status,
    ok: response.ok,
    durationMs,
  });
  logAgentToolsDebug("[project-agent] agent-tools response payload", {
    requestId,
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
  const token = readRequestContextValue(context, "projectUserToken");
  const projectId = readRequestContextValue(context, "projectId");
  const requestId = readRequestContextValue(context, "requestId");

  if (typeof appMcpUrl !== "string" || !appMcpUrl) {
    console.warn("[project-agent] missing app mcp url", { projectId, requestId });
    throw new Error("Application MCP URL is missing from request context.");
  }

  const hasToken = typeof token === "string" && token.length > 0;

  console.info("[project-agent] app-mcp request", {
    requestId,
    projectId,
    method,
    hasToken,
    params,
  });
  logAgentToolsDebug("[project-agent] app-mcp request payload", {
    requestId,
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
    requestId,
    projectId,
    method,
    status: response.status,
    ok: response.ok,
    durationMs,
  });
  logAgentToolsDebug("[project-agent] app-mcp response payload", {
    requestId,
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

async function personalMcpFetch({
  context,
  method = "tools/list",
  params,
}: PersonalMcpFetchOptions) {
  const startedAt = Date.now();
  const personalMcpUrl = readRequestContextValue(context, "personalMcpUrl");
  const token = readRequestContextValue(context, "personalMcpToken");
  const projectId = readRequestContextValue(context, "projectId");
  const requestId = readRequestContextValue(context, "requestId");

  if (typeof personalMcpUrl !== "string" || !personalMcpUrl) {
    console.warn("[project-agent] missing personal mcp url", {
      projectId,
      requestId,
    });
    throw new Error("Personal OS MCP URL is missing from request context.");
  }

  const hasToken = typeof token === "string" && token.length > 0;
  if (!hasToken) {
    console.warn("[project-agent] missing personal mcp token", {
      projectId,
      requestId,
    });
    throw new Error("Personal OS MCP token is missing from request context.");
  }

  console.info("[project-agent] personal-mcp request", {
    requestId,
    projectId,
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

  console.info("[project-agent] personal-mcp response", {
    requestId,
    projectId,
    method,
    status: response.status,
    ok: response.ok,
    durationMs,
  });

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
    throw new Error(`Personal OS MCP tool failed: ${responseBody.error.message}`);
  }

  return isObjectRecord(responseBody) && "result" in responseBody
    ? unwrapMcpToolResult(responseBody.result)
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

function unwrapMcpToolResult(result: unknown) {
  if (isObjectRecord(result) && "structuredContent" in result) {
    return result.structuredContent;
  }

  return result;
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
    (toolName === "getProjectAppStatus" ||
      toolName === "startProjectDevServer" ||
      toolName === "stopProjectDevServer" ||
      toolName === "restartProjectProdServer") &&
    isObjectRecord(result)
  ) {
    if (isObjectRecord(result.prod) || isObjectRecord(result.dev)) {
      return ["prod", "dev"]
        .map((name) => {
          const process = result[name];
          if (!isObjectRecord(process)) {
            return "";
          }
          return [
            `${name}:`,
            `running: ${String(process.running ?? false)}`,
            `pid: ${String(process.pid ?? 0)}`,
            typeof process.command === "string" ? `command: ${process.command}` : "",
            typeof process.started === "string" ? `started: ${process.started}` : "",
            typeof process.lastExitError === "string" && process.lastExitError
              ? `lastExitError: ${process.lastExitError}`
              : "",
            typeof process.logPath === "string" ? `logPath: ${process.logPath}` : "",
          ]
            .filter(Boolean)
            .join("\n");
        })
        .filter(Boolean)
        .join("\n\n");
    }

    return [
      `running: ${String(result.running ?? false)}`,
      `pid: ${String(result.pid ?? 0)}`,
      typeof result.command === "string" ? `command: ${result.command}` : "",
      typeof result.started === "string" ? `started: ${result.started}` : "",
      typeof result.lastExitError === "string" && result.lastExitError
        ? `lastExitError: ${result.lastExitError}`
        : "",
      typeof result.logPath === "string" ? `logPath: ${result.logPath}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (toolName === "buildProjectApp" && isCommandResult(result)) {
    return [
      `exitCode: ${result.exitCode}`,
      result.command ? `command: ${result.command}` : "",
      result.stdout.trim() ? `stdout:\n${result.stdout.trim()}` : "",
      result.stderr.trim() ? `stderr:\n${result.stderr.trim()}` : "",
      result.duration ? `duration: ${result.duration}` : "",
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
  duration?: string;
  exitCode: number;
  stdout: string;
  stderr: string;
} {
  return (
    isObjectRecord(result) &&
    typeof result.command === "string" &&
    typeof result.exitCode === "number" &&
    typeof result.stdout === "string" &&
    typeof result.stderr === "string" &&
    (result.duration === undefined || typeof result.duration === "string")
  );
}
