import Agent from "@tokenring-ai/agent/Agent";
import {CommandFailedError} from "@tokenring-ai/agent/AgentError";
import {TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import AgentCheckpointService from "../../AgentCheckpointService.ts";

export default {
  name: "checkpoint restore",
  description: "/checkpoint restore - Restore a checkpoint by ID",
  help: `# /checkpoint restore <id>

Restore a specific checkpoint by its ID. Use /checkpoint list to browse available IDs.

## Example

/checkpoint restore abc123`,
  execute: async (remainder: string, agent: Agent): Promise<string> => {
    if (!remainder) throw new CommandFailedError("Usage: /checkpoint restore <id> (see /checkpoint list for ids)");
    await agent.requireServiceByType(AgentCheckpointService).restoreAgentCheckpoint(remainder, agent);
    return `Checkpoint ${remainder} loaded`;
  },
} satisfies TokenRingAgentCommand;