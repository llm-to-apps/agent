import { Mastra } from "@mastra/core";
import { PostgresStore } from "@mastra/pg";

import { projectAgent } from "./agents/projectAgent";

export const mastra = new Mastra({
  storage: new PostgresStore({
    id: "llm-to-apps-agent-storage",
    connectionString: process.env.DATABASE_URL ?? "postgresql://llagents:llagents@localhost:5432/llagents_platform",
  }),
  agents: {
    projectAgent,
  },
});
