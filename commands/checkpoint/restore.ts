import Agent from "@tokenring-ai/agent/Agent";
import {CommandFailedError} from "@tokenring-ai/agent/AgentError";
import AgentCheckpointService from "../../AgentCheckpointService.ts";

export async function restore(remainder: string, agent: Agent): Promise<string> {
  if (!remainder) {
    throw new CommandFailedError("Usage: /checkpoint restore <id> (see /checkpoint list for ids)");
  }
  await agent.requireServiceByType(AgentCheckpointService).restoreAgentCheckpoint(remainder, agent);
  return `Checkpoint ${remainder} loaded`;
}