import { CommandFailedError } from "@tokenring-ai/agent/AgentError";
import type { AgentCommandInputSchema, AgentCommandInputType, TokenRingAgentCommand } from "@tokenring-ai/agent/types";
import AppCheckpointService from "../../AppCheckpointService.ts";

const inputSchema = {} as const satisfies AgentCommandInputSchema;

async function execute({ agent }: AgentCommandInputType<typeof inputSchema>): Promise<string> {
  const checkpointService = agent.requireService(AppCheckpointService);
  const savedCheckpoints = await checkpointService.listAppCheckpoints();
  if (savedCheckpoints.length === 0) return "No checkpoints saved. Use /app checkpoint create to make one.";

  const grouped: Record<string, typeof savedCheckpoints> = {};
  for (const cp of savedCheckpoints) {
    const date = new Date(cp.createdAt).toISOString().slice(0, 10);
    (grouped[date] ??= []).push(cp);
  }

  const tree = Object.entries(grouped)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, items]) => ({
      name: `📅 ${date} (${items.length} checkpoints)`,
      value: date,
      hasChildren: true,
      children: items
        .sort((a, b) => b.createdAt - a.createdAt)
        .map(cp => ({
          name: `⏰ ${new Date(cp.createdAt).toLocaleTimeString()} - Session ${cp.sessionId}@${cp.hostname}:${cp.projectDirectory}`,
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
    if (selection == null) return "Checkpoint selection cancelled. No changes made.";
    const selectedCheckpoint = Number(selection[0]);
    if (!Number.isInteger(selectedCheckpoint)) {
      throw new CommandFailedError(`Invalid checkpoint ID: ${selection[0]}`);
    }
    await checkpointService.restoreAppCheckpoint(selectedCheckpoint);
    return `Checkpoint ${selectedCheckpoint} loaded`;
  } catch (err) {
    throw new CommandFailedError("Error during checkpoint selection", { cause: err });
  }
}

export default {
  name: "app checkpoint list",
  description: "Interactive checkpoint browser",
  inputSchema,
  execute,
  help: `Open an interactive tree browser to select and restore a checkpoint. Checkpoints are grouped by date, newest first.

## Example

/app checkpoint list`,
} satisfies TokenRingAgentCommand<typeof inputSchema>;
