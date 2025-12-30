import {AgentLifecycleService} from "@tokenring-ai/agent";
import Agent from "@tokenring-ai/agent/Agent";
import {TokenRingService} from "@tokenring-ai/app/types";
import {z} from "zod";
import type {AgentCheckpointProvider} from "./AgentCheckpointProvider.js";
import {CheckpointConfigSchema} from "./schema.ts";

export default class AgentCheckpointService implements TokenRingService {
  name = "AgentCheckpointService";
  description = "Persists agent state to a storage provider";

  checkpointProvider!: AgentCheckpointProvider;
  constructor(readonly options: z.output<typeof CheckpointConfigSchema>) {}

  async run(): Promise<void> {
    if (!this.checkpointProvider) throw new Error(`CheckpointProvider of type ${this.options.provider.type} not found`);
  }

  async attach(agent: Agent): Promise<void> {
    agent.requireServiceByType(AgentLifecycleService).enableHooks(["@tokenring-ai/checkpoint/autoCheckpoint"], agent);
  }

  setCheckpointProvider(provider: AgentCheckpointProvider) {
    this.checkpointProvider = provider;
  }
  async saveAgentCheckpoint(name: string, agent: Agent): Promise<string> {
    return await this.checkpointProvider.storeCheckpoint({
      name,
      ...agent.generateCheckpoint(),
    });
  }

  async restoreAgentCheckpoint(id: string, agent: Agent): Promise<void> {
    const checkpoint = await this.checkpointProvider.retrieveCheckpoint(id);
    if (!checkpoint) {
      throw new Error(`Checkpoint ${id} not found`);
    }
    agent.restoreState(checkpoint.state);
  }

  async listCheckpoints(agent: Agent) {
    return await this.checkpointProvider.listCheckpoints();
  }
}
