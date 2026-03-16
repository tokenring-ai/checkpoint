import {CommandFailedError} from "@tokenring-ai/agent/AgentError";
import {AgentCommandInputSchema, AgentCommandInputType, TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import AgentCheckpointService from "../../AgentCheckpointService.ts";

const inputSchema = {
  args: {},
  prompt: {
    description: "The checkpoint ID to restore",
    required: true,
  },
  allowAttachments: false,
} as const satisfies AgentCommandInputSchema;

async function execute({prompt, agent}: AgentCommandInputType<typeof inputSchema>): Promise<string> {
  if (!prompt) throw new CommandFailedError("Usage: /agent checkpoint restore <id> (see /agent checkpoint list for ids)");
  await agent.requireServiceByType(AgentCheckpointService).restoreAgentCheckpoint(prompt, agent);
  return `Checkpoint ${prompt} loaded`;
}

export default {
  name: "agent checkpoint restore",
  description: "Restore a checkpoint by ID",
  inputSchema,
  execute,
  help: `# /agent checkpoint restore <id>

Restore a specific checkpoint by its ID. Use /agent checkpoint list to browse available IDs.

## Example

/agent checkpoint restore abc123`,
} satisfies TokenRingAgentCommand<typeof inputSchema>;
