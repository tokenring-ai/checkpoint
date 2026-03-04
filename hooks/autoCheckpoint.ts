import {HookSubscription} from "@tokenring-ai/agent/types";
import {AfterAgentInputHandled, HookCallback} from "@tokenring-ai/agent/util/hooks";
import AgentCheckpointService from "../AgentCheckpointService.js";

const name = "autoCheckpoint";
const displayName = "Checkpoint/Auto Checkpoint";
const description = "Automatically saves agent checkpoints after input is handled";

const callbacks = [
  new HookCallback(AfterAgentInputHandled, async ({ input }, agent): Promise<void> => {
    const storage = agent.getServiceByType(AgentCheckpointService);
    if (storage) {
      await storage.saveAgentCheckpoint(input.message, agent);
    }
  })
];

export default { name, displayName, description, callbacks } satisfies HookSubscription;
