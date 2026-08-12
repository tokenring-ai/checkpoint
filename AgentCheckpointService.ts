import type Agent from "@tokenring-ai/agent/Agent";
import type { AgentCreationContext } from "@tokenring-ai/agent/types";
import type TokenRingApp from "@tokenring-ai/app";
import type { TokenRingService } from "@tokenring-ai/app/types";
import type { AgentCheckpointStorage, CheckpointListOptions } from "./AgentCheckpointStorage.ts";
import { AgentCheckpointServiceSchema, type ParsedAgentCheckpointConfig } from "./schema.ts";

export default class AgentCheckpointService implements TokenRingService {
  readonly name = "AgentCheckpointService";
  description = "Persists agent state to a storage provider";

  checkpointProvider: AgentCheckpointStorage | null = null;

  private options = AgentCheckpointServiceSchema.parse({});

  constructor(
    readonly app: TokenRingApp,
    options?: ParsedAgentCheckpointConfig,
  ) {
    if (options) this.options = options;
  }

  reconfigure(options: ParsedAgentCheckpointConfig): void {
    this.options = options;
  }

  start(): void {
    if (!this.checkpointProvider) {
      this.app.serviceError(this, `No CheckpointProvider was registered, unable to save checkpoints`);
    }
  }

  attach(agent: Agent, creationContext: AgentCreationContext): void {
    creationContext.items.push(`Checkpoint Provider: ${this.checkpointProvider?.displayName ?? "(none)"}`);
    if (!this.checkpointProvider) {
      agent.warningMessage("No agent checkpoint provider is registered, agent checkpointing is disabled.");
    }
  }

  setCheckpointProvider(provider: AgentCheckpointStorage) {
    this.checkpointProvider = provider;
  }

  async saveAgentCheckpoint(name: string, agent: Agent): Promise<number> {
    if (!this.checkpointProvider) {
      throw new Error("No checkpoint provider is registered");
    }
    return this.checkpointProvider.storeAgentCheckpoint({
      name,
      ...agent.generateCheckpoint(),
    });
  }

  async restoreAgentCheckpoint(id: number, agent: Agent): Promise<void> {
    const checkpoint = await this.retrieveAgentCheckpoint(id);
    if (!checkpoint) {
      throw new Error(`Checkpoint ${id} not found`);
    }
    agent.restoreState(checkpoint.state);
  }

  async listAgentCheckpoints(options?: CheckpointListOptions) {
    if (!this.checkpointProvider) {
      throw new Error("No checkpoint provider is registered");
    }
    return await this.checkpointProvider.listAgentCheckpoints(options);
  }

  async retrieveAgentCheckpoint(checkpointId: number) {
    if (!this.checkpointProvider) {
      throw new Error("No checkpoint provider is registered");
    }
    return await this.checkpointProvider.retrieveAgentCheckpoint(checkpointId);
  }
}
