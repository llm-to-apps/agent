import { Mastra } from "@mastra/core";

import { projectAgent } from "./agents/projectAgent";

export const mastra = new Mastra({
  agents: {
    projectAgent,
  },
});
