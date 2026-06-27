import type { AgentCommandInputSchema, AgentCommandInputType, TokenRingAgentCommand } from "@tokenring-ai/agent/types";
import AgentCheckpointService from "../../AgentCheckpointService.ts";

const inputSchema = {
  args: {},
  positionals: [
    {
      name: "checkpointId",
      description: "The checkpoint ID to restore",
      required: true,
    },
  ],
} as const satisfies AgentCommandInputSchema;

async function execute({ positionals: { checkpointId }, agent }: AgentCommandInputType<typeof inputSchema>): Promise<string> {
  const id = Number(checkpointId);
  if (!Number.isInteger(id)) {
    throw new Error(`Invalid checkpoint ID: ${checkpointId}`);
  }
  await agent.requireServiceByType(AgentCheckpointService).restoreAgentCheckpoint(id, agent);
  return `Checkpoint ${id} loaded`;
}

export default {
  name: "agent checkpoint restore",
  description: "Restore a checkpoint by ID",
  inputSchema,
  execute,
  help: `Restore a specific checkpoint by its ID. Use /agent checkpoint list to browse available IDs.

## Example

/agent checkpoint restore abc123`,
} satisfies TokenRingAgentCommand<typeof inputSchema>;
