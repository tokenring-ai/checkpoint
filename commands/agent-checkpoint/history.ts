import Agent from "@tokenring-ai/agent/Agent";
import {CommandFailedError} from "@tokenring-ai/agent/AgentError";
import type {TreeLeaf} from "@tokenring-ai/agent/question";
import {TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import indent from "@tokenring-ai/utility/string/indent";
import AgentCheckpointService from "../../AgentCheckpointService.js";
import type {AgentCheckpointListItem} from "../../AgentCheckpointStorage.js";

function groupCheckpointsByAgent(checkpoints: AgentCheckpointListItem[]): Record<string, AgentCheckpointListItem[]> {
  const grouped: Record<string, AgentCheckpointListItem[]> = {};
  for (const checkpoint of checkpoints) {
    (grouped[checkpoint.agentId] ??= []).push(checkpoint);
  }
  for (const agentId in grouped) {
    grouped[agentId].sort((a, b) => b.createdAt - a.createdAt);
  }
  return grouped;
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

async function displayCheckpointDetails(checkpointItem: AgentCheckpointListItem, checkpointStorage: AgentCheckpointService): Promise<string> {
  const lines = [
    `\n=== Checkpoint: ${checkpointItem.name} ===`,
    `ID: ${checkpointItem.id}`,
    `Agent ID: ${checkpointItem.agentId}`,
    `Created: ${new Date(checkpointItem.createdAt).toLocaleString()}`,
  ];
  try {
    const fullCheckpoint = await checkpointStorage.retrieveAgentCheckpoint(checkpointItem.id);
    if (fullCheckpoint) {
      lines.push(`\n📋 Checkpoint State:`);
      for (const [name, stateData] of Object.entries(fullCheckpoint.state)) {
        lines.push(`\n${name}:`);
        lines.push(indent(JSON.stringify(stateData, null, 2), 1));
      }
    }
  } catch {
    lines.push(`\n📋 Checkpoint Information:`, `- Name: ${checkpointItem.name}`, `- Agent ID: ${checkpointItem.agentId}`, `- Created: ${new Date(checkpointItem.createdAt).toLocaleString()}`);
  }
  lines.push(`\n--- End of Checkpoint Details ---\n`);
  return lines.join("\n");
}

async function execute(_remainder: string, agent: Agent): Promise<string> {
  const checkpointStorage = agent.requireServiceByType(AgentCheckpointService);
  const checkpoints = await checkpointStorage.listAgentCheckpoints();
  if (!checkpoints?.length) return "No checkpoint history found.";

  const checkpointsByAgent = groupCheckpointsByAgent(checkpoints);
  const tree: TreeLeaf[] = Object.keys(checkpointsByAgent).sort().map(agentId => ({
    name: `🤖 Agent: ${agentId} (${checkpointsByAgent[agentId].length} checkpoints)`,
    children: checkpointsByAgent[agentId].map(cp => ({
      name: `📋 ${cp.name} (${formatTime(cp.createdAt)})`,
      value: cp.id,
    })),
  }));

  const selection = await agent.askQuestion({
    message: "Select checkpoint to view:",
    question: { type: 'treeSelect', label: "Select Checkpoint", key: "result", minimumSelections: 1, maximumSelections: 1, tree },
  });

  if (!selection) return "Checkpoint browsing cancelled.";

  const selected = checkpoints.find(({id}) => id === selection[0]);
  if (!selected) throw new CommandFailedError(`Checkpoint ${selection[0]} could not be retrieved.`);
  return displayCheckpointDetails(selected, checkpointStorage);
}

export default {
  name: "agent checkpoint history",
  description: "Browse checkpoint history grouped by agent",
  help: `# /agent checkpoint history

Browse checkpoint history grouped by agent. Select a checkpoint to view its full details.

## Example

/agent checkpoint history`,
  execute,
} satisfies TokenRingAgentCommand;
