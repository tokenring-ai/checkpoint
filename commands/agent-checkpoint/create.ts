import {AgentCommandInputSchema, AgentCommandInputType, TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import AgentCheckpointService from "../../AgentCheckpointService.ts";

const inputSchema = {
  args: {},
  positionals: [{
    name: "label",
    description: "Optional checkpoint label",
    required: false,
    greedy: true,
  }],
  allowAttachments: false,
} as const satisfies AgentCommandInputSchema;

async function execute({positionals, agent}: AgentCommandInputType<typeof inputSchema>): Promise<string> {
  const label = positionals.label || `New Checkpoint`;
  const checkpointId = await agent.requireServiceByType(AgentCheckpointService).saveAgentCheckpoint(label, agent);
  return `Checkpoint created: ${checkpointId}: ${label}`;
}

export default {
  name: "agent checkpoint create",
  description: "Create a conversation checkpoint",
  inputSchema,
  execute,
  help: `Create a checkpoint of the current conversation state with an optional label.

## Example

/agent checkpoint create
/agent checkpoint create My Fix`,
} satisfies TokenRingAgentCommand<typeof inputSchema>;
