import { Mastra } from "@mastra/core";
import { registerApiRoute } from "@mastra/core/server";

import { projectDevAgent, projectUseAgent } from "./agents/projectAgent";
import { userAgent } from "./agents/userAgent";
import { deleteMemoryThread } from "./memory";
import { agentStorage } from "./storage";

export const mastra = new Mastra({
  server: {
    apiRoutes: [
      registerApiRoute("/internal/agent-memory/delete-thread", {
        method: "POST",
        requiresAuth: false,
        handler: async (c) => {
          const body = (await c.req.json().catch(() => null)) as
            | {
                agentId?: unknown;
                resourceId?: unknown;
                threadId?: unknown;
              }
            | null;

          if (
            !body ||
            (body.agentId !== "projectDevAgent" &&
              body.agentId !== "projectUseAgent" &&
              body.agentId !== "userAgent") ||
            typeof body.threadId !== "string" ||
            (body.resourceId !== undefined && typeof body.resourceId !== "string")
          ) {
            return c.json({ ok: false, message: "Invalid memory delete payload" }, 400);
          }

          let result;

          try {
            result = await deleteMemoryThread({
              agentId: body.agentId,
              resourceId: body.resourceId,
              threadId: body.threadId,
            });
          } catch (error) {
            console.error("[agent-memory] delete-thread failed", {
              agentId: body.agentId,
              resourceId: body.resourceId,
              threadId: body.threadId,
              error,
            });

            return c.json({ ok: false, message: "Agent memory delete failed" }, 500);
          }

          return c.json({ ok: true, ...result });
        },
      }),
    ],
  },
  storage: agentStorage,
  agents: {
    userAgent,
    projectDevAgent,
    projectUseAgent,
  },
});
