import { PostgresStore } from "@mastra/pg";

export const agentStorage = new PostgresStore({
  id: "os7-agent-storage",
  connectionString:
    process.env.DATABASE_URL ??
    "postgresql://os7:change-me-platform-password@localhost:8082/os7_platform",
  schemaName: process.env.MASTRA_DATABASE_SCHEMA ?? "mastra",
});
