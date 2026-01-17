import Agent from "@tokenring-ai/agent/Agent";
import AgentCheckpointService from "../../AgentCheckpointService.ts";

export async function list(remainder: string, agent: Agent) {
  const checkpointService = agent.requireServiceByType(AgentCheckpointService)
  const savedCheckpoints = await checkpointService.listCheckpoints(agent);
  if (savedCheckpoints.length === 0) {
    agent.infoMessage(
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
  const tree = Object.keys(grouped)
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
    }));

  try {
    const selection = await agent.askQuestion({
      message: "Select a checkpoint to restore:",
      question: {
        type: 'treeSelect',
        label: "Select Checkpoint",
        key: "result",
        minimumSelections: 1,
        maximumSelections: 1,
        tree,
      }
    });

    if (selection == null) {
      agent.infoMessage("Checkpoint selection cancelled. No changes made.");
      return;
    }

    const selectedId = selection[0];
    await checkpointService.restoreAgentCheckpoint(
      selectedId,
      agent,
    );

    agent.infoMessage(`Checkpoint ${selectedId} loaded`);
  } catch (error) {
    agent.errorMessage(`Error during checkpoint selection: ${error}`);
  }
}