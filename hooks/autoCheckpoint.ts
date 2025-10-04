import type Agent from "@tokenring-ai/agent/Agent";
import AgentCheckpointService from "../AgentCheckpointService.js";

export const name = "autoCheckpoint";
export const description = "Automatically saves agent checkpoints after input is handled";

export async function afterAgentInputComplete(agent: Agent, message: string): Promise<void> {
	const storage = agent.getServiceByType(AgentCheckpointService);
	if (storage) {
		await storage.saveAgentCheckpoint(message, agent);
	}
}
