import {AgentLifecycleService} from "@tokenring-ai/agent";
import Agent from "@tokenring-ai/agent/Agent";
import type {TokenRingService} from "@tokenring-ai/agent/types";
import KeyedRegistryWithSingleSelection from "@tokenring-ai/utility/KeyedRegistryWithSingleSelection";
import type {AgentCheckpointProvider} from "./AgentCheckpointProvider.js";

export default class AgentCheckpointService implements TokenRingService {
	name = "AgentCheckpointService";
	description = "Persists agent state to a storage provider";

  private checkpointProviders =
    new KeyedRegistryWithSingleSelection<AgentCheckpointProvider>();

  registerProvider = this.checkpointProviders.register;
  getActiveProviderName =
    this.checkpointProviders.getActiveItemName;
  getActiveProvider =
    this.checkpointProviders.getActiveItem;
  setActiveProviderName =
    this.checkpointProviders.setEnabledItem;
  getAvailableProviders =
    this.checkpointProviders.getAllItemNames;

  async attach(agent: Agent): Promise<void> {
    agent.requireServiceByType(AgentLifecycleService).enableHooks(["@tokenring-ai/checkpoint/autoCheckpoint"], agent);
  }

	async saveAgentCheckpoint(name: string, agent: Agent): Promise<string> {
		return await this.checkpointProviders.getActiveItem().storeCheckpoint({
			name,
			...agent.generateCheckpoint(),
		});
	}

	async restoreAgentCheckpoint(id: string, agent: Agent): Promise<void> {
		const checkpoint = await this.checkpointProviders.getActiveItem().retrieveCheckpoint(id);
		if (!checkpoint) {
			throw new Error(`Checkpoint ${id} not found`);
		}
		agent.restoreCheckpoint(checkpoint);
	}

	async listCheckpoints() {
		return await this.checkpointProviders.getActiveItem().listCheckpoints();
	}
}
