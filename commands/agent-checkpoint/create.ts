import type {AgentCommandInputSchema, AgentCommandInputType, TokenRingAgentCommand,} from "@tokenring-ai/agent/types";
import AgentCheckpointService from "../../AgentCheckpointService.ts";

const inputSchema = {
  args: {},
  remainder: {
    name: "label",
    description: "Optional checkpoint label",
    defaultValue: "New Checkpoint",
  },
} as const satisfies AgentCommandInputSchema;

async function execute({
                         remainder,
                         agent,
                       }: AgentCommandInputType<typeof inputSchema>): Promise<string> {
  const label = remainder;
  const checkpointId = await agent
    .requireServiceByType(AgentCheckpointService)
    .saveAgentCheckpoint(label, agent);
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
