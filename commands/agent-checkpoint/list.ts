import {CommandFailedError} from "@tokenring-ai/agent/AgentError";
import type {TreeLeaf} from "@tokenring-ai/agent/question";
import type {AgentCommandInputSchema, AgentCommandInputType, TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import AgentCheckpointService from "../../AgentCheckpointService.ts";

const inputSchema = {
  args: {},
} as const satisfies AgentCommandInputSchema;

async function execute({
                         agent,
                       }: AgentCommandInputType<typeof inputSchema>): Promise<string> {
  const checkpointService = agent.requireServiceByType(AgentCheckpointService);
  const savedCheckpoints = await checkpointService.listAgentCheckpoints();
  if (savedCheckpoints.length === 0)
    return "No checkpoints saved. Use /agent checkpoint create to make one.";

  const grouped: Record<string, typeof savedCheckpoints> = {};
  for (const cp of savedCheckpoints) {
    const date = new Date(cp.createdAt).toISOString().slice(0, 10);
    (grouped[date] ??= []).push(cp);
  }

  const tree: TreeLeaf[] = Object.keys(grouped)
    .sort((a, b) => b.localeCompare(a))
    .map((date) => ({
      name: `📅 ${date} (${grouped[date].length} checkpoints)`,
      children: grouped[date]
        .sort((a, b) => b.createdAt - a.createdAt)
        .map((cp) => ({
          name: `⏰ ${new Date(cp.createdAt).toLocaleTimeString()} - ${cp.name}`,
          value: cp.id,
        })),
    }));

  try {
    const selection = await agent.askQuestion({
      message: "Select a checkpoint to restore:",
      question: {
        type: "treeSelect",
        label: "Select Checkpoint",
        key: "result",
        minimumSelections: 1,
        maximumSelections: 1,
        tree,
      },
    });
    if (selection == null || selection.length === 0)
      return "Checkpoint selection cancelled. No changes made.";
    const selectedCheckpoint = selection[0];
    await checkpointService.restoreAgentCheckpoint(selectedCheckpoint, agent);
    return `Checkpoint ${selectedCheckpoint} loaded`;
  } catch (error: unknown) {
    throw new CommandFailedError("Error during checkpoint selection", { cause: error });
  }
}

export default {
  name: "agent checkpoint list",
  description: "Interactive checkpoint browser",
  inputSchema,
  execute,
  help: `Open an interactive tree browser to select and restore a checkpoint. Checkpoints are grouped by date, newest first.

## Example

/agent checkpoint list`,
} satisfies TokenRingAgentCommand<typeof inputSchema>;
