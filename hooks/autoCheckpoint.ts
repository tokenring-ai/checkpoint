import type {HookSubscription} from "@tokenring-ai/lifecycle/types";
import {AfterAgentInputHandled, HookCallback} from "@tokenring-ai/lifecycle/util/hooks";
import AgentCheckpointService from "../AgentCheckpointService.js";

const name = "autoCheckpoint";
const displayName = "Checkpoint/Auto Checkpoint";
const description = "Automatically saves agent checkpoints after input is handled";

const callbacks = [
  new HookCallback(AfterAgentInputHandled, async (data, agent): Promise<void> => {
    const storage = agent.getServiceByType(AgentCheckpointService);
    if (storage) {
      await storage.saveAgentCheckpoint(data.request.input.message, agent);
    }
  })
];

export default { name, displayName, description, callbacks } satisfies HookSubscription;
