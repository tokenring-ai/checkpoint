import type Agent from "@tokenring-ai/agent/Agent";
import Hook from "@tokenring-ai/agent/commands/hook";
import {HookConfig} from "@tokenring-ai/agent/types";
import AgentCheckpointService from "../AgentCheckpointService.js";

const name = "autoCheckpoint";
const description = "Automatically saves agent checkpoints after input is handled";

async function afterAgentInputComplete(agent: Agent, message: string): Promise<void> {
  const storage = agent.getServiceByType(AgentCheckpointService);
  if (storage) {
    await storage.saveAgentCheckpoint(message, agent);
  }
}

export default {name, description, afterAgentInputComplete} as HookConfig;
