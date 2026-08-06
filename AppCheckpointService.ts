import { AgentManager } from "@tokenring-ai/agent";
import type TokenRingApp from "@tokenring-ai/app";
import type { TokenRingService } from "@tokenring-ai/app/types";
import { ConfigurationError } from "@tokenring-ai/app/types";
import type { AppCheckpointStorage } from "./AppCheckpointStorage.ts";
import type { ParsedAppCheckpointConfig } from "./schema.ts";
import { AppCheckpointState } from "./state/appCheckpointState.ts";

export default class AppCheckpointService implements TokenRingService {
  readonly name = "AppCheckpointService";
  description = "Persists app state to a storage provider";

  checkpointProvider: AppCheckpointStorage | null = null;

  private options: ParsedAppCheckpointConfig | undefined;

  constructor(
    readonly app: TokenRingApp,
    options?: ParsedAppCheckpointConfig,
  ) {
    if (options) this.options = options;
    const agentManager = this.app.requireService(AgentManager);
    this.app.initializeState(AppCheckpointState, agentManager);
  }

  reconfigure(options: ParsedAppCheckpointConfig): void {
    this.options = options;
  }

  async start(): Promise<void> {
    if (this.checkpointProvider && this.options?.restorePreviousState) {
      const checkpoint = await this.checkpointProvider.retrieveLatestAppCheckpoint();
      if (checkpoint) {
        this.app.restoreState(checkpoint.state);
      }
    } else if (!this.checkpointProvider) {
      this.app.serviceError(this, `No AppCheckpointProvider was registered, unable to save or restore app state at startup & shutdown`);
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

  async saveAppCheckpoint(): Promise<number> {
    if (!this.checkpointProvider) {
      throw new ConfigurationError(this.name, "No checkpoint provider is registered");
    }
    if (!this.options) {
      throw new ConfigurationError(this.name, "App checkpoint service has not been configured");
    }
    return await this.checkpointProvider.storeAppCheckpoint({
      sessionId: this.app.sessionId,
      createdAt: Date.now(),
      hostname: this.options.hostname,
      workspaceDirectory: this.app.appConfig.workingDirectory,
      state: this.app.generateStateCheckpoint(),
    });
  }

  async restoreAppCheckpoint(id: number): Promise<void> {
    const checkpoint = await this.retrieveAppCheckpoint(id);
    if (!checkpoint) {
      throw new Error(`Checkpoint ${id} not found`);
    }
    this.app.restoreState(checkpoint.state);
  }

  async listAppCheckpoints() {
    if (!this.checkpointProvider) {
      throw new ConfigurationError(this.name, "No checkpoint provider is registered");
    }
    return await this.checkpointProvider.listAppCheckpoints();
  }

  async retrieveAppCheckpoint(checkpointId: number) {
    if (!this.checkpointProvider) {
      throw new ConfigurationError(this.name, "No checkpoint provider is registered");
    }
    return await this.checkpointProvider.retrieveAppCheckpoint(checkpointId);
  }
}
