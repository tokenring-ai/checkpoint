import Agent from "@tokenring-ai/agent/Agent";
import {TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import AgentCheckpointService from "../../AgentCheckpointService.ts";

export default {
  name: "agent checkpoint create",
  description: "/agent checkpoint create - Create a conversation checkpoint",
  help: `# /agent checkpoint create [label]

Create a checkpoint of the current conversation state with an optional label.

## Example

/agent checkpoint create
/agent checkpoint create 'My Fix'`,
  execute: async (remainder: string, agent: Agent): Promise<string> => {
    const label = remainder.trim() || `New Checkpoint`;
    const checkpointId = await agent.requireServiceByType(AgentCheckpointService).saveAgentCheckpoint(label, agent);
    return `Checkpoint created: ${checkpointId}: ${label}`;
  },
} satisfies TokenRingAgentCommand;