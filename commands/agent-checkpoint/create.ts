import {AgentCommandInputSchema, AgentCommandInputType, TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import AgentCheckpointService from "../../AgentCheckpointService.ts";

const inputSchema = {
  args: {},
  prompt: {
    description: "Optional checkpoint label",
    required: false,
  },
  allowAttachments: false,
} as const satisfies AgentCommandInputSchema;

async function execute({prompt, agent}: AgentCommandInputType<typeof inputSchema>): Promise<string> {
  const label = prompt?.trim() || `New Checkpoint`;
  const checkpointId = await agent.requireServiceByType(AgentCheckpointService).saveAgentCheckpoint(label, agent);
  return `Checkpoint created: ${checkpointId}: ${label}`;
}

export default {
  name: "agent checkpoint create",
  description: "Create a conversation checkpoint",
  inputSchema,
  execute,
  help: `# /agent checkpoint create [label]

Create a checkpoint of the current conversation state with an optional label.

## Example

/agent checkpoint create
/agent checkpoint create 'My Fix'`,
} satisfies TokenRingAgentCommand<typeof inputSchema>;
