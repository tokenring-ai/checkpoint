import Agent from "@tokenring-ai/agent/Agent";
import {CommandFailedError} from "@tokenring-ai/agent/AgentError";
import AgentCheckpointService from "../../AgentCheckpointService.ts";

export async function create(remainder: string, agent: Agent): Promise<string> {
  const label = remainder.trim() || `New Checkpoint`;
  const checkpointId = await agent.requireServiceByType(AgentCheckpointService).saveAgentCheckpoint(label, agent);
  return `Checkpoint created: ${checkpointId}: ${label}`;
}