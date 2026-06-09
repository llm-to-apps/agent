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
    "Read a file from the current project through the project's agent-tools endpoint.",
  inputSchema: z.object({
    path: z.string().min(1),
  }),
  outputSchema: z.any(),
  toModelOutput: (output) => formatAgentToolsResult("readProjectFile", output),
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

export const patchProjectFilesTool = createTool({
  id: "patchProjectFiles",
  description:
    "Apply a unified diff patch to files in the current project through the project's agent-tools endpoint.",
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
    "Run a shell command in the current project container through the project's agent-tools endpoint.",
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

  const isExpectedStatus = response.ok || okStatuses?.includes(response.status);

  if (!isExpectedStatus) {
    throw new Error(
      `Project tools request failed with ${response.status}: ${summarizeBody(responseBody)}`,
    );
  }

  return responseBody;
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
    return [`${result.path}:`, "```", result.content, "```"].join("\n");
  }

  if (toolName === "getProjectAppLogs" && isObjectRecord(result)) {
    const logs = result.logs ?? result.content ?? result.stdout;

    if (typeof logs === "string") {
      return logs.trim() || "No application logs returned.";
    }
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

function isReadFileResult(result: unknown): result is { path: string; content: string } {
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
