/**
 * /checkpoint create [label] - stores current previous_response_id as a checkpoint.
 * /checkpoint restore <id> - restores previous_response_id from checkpoint
 * /checkpoint list - shows all checkpoints
 */
import Agent from "@tokenring-ai/agent/Agent";
import {TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import createSubcommandRouter from "@tokenring-ai/agent/util/subcommandRouter";
import AgentCheckpointService from "../AgentCheckpointService.ts";

const description: string =
  "/checkpoint - Create or restore conversation checkpoints to resume chat";

export const execute = createSubcommandRouter({
  create,
  restore,
  list,
})

async function create(remainder: string, agent: Agent) {
  const label = remainder.trim() || `New Checkpoint`;
  const checkpointId = await agent.requireServiceByType(AgentCheckpointService).saveAgentCheckpoint(label, agent);
  agent.infoLine(`Checkpoint created: ${checkpointId}: ${label}`);
}

async function restore(remainder: string, agent: Agent) {
  if (!remainder) {
    agent.errorLine("Usage: /checkpoint restore <id> (see /checkpoint list for ids)");
    return;
  }
  await agent.requireServiceByType(AgentCheckpointService).restoreAgentCheckpoint(remainder, agent);
  agent.infoLine(`Checkpoint ${remainder} loaded`);
}

async function list(remainder: string, agent: Agent) {
  const checkpointService = agent.requireServiceByType(AgentCheckpointService)
  const savedCheckpoints = await checkpointService.listCheckpoints();
  if (savedCheckpoints.length === 0) {
    agent.infoLine(
      "No checkpoints saved. Use /checkpoint create to make one.",
    );
    return;
  }

  // Group checkpoints by date (YYYY-MM-DD)
  const grouped: Record<string, typeof savedCheckpoints> = {};
  for (const cp of savedCheckpoints) {
    const date = new Date(cp.createdAt).toISOString().slice(0, 10);
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(cp);
  }

  // Construct tree for selection
  const tree = {
    name: "Checkpoint Selection",
    children: Object.keys(grouped)
      .sort((a, b) => b.localeCompare(a)) // Most recent first
      .map((date) => ({
        name: `📅 ${date} (${grouped[date].length} checkpoints)`,
        value: date,
        hasChildren: true,
        children: grouped[date]
          .sort((a, b) => b.createdAt - a.createdAt) // Most recent first within date
          .map((cp, _index) => ({
            name: `⏰ ${new Date(cp.createdAt).toLocaleTimeString()} - ${cp.name}`,
            value: cp.id,
          })),
      })),
  } as const;

  // Show interactive tree selection
  try {
    const selectedId = await agent.askHuman({
      type: "askForSingleTreeSelection",
      title: "Select Checkpoint",
      message: "Select a checkpoint to restore:",
      tree,
    });

    if (!selectedId) {
      agent.infoLine("Checkpoint selection cancelled. No changes made.");
      return;
    }

    const row = await checkpointService.restoreAgentCheckpoint(
      selectedId,
      agent,
    );

    agent.infoLine(`Checkpoint ${selectedId} loaded`);
  } catch (error) {
    agent.errorLine(`Error during checkpoint selection: ${error}`);
  }
}

const help: string = `# /checkpoint - Create or restore conversation checkpoints

## Actions

- **create [label]** - Create checkpoint with optional label
- **restore <id>** - Restore specific checkpoint by ID
- **list** - Interactive tree selection of checkpoints

## Features

- Persistent checkpoint storage
- Interactive tree browser for easy selection
- Grouped by date for better organization
- Chronological ordering (newest first)
- Optional custom labels for better organization

## Examples

/checkpoint create                    - Create checkpoint with default label
/checkpoint create 'My Fix'           - Create checkpoint with custom label
/checkpoint restore abc123            - Restore specific checkpoint by ID
/checkpoint list                      - Show interactive checkpoint browser

## Output

- Confirmation messages for create/restore operations
- Interactive tree selection for list action
- Error handling for invalid checkpoint IDs
- Organized display by date and time

## Tips

- Use descriptive labels to easily identify checkpoints
- Use the list action to browse and restore checkpoints visually
- Checkpoints are automatically organized by date`;

export default {
  description,
  execute,
  help,
} satisfies TokenRingAgentCommand