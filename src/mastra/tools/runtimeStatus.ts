import { createTool } from "@mastra/core/tools";
import { z } from "zod";

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
    return {
      ok: true,
      model: process.env.AGENT_MODEL ?? "gpt-4o-mini",
      managerUrl: process.env.MANAGER_URL ?? "http://manager:8080",
    };
  },
});
