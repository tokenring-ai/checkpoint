import Agent from "@tokenring-ai/agent/Agent";
import {CommandFailedError} from "@tokenring-ai/agent/AgentError";
import {TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import AgentCheckpointService from "../../AgentCheckpointService.ts";

export default {
  name: "agent checkpoint restore",
  description: "Restore a checkpoint by ID",
  help: `# /agent checkpoint restore <id>

Restore a specific checkpoint by its ID. Use /agent checkpoint list to browse available IDs.

## Example

/agent checkpoint restore abc123`,
  execute: async (remainder: string, agent: Agent): Promise<string> => {
    if (!remainder) throw new CommandFailedError("Usage: /agent checkpoint restore <id> (see /agent checkpoint list for ids)");
    await agent.requireServiceByType(AgentCheckpointService).restoreAgentCheckpoint(remainder, agent);
    return `Checkpoint ${remainder} loaded`;
  },
} satisfies TokenRingAgentCommand;