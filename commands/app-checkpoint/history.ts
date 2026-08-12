import { CommandFailedError } from "@tokenring-ai/agent/AgentError";
import type { TreeLeaf } from "@tokenring-ai/agent/question";
import type { AgentCommandInputSchema, AgentCommandInputType, TokenRingAgentCommand } from "@tokenring-ai/agent/types";
import { formatTime } from "@tokenring-ai/utility/date/formatTime";
import indent from "@tokenring-ai/utility/string/indent";
import AppCheckpointService from "../../AppCheckpointService.ts";
import type { AppSessionListItem } from "../../AppCheckpointStorage.ts";

function groupCheckpointsByDate(checkpoints: AppSessionListItem[]): Record<string, AppSessionListItem[]> {
  const grouped: Record<string, AppSessionListItem[]> = {};
  for (const checkpoint of checkpoints) {
    const date = new Date(checkpoint.createdAt).toISOString().slice(0, 10);
    (grouped[date] ??= []).push(checkpoint);
  }
  for (const items of Object.values(grouped)) {
    items.sort((a, b) => b.createdAt - a.createdAt);
  }
  return grouped;
}

async function displayCheckpointDetails(checkpointItem: AppSessionListItem, checkpointStorage: AppCheckpointService): Promise<string> {
  const lines = [
    `\n=== App Checkpoint ===`,
    `Session ID: ${checkpointItem.sessionId}`,
    `Created: ${new Date(checkpointItem.createdAt).toLocaleString()}`,
    `Hostname: ${checkpointItem.hostname}`,
    `Working Directory: ${checkpointItem.workspaceDirectory}`,
  ];
  try {
    const fullCheckpoint = await checkpointStorage.retrieveAppCheckpoint(checkpointItem.id);
    if (fullCheckpoint) {
      lines.push(`\n📋 Checkpoint State:`);
      for (const [name, stateData] of Object.entries(fullCheckpoint.state)) {
        lines.push(`\n${name}:`);
        lines.push(indent(JSON.stringify(stateData, null, 2), 1));
      }
    }
  } catch {
    lines.push(`\n📋 Checkpoint Information:`);
    lines.push(`- Session ID: ${checkpointItem.sessionId}`);
    lines.push(`- Created: ${new Date(checkpointItem.createdAt).toLocaleString()}`);
    lines.push(`- Hostname: ${checkpointItem.hostname}`);
    lines.push(`- Working Directory: ${checkpointItem.workspaceDirectory}`);
  }
  lines.push(`\n--- End of Checkpoint Details ---\n`);
  return lines.join("\n");
}

const inputSchema = {} as const satisfies AgentCommandInputSchema;

async function execute({ agent }: AgentCommandInputType<typeof inputSchema>): Promise<string> {
  const checkpointStorage = agent.requireService(AppCheckpointService);
  const { items: checkpoints } = await checkpointStorage.listAppCheckpoints({ limit: 1000 });
  if (!checkpoints.length) return "No app checkpoint history found.";

  const checkpointsByDate = groupCheckpointsByDate(checkpoints);
  const tree: TreeLeaf[] = Object.entries(checkpointsByDate)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, items]) => ({
      name: `📅 ${date} (${items.length} checkpoints)`,
      children: items.map(cp => {
        const label = `Checkpoint ${cp.sessionId.slice(0, 8)}`;
        return {
          name: `📋 ${label} (${formatTime(cp.createdAt)})`,
          value: cp.sessionId,
        };
      }),
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

  const selected = checkpoints.find(({ sessionId }) => sessionId === selection[0]);
  if (!selected) throw new CommandFailedError(`Checkpoint ${selection[0]} could not be retrieved.`);
  return displayCheckpointDetails(selected, checkpointStorage);
}

export default {
  name: "app checkpoint history",
  description: "Browse app checkpoint history",
  inputSchema,
  execute,
  help: `Browse app checkpoint history grouped by date. Select a checkpoint to view its full details.

## Example

/app checkpoint history`,
} satisfies TokenRingAgentCommand<typeof inputSchema>;
