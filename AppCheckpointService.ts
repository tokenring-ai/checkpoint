import {AgentManager} from "@tokenring-ai/agent";
import type TokenRingApp from "@tokenring-ai/app";
import {TokenRingService} from "@tokenring-ai/app/types";
import type {AppCheckpointStorage} from "./AppCheckpointStorage.ts";
import {type ParsedAppCheckpointConfig} from "./schema.ts";
import {AppCheckpointState} from "./state/appCheckpointState.ts";

export default class AppCheckpointService implements TokenRingService {
  readonly name = "AppCheckpointService";
  description = "Persists app state to a storage provider";

  checkpointProvider: AppCheckpointStorage | null = null;
  constructor(readonly app: TokenRingApp, readonly options: ParsedAppCheckpointConfig) {
    const agentManager = this.app.requireService(AgentManager);
    this.app.stateManager.initializeState(AppCheckpointState, agentManager)
  }

  async start(): Promise<void> {
    if (this.checkpointProvider && this.options.restorePreviousState) {
      const checkpoint = await this.checkpointProvider.retrieveLatestAppCheckpoint();
      if (checkpoint) {
        this.app.restoreState(checkpoint.state);
      }
    } else {
      this.app.serviceError(this,`No CheckpointProvider was registered, unable to save or restore app checkpoints`);
    }
  }

  async stop(): Promise<void> {
    if (this.checkpointProvider) {
      await this.saveAppCheckpoint();
    }
  }

  setCheckpointProvider(provider: AppCheckpointStorage) {
    this.checkpointProvider = provider;
  }

  async saveAppCheckpoint(): Promise<string> {
    if (!this.checkpointProvider) {
      throw new Error("No checkpoint provider is registered");
    }
    return await this.checkpointProvider.storeAppCheckpoint({
      sessionId: this.app.sessionId,
      createdAt: Date.now(),
      hostname: this.options.hostname,
      projectDirectory: this.options.projectDirectory,
      state: this.app.generateStateCheckpoint(),
    })
  }

  async restoreAppCheckpoint(id: string): Promise<void> {
    const checkpoint = await this.retrieveAppCheckpoint(id);
    if (!checkpoint) {
      throw new Error(`Checkpoint ${id} not found`);
    }
    this.app.restoreState(checkpoint.state);
  }

  async listAppCheckpoints() {
    if (!this.checkpointProvider) {
      throw new Error("No checkpoint provider is registered");
    }
    return await this.checkpointProvider.listAppCheckpoints();
  }

  async retrieveAppCheckpoint(checkpointId: string) {
    if (!this.checkpointProvider) {
      throw new Error("No checkpoint provider is registered");
    }
    return await this.checkpointProvider.retrieveAppCheckpoint(checkpointId);
  }
}
