import Agent from "@tokenring-ai/agent/Agent";
import {TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import AppCheckpointService from "../../AppCheckpointService.ts";

export default {
  name: "app checkpoint create",
  description: "/app checkpoint create - Create an app state checkpoint",
  help: `# /app checkpoint create

Create a checkpoint of the current app state

## Example

/app checkpoint create`,
  execute: async (remainder: string, agent: Agent): Promise<string> => {
    const checkpointService = agent.requireServiceByType(AppCheckpointService);
    const checkpointId = await checkpointService.saveAppCheckpoint();
    return `Checkpoint created: ${checkpointId}`;
  },
} satisfies TokenRingAgentCommand;
