import { CommandFailedError } from "@tokenring-ai/agent/AgentError";
import type { TreeLeaf } from "@tokenring-ai/agent/question";
import type { AgentCommandInputSchema, AgentCommandInputType, TokenRingAgentCommand } from "@tokenring-ai/agent/types";
import { formatTime } from "@tokenring-ai/utility/date/formatTime";
import indent from "@tokenring-ai/utility/string/indent";
import AgentCheckpointService from "../../AgentCheckpointService.ts";
import type { AgentCheckpointListItem } from "../../AgentCheckpointStorage.ts";

function groupCheckpointsByAgent(checkpoints: AgentCheckpointListItem[]): Record<string, AgentCheckpointListItem[]> {
  const grouped: Record<string, AgentCheckpointListItem[]> = {};
  for (const checkpoint of checkpoints) {
    (grouped[checkpoint.agentId] ??= []).push(checkpoint);
  }
  for (const items of Object.values(grouped)) {
    items.sort((a, b) => b.createdAt - a.createdAt);
  }
  return grouped;
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
    lines.push(
      `\n📋 Checkpoint Information:`,
      `- Name: ${checkpointItem.name}`,
      `- Agent ID: ${checkpointItem.agentId}`,
      `- Created: ${new Date(checkpointItem.createdAt).toLocaleString()}`,
    );
  }
  lines.push(`\n--- End of Checkpoint Details ---\n`);
  return lines.join("\n");
}

const inputSchema = {} as const satisfies AgentCommandInputSchema;

async function execute({ agent }: AgentCommandInputType<typeof inputSchema>): Promise<string> {
  const checkpointStorage = agent.requireServiceByType(AgentCheckpointService);
  const checkpoints = await checkpointStorage.listAgentCheckpoints();
  if (!checkpoints.length) return "No checkpoint history found.";

  const checkpointsByAgent = groupCheckpointsByAgent(checkpoints);
  const tree: TreeLeaf[] = Object.entries(checkpointsByAgent)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([agentId, items]) => ({
      name: `🤖 Agent: ${agentId} (${items.length} checkpoints)`,
      children: items.map(cp => ({
        name: `📋 ${cp.name} (${formatTime(cp.createdAt)})`,
        value: String(cp.id),
      })),
    }));

  const selection = await agent.askQuestion({
    message: "Select checkpoint to view:",
    question: {
      type: "treeSelect",
      label: "Select Checkpoint",
      key: "result",
      minimumSelections: 1,
      maximumSelections: 1,
      tree,
    },
  });

  if (!selection) return "Checkpoint browsing cancelled.";

  const selected = checkpoints.find(({ id }) => String(id) === selection[0]);
  if (!selected) throw new CommandFailedError(`Checkpoint ${selection[0]} could not be retrieved.`);
  return displayCheckpointDetails(selected, checkpointStorage);
}

export default {
  name: "agent checkpoint history",
  description: "Browse checkpoint history grouped by agent",
  inputSchema,
  execute,
  help: `Browse checkpoint history grouped by agent. Select a checkpoint to view its full details.

## Example

/agent checkpoint history`,
} satisfies TokenRingAgentCommand<typeof inputSchema>;
