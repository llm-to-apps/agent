import { type Memory } from "@mastra/memory";

import { projectMemory } from "./agents/projectAgent";
import { userMemory } from "./agents/userAgent";

type AgentMemoryId = "projectDevAgent" | "projectUseAgent" | "userAgent";

type DeleteMemoryThreadInput = {
  agentId: AgentMemoryId;
  resourceId?: string;
  threadId: string;
};

export async function deleteMemoryThread({
  agentId,
  resourceId,
  threadId,
}: DeleteMemoryThreadInput) {
  const memory = getAgentMemory(agentId);
  const thread = await memory.getThreadById({ resourceId, threadId });

  if (!thread) {
    return {
      deleted: false,
      found: false,
    };
  }

  await memory.deleteThread(threadId);

  return {
    deleted: true,
    found: true,
  };
}

function getAgentMemory(agentId: AgentMemoryId): Memory {
  if (agentId === "userAgent") {
    return userMemory;
  }

  return projectMemory;
}
