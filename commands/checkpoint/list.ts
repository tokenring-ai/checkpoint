import Agent from "@tokenring-ai/agent/Agent";
import {CommandFailedError} from "@tokenring-ai/agent/AgentError";
import {TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import AgentCheckpointService from "../../AgentCheckpointService.ts";

async function execute(remainder: string, agent: Agent): Promise<string> {
  const checkpointService = agent.requireServiceByType(AgentCheckpointService);
  const savedCheckpoints = await checkpointService.listCheckpoints();
  if (savedCheckpoints.length === 0) return "No checkpoints saved. Use /checkpoint create to make one.";

  const grouped: Record<string, typeof savedCheckpoints> = {};
  for (const cp of savedCheckpoints) {
    const date = new Date(cp.createdAt).toISOString().slice(0, 10);
    (grouped[date] ??= []).push(cp);
  }

  const tree = Object.keys(grouped)
    .sort((a, b) => b.localeCompare(a))
    .map(date => ({
      name: `📅 ${date} (${grouped[date].length} checkpoints)`,
      value: date,
      hasChildren: true,
      children: grouped[date]
        .sort((a, b) => b.createdAt - a.createdAt)
        .map(cp => ({ name: `⏰ ${new Date(cp.createdAt).toLocaleTimeString()} - ${cp.name}`, value: cp.id })),
    }));

  try {
    const selection = await agent.askQuestion({
      message: "Select a checkpoint to restore:",
      question: { type: 'treeSelect', label: "Select Checkpoint", key: "result", minimumSelections: 1, maximumSelections: 1, tree },
    });
    if (selection == null) return "Checkpoint selection cancelled. No changes made.";
    await checkpointService.restoreAgentCheckpoint(selection[0], agent);
    return `Checkpoint ${selection[0]} loaded`;
  } catch (error) {
    throw new CommandFailedError(`Error during checkpoint selection: ${error}`);
  }
}

export default {
  name: "checkpoint list",
  description: "/checkpoint list - Interactive checkpoint browser",
  help: `# /checkpoint list

Open an interactive tree browser to select and restore a checkpoint. Checkpoints are grouped by date, newest first.

## Example

/checkpoint list`,
  execute,
} satisfies TokenRingAgentCommand;
