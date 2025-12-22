import Agent from "@tokenring-ai/agent/Agent";
import {TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import type {AgentCheckpointListItem} from "../AgentCheckpointProvider.js";
import AgentCheckpointService from "../AgentCheckpointService.js";

const description: string = "/history - Browse and view agent checkpoint history";

async function execute(
  _remainder: string,
  agent: Agent,
): Promise<void> {
  const checkpointStorage = agent.requireServiceByType(AgentCheckpointService);

  // Get all agent checkpoints
  const checkpoints = await checkpointStorage.listCheckpoints();

  if (!checkpoints || checkpoints.length === 0) {
    agent.infoLine("No checkpoint history found.");
    return;
  }

  // Group checkpoints by agentId (equivalent to sessions)
  const checkpointsByAgent = groupCheckpointsByAgent(checkpoints);

  // Build tree structure for checkpoint selection
  const buildHistoryTree = () => {
    const tree: any = {
      name: "Agent Checkpoint History",
      children: [],
    };

    const sortedAgentIds = Object.keys(checkpointsByAgent).sort();

    for (const agentId of sortedAgentIds) {
      const agentCheckpoints = checkpointsByAgent[agentId];
      const children = agentCheckpoints.map((checkpoint) => ({
        name: `📋 ${checkpoint.name} (${formatTime(checkpoint.createdAt)})`,
        value: checkpoint.id,
        checkpoint: checkpoint,
      }));

      tree.children.push({
        name: `🤖 Agent: ${agentId} (${agentCheckpoints.length} checkpoints)`,
        hasChildren: true,
        children,
      });
    }

    return tree;
  };

  // Show interactive tree selection
  const selectedCheckpointId = await agent.askHuman({
    type: "askForSingleTreeSelection",
    title: "Select Checkpoint",
    message: "Select checkpoint to view:",
    tree: buildHistoryTree(),
  });

  if (selectedCheckpointId) {
    const selectedCheckpoint = checkpoints.find(
      ({id}) => id === selectedCheckpointId,
    );
    if (!selectedCheckpoint) {
      agent.errorLine(
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
    agent.infoLine("Checkpoint browsing cancelled.");
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

// Format date for display
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (dateString === today.toISOString().split("T")[0]) {
    return "Today";
  } else if (dateString === yesterday.toISOString().split("T")[0]) {
    return "Yesterday";
  } else {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
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
  agent.infoLine(`\n=== Checkpoint: ${checkpointItem.name} ===`);
  agent.infoLine(`ID: ${checkpointItem.id}`);
  agent.infoLine(`Agent ID: ${checkpointItem.agentId}`);
  agent.infoLine(
    `Created: ${new Date(checkpointItem.createdAt).toLocaleString()}`,
  );

  try {
    // Retrieve the full checkpoint with state data (but don't restore it to the current agent)
    const fullCheckpoint = await checkpointStorage.getActiveProvider().retrieveCheckpoint(
      checkpointItem.id,
    );

    if (fullCheckpoint) {
      agent.infoLine(`\n📋 Checkpoint State:`);
      for (const [name, stateData] of Object.entries(fullCheckpoint.state.agentState)) {
        agent.infoLine(`\n${name}:`);
        agent.infoLine(`  ${JSON.stringify(stateData, null, 2).split('\n').join('\n  ')}`);
      }
    }

    agent.infoLine(`\n--- End of Checkpoint Details ---\n`);
  } catch (error) {
    agent.errorLine(
      `Error loading checkpoint ${checkpointItem.id}:`,
      error as Error,
    );

    // Show basic info even if retrieval fails
    agent.infoLine(`\n📋 Checkpoint Information:`);
    agent.infoLine(`- Name: ${checkpointItem.name}`);
    agent.infoLine(`- Agent ID: ${checkpointItem.agentId}`);
    agent.infoLine(
      `- Created: ${new Date(checkpointItem.createdAt).toLocaleString()}`,
    );
    agent.infoLine(`\n--- End of Checkpoint Details ---\n`);
  }
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

export default {
  description,
  execute,
  help,
} satisfies TokenRingAgentCommand