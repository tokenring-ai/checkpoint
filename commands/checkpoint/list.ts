import Agent from "@tokenring-ai/agent/Agent";
import AgentCheckpointService from "../../AgentCheckpointService.ts";

export async function list(remainder: string, agent: Agent) {
  const checkpointService = agent.requireServiceByType(AgentCheckpointService)
  const savedCheckpoints = await checkpointService.listCheckpoints(agent);
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

    await checkpointService.restoreAgentCheckpoint(
      selectedId,
      agent,
    );

    agent.infoLine(`Checkpoint ${selectedId} loaded`);
  } catch (error) {
    agent.errorLine(`Error during checkpoint selection: ${error}`);
  }
}