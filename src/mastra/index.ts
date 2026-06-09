import { Mastra } from "@mastra/core";
import { RedisStore } from "@mastra/redis";

import { projectAgent } from "./agents/projectAgent";

export const mastra = new Mastra({
  storage: new RedisStore({
    id: "llm-to-apps-agent-storage",
    connectionString: process.env.REDIS_URL ?? "redis://localhost:6379",
  }),
  agents: {
    projectAgent,
  },
});
