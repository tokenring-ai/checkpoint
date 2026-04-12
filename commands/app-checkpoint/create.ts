import type {AgentCommandInputSchema, AgentCommandInputType, TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import AppCheckpointService from "../../AppCheckpointService.ts";

const inputSchema = {} as const satisfies AgentCommandInputSchema;

async function execute({
                         agent,
                       }: AgentCommandInputType<typeof inputSchema>): Promise<string> {
  const checkpointService = agent.requireServiceByType(AppCheckpointService);
  const checkpointId = await checkpointService.saveAppCheckpoint();
  return `Checkpoint created: ${checkpointId}`;
}

export default {
  name: "app checkpoint create",
  description: "Create an app state checkpoint",
  inputSchema,
  execute,
  help: `Create a checkpoint of the current app state

## Example

/app checkpoint create`,
} satisfies TokenRingAgentCommand<typeof inputSchema>;
