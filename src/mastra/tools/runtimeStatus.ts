import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import { defaultUserAgentModel } from "../model";

export const runtimeStatusTool = createTool({
  id: "runtime-status",
  description: "Returns the configured agent runtime status and connected service URLs.",
  inputSchema: z.object({}),
  outputSchema: z.object({
    ok: z.boolean(),
    model: z.string(),
    managerUrl: z.string(),
  }),
  execute: async () => {
    console.info("[project-agent] runtime status requested", {
      model: defaultUserAgentModel,
      hasOpenRouterKey: Boolean(process.env.OPENROUTER_API_KEY),
      managerUrl: process.env.MANAGER_URL ?? "http://manager",
    });

    return {
      ok: true,
      model: defaultUserAgentModel,
      managerUrl: process.env.MANAGER_URL ?? "http://manager",
    };
  },
});
