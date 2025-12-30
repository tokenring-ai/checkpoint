import Agent from "@tokenring-ai/agent/Agent";
import AgentCheckpointService from "../../AgentCheckpointService.ts";

export async function create(remainder: string, agent: Agent) {
  const label = remainder.trim() || `New Checkpoint`;
  const checkpointId = await agent.requireServiceByType(AgentCheckpointService).saveAgentCheckpoint(label, agent);
  agent.infoLine(`Checkpoint created: ${checkpointId}: ${label}`);
}