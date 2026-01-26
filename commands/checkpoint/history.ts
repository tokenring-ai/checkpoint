import Agent from "@tokenring-ai/agent/Agent";
import type {TreeLeaf} from "@tokenring-ai/agent/question";
import indent from "@tokenring-ai/utility/string/indent";
import type {AgentCheckpointListItem} from "../../AgentCheckpointProvider.js";
import AgentCheckpointService from "../../AgentCheckpointService.js";

const description: string = "/history - Browse and view agent checkpoint history";

async function execute(
  _remainder: string,
  agent: Agent,
): Promise<void> {
  const checkpointStorage = agent.requireServiceByType(AgentCheckpointService);

  // Get all agent checkpoints
  const checkpoints = await checkpointStorage.listCheckpoints();

  if (!checkpoints || checkpoints.length === 0) {
    agent.infoMessage("No checkpoint history found.");
    return;
  }

  // Group checkpoints by agentId (equivalent to sessions)
  const checkpointsByAgent = groupCheckpointsByAgent(checkpoints);

  // Build tree structure for checkpoint selection
  const buildHistoryTree = () : TreeLeaf[] => {
    const tree: TreeLeaf[] = [];

    const sortedAgentIds = Object.keys(checkpointsByAgent).sort();

    for (const agentId of sortedAgentIds) {
      const agentCheckpoints = checkpointsByAgent[agentId];
      const children = agentCheckpoints.map((checkpoint) => ({
        name: `📋 ${checkpoint.name} (${formatTime(checkpoint.createdAt)})`,
        value: checkpoint.id,
        checkpoint: checkpoint,
      }));

      tree.push({
        name: `🤖 Agent: ${agentId} (${agentCheckpoints.length} checkpoints)`,
        children,
      });
    }

    return tree;
  };

  const selection = await agent.askQuestion({
    message: "Select checkpoint to view:",
    question: {
      type: 'treeSelect',
      label: "Select Checkpoint",
      key: "result",
      minimumSelections: 1,
      maximumSelections: 1,
      tree: buildHistoryTree(),
    }
  });

  if (selection) {
    const selectedCheckpointId = selection[0];
    const selectedCheckpoint = checkpoints.find(
      ({id}) => id === selectedCheckpointId,
    );
    if (!selectedCheckpoint) {
      agent.errorMessage(
        `Checkpoint ${selectedCheckpointId} could not be retrieved.`,
      );
      return;
    }

    await displayCheckpointDetails(
      selectedCheckpoint,
      checkpointStorage,
      agent,
    );
  } else {
    agent.infoMessage("Checkpoint browsing cancelled.");
  }
}

// Group checkpoints by agentId (equivalent to sessions)
function groupCheckpointsByAgent(
  checkpoints: AgentCheckpointListItem[],
): Record<string, typeof checkpoints> {
  const grouped: Record<string, typeof checkpoints> = {};

  for (const checkpoint of checkpoints) {
    const agentId = checkpoint.agentId;
    if (!grouped[agentId]) {
      grouped[agentId] = [];
    }
    grouped[agentId].push(checkpoint);
  }

  // Sort checkpoints within each agent group by creation time (newest first)
  for (const agentId in grouped) {
    grouped[agentId].sort((a, b) => b.createdAt - a.createdAt);
  }

  return grouped;
}

// Format time for display
function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

// Display checkpoint details
async function displayCheckpointDetails(
  checkpointItem: AgentCheckpointListItem,
  checkpointStorage: AgentCheckpointService,
  agent: Agent,
): Promise<void> {
  const lines: string[] = [
    `\n=== Checkpoint: ${checkpointItem.name} ===`,
    `ID: ${checkpointItem.id}`,
    `Agent ID: ${checkpointItem.agentId}`,
    `Created: ${new Date(checkpointItem.createdAt).toLocaleString()}`
  ];

  try {
    // Retrieve the full checkpoint with state data (but don't restore it to the current agent)
    const fullCheckpoint = await checkpointStorage.checkpointProvider.retrieveCheckpoint(
      checkpointItem.id,
    );

    if (fullCheckpoint) {
      lines.push(`\n📋 Checkpoint State:`);
      for (const [name, stateData] of Object.entries(fullCheckpoint.state.agentState)) {
        lines.push(`\n${name}:`);
        lines.push(indent(JSON.stringify(stateData, null, 2), 1));
      }
    }

    lines.push(`\n--- End of Checkpoint Details ---\n`);
  } catch (error) {
    agent.errorMessage(
      `Error loading checkpoint ${checkpointItem.id}:`,
      error as Error,
    );

    // Show basic info even if retrieval fails
    lines.push(`\n📋 Checkpoint Information:`);
    lines.push(`- Name: ${checkpointItem.name}`);
    lines.push(`- Agent ID: ${checkpointItem.agentId}`);
    lines.push(
      `- Created: ${new Date(checkpointItem.createdAt).toLocaleString()}`,
    );
    lines.push(`\n--- End of Checkpoint Details ---\n`);
  }

  agent.infoMessage(lines.join("\n"));
}

const help: string = `# /history - Browse and view agent checkpoint history

With no arguments: Browse all checkpoints using interactive tree selection grouped by agent ID with detailed checkpoint information

## Features

- Interactive tree navigation
- Grouped by agent ID (sessions)
- Shows checkpoint details including state data
- Chronological ordering (newest first)

## Examples

/history                    - Browse all checkpoints
/history                    - Select and view checkpoint details

## Output

- Tree view with agent groups and checkpoints
- Detailed checkpoint information including state
- Error handling for corrupted checkpoints`;

export async function history(
  _remainder: string,
  agent: Agent,
): Promise<void> {
  await execute(_remainder, agent);
}