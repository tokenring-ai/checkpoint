import Agent from "@tokenring-ai/agent/Agent";
import type {AgentCreationContext} from "@tokenring-ai/agent/types";
import type TokenRingApp from "@tokenring-ai/app";
import {TokenRingService} from "@tokenring-ai/app/types";
import type {AgentCheckpointStorage} from "./AgentCheckpointStorage.ts";
import {type ParsedAgentCheckpointConfig} from "./schema.ts";

export default class AgentCheckpointService implements TokenRingService {
  readonly name = "AgentCheckpointService";
  description = "Persists agent state to a storage provider";

  checkpointProvider: AgentCheckpointStorage | null = null;
  constructor(readonly app: TokenRingApp, readonly options: ParsedAgentCheckpointConfig) {}

  async start(): Promise<void> {
    if (!this.checkpointProvider) {
      this.app.serviceError(this,`No CheckpointProvider was registered, unable to save checkpoints`);
    }
  }

  async attach(agent: Agent, creationContext: AgentCreationContext ): Promise<void> {
    creationContext.items.push(`Checkpoint Provider: ${this.checkpointProvider?.displayName ?? "(none)"}`);
    if (! this.checkpointProvider) {
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
    return await this.checkpointProvider.storeAgentCheckpoint({
      name,
      ...agent.generateCheckpoint(),
    });
  }

  async restoreAgentCheckpoint(id: string, agent: Agent): Promise<void> {
    const checkpoint = await this.retrieveAgentCheckpoint(id);
    if (!checkpoint) {
      throw new Error(`Checkpoint ${id} not found`);
    }
    agent.restoreState(checkpoint.state);
  }

  async listAgentCheckpoints() {
    if (!this.checkpointProvider) {
      throw new Error("No checkpoint provider is registered");
    }
    return await this.checkpointProvider.listAgentCheckpoints();
  }

  async retrieveAgentCheckpoint(checkpointId: string) {
    if (!this.checkpointProvider) {
      throw new Error("No checkpoint provider is registered");
    }
    return await this.checkpointProvider.retrieveAgentCheckpoint(checkpointId);
  }
}
