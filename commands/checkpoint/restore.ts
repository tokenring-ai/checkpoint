import Agent from "@tokenring-ai/agent/Agent";
import AgentCheckpointService from "../../AgentCheckpointService.ts";

export async function restore(remainder: string, agent: Agent) {
  if (!remainder) {
    agent.errorMessage("Usage: /checkpoint restore <id> (see /checkpoint list for ids)");
    return;
  }
  await agent.requireServiceByType(AgentCheckpointService).restoreAgentCheckpoint(remainder, agent);
  agent.infoMessage(`Checkpoint ${remainder} loaded`);
}