import Agent from "@tokenring-ai/agent/Agent";
import {CommandFailedError} from "@tokenring-ai/agent/AgentError";
import type {TreeLeaf} from "@tokenring-ai/agent/question";
import {TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import indent from "@tokenring-ai/utility/string/indent";
import AppCheckpointService from "../../AppCheckpointService.js";
import type {AppSessionListItem} from "../../AppCheckpointStorage.js";

function groupCheckpointsByDate(checkpoints: AppSessionListItem[]): Record<string, AppSessionListItem[]> {
  const grouped: Record<string, AppSessionListItem[]> = {};
  for (const checkpoint of checkpoints) {
    const date = new Date(checkpoint.createdAt).toISOString().slice(0, 10);
    (grouped[date] ??= []).push(checkpoint);
  }
  for (const date in grouped) {
    grouped[date].sort((a, b) => b.createdAt - a.createdAt);
  }
  return grouped;
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

async function displayCheckpointDetails(checkpointItem: AppSessionListItem, checkpointStorage: AppCheckpointService): Promise<string> {
  const lines = [
    `\n=== App Checkpoint ===`,
    `Session ID: ${checkpointItem.sessionId}`,
    `Created: ${new Date(checkpointItem.createdAt).toLocaleString()}`,
    `Hostname: ${checkpointItem.hostname}`,
    `Working Directory: ${checkpointItem.workingDirectory}`,
  ];
  try {
    const fullCheckpoint = await checkpointStorage.retrieveAppCheckpoint(checkpointItem.sessionId);
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
    lines.push(`- Working Directory: ${checkpointItem.workingDirectory}`);
  }
  lines.push(`\n--- End of Checkpoint Details ---\n`);
  return lines.join("\n");
}

async function execute(_remainder: string, agent: Agent): Promise<string> {
  const checkpointStorage = agent.requireServiceByType(AppCheckpointService);
  const checkpoints = await checkpointStorage.listAppCheckpoints();
  if (!checkpoints?.length) return "No app checkpoint history found.";

  const checkpointsByDate = groupCheckpointsByDate(checkpoints);
  const tree: TreeLeaf[] = Object.keys(checkpointsByDate).sort().reverse().map(date => ({
    name: `📅 ${date} (${checkpointsByDate[date].length} checkpoints)`,
    children: checkpointsByDate[date].map(cp => {
      const label = (cp as any)._label || `Checkpoint ${cp.sessionId.slice(0, 8)}`;
      return {
        name: `📋 ${label} (${formatTime(cp.createdAt)})`,
        value: cp.sessionId,
      };
    }),
  }));

  const selection = await agent.askQuestion({
    message: "Select checkpoint to view:",
    question: { type: 'treeSelect', label: "Select Checkpoint", key: "result", minimumSelections: 1, maximumSelections: 1, tree },
  });

  if (!selection) return "Checkpoint browsing cancelled.";

  const selected = checkpoints.find(({sessionId}) => sessionId === selection[0]);
  if (!selected) throw new CommandFailedError(`Checkpoint ${selection[0]} could not be retrieved.`);
  return displayCheckpointDetails(selected, checkpointStorage);
}

export default {
  name: "app checkpoint history",
  description: "/app checkpoint history - Browse app checkpoint history",
  help: `# /app checkpoint history

Browse app checkpoint history grouped by date. Select a checkpoint to view its full details.

## Example

/app checkpoint history`,
  execute,
} satisfies TokenRingAgentCommand;