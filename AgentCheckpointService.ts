import {AgentLifecycleService} from "@tokenring-ai/agent";
import Agent from "@tokenring-ai/agent/Agent";
import type {AgentCreationContext} from "@tokenring-ai/agent/types";
import type TokenRingApp from "@tokenring-ai/app";
import {TokenRingService} from "@tokenring-ai/app/types";
import {z} from "zod";
import type {AgentCheckpointStorage} from "./AgentCheckpointStorage.js";
import {CheckpointConfigSchema} from "./schema.ts";

export default class AgentCheckpointService implements TokenRingService {
  readonly name = "AgentCheckpointService";
  description = "Persists agent state to a storage provider";

  checkpointProvider: AgentCheckpointStorage | null = null;
  constructor(readonly app: TokenRingApp, readonly options: z.output<typeof CheckpointConfigSchema>) {}

  async start(): Promise<void> {
    if (!this.checkpointProvider) {
      this.app.serviceError(this,`No CheckpointProvider was registered, unable to save checkpoints`);
    }
  }

  async attach(agent: Agent, creationContext: AgentCreationContext ): Promise<void> {
    creationContext.items.push(`Checkpoint Provider: ${this.checkpointProvider?.displayName ?? "(none)"}`);
    if (this.checkpointProvider) {
      agent.requireServiceByType(AgentLifecycleService).enableHooks(["@tokenring-ai/checkpoint/autoCheckpoint"], agent);
    } else {
      agent.warningMessage("No agent checkpoint provider is registered, agent checkpointing is disabled.");
    }
  }

  setCheckpointProvider(provider: AgentCheckpointStorage) {
    this.checkpointProvider = provider;
  }
  async saveAgentCheckpoint(name: string, agent: Agent): Promise<string> {
    if (!this.checkpointProvider) {
      throw new Error("No checkpoint provider is registered");
    }
    return await this.checkpointProvider.storeCheckpoint({
      name,
      ...agent.generateCheckpoint(),
    });
  }

  async restoreAgentCheckpoint(id: string, agent: Agent): Promise<void> {
    const checkpoint = await this.retrieveCheckpoint(id);
    if (!checkpoint) {
      throw new Error(`Checkpoint ${id} not found`);
    }
    agent.restoreState(checkpoint.state);
  }

  async listCheckpoints() {
    if (!this.checkpointProvider) {
      throw new Error("No checkpoint provider is registered");
    }
    return await this.checkpointProvider.listCheckpoints();
  }

  async retrieveCheckpoint(checkpointId: string) {
    if (!this.checkpointProvider) {
      throw new Error("No checkpoint provider is registered");
    }
    return await this.checkpointProvider.retrieveCheckpoint(checkpointId);
  }
}
