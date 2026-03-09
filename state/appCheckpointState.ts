import { AgentManager } from "@tokenring-ai/agent";
import {AgentCheckpointSchema} from "@tokenring-ai/agent/types";
import {AppStateSlice} from "@tokenring-ai/app/types";
import {z} from "zod";

const serializationSchema = z.object({
  agentCheckpointData: z.array(AgentCheckpointSchema).default([]),
}).prefault({});

export class AppCheckpointState extends AppStateSlice<typeof serializationSchema> {
  constructor(readonly agentManager: AgentManager) {
    super("AppCheckpointState", serializationSchema);
  }

  serialize(): z.output<typeof serializationSchema> {
    const agentCheckpointData = this.agentManager.getAgents().map(agent => agent.generateCheckpoint());
    return {
      agentCheckpointData,
    };
  }

  deserialize(data: z.output<typeof serializationSchema>): void {
    const agentManager = this.agentManager;
    for (const agentCheckpoint of data.agentCheckpointData) {
      if (!agentManager.getAgent(agentCheckpoint.agentId)) {
        agentManager.spawnAgentFromCheckpoint(agentCheckpoint);
      }
    }
  }
}
