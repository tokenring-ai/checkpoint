import type Agent from "@tokenring-ai/agent/Agent";
import {HookConfig} from "@tokenring-ai/agent/types";
import AgentCheckpointService from "../AgentCheckpointService.js";

const name = "autoCheckpoint";
const displayName = "Checkpoint/Auto Checkpoint";
const description = "Automatically saves agent checkpoints after input is handled";

async function autoCheckpoint(agent: Agent, message: string): Promise<void> {
  const storage = agent.getServiceByType(AgentCheckpointService);
  if (storage) {
    await storage.saveAgentCheckpoint(message, agent);
  }
}

export default {
  name,
  displayName,
  description,
  afterAgentInputComplete: autoCheckpoint,
  beforeChatCompletion: autoCheckpoint,
} satisfies HookConfig;
