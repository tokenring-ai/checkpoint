import AgentManager from "@tokenring-ai/agent/services/AgentManager";
import TokenRingApp from "@tokenring-ai/app";
import {createRPCEndpoint} from "@tokenring-ai/rpc/createRPCEndpoint";
import AgentCheckpointService from "../AgentCheckpointService.ts";
import CheckpointRpcSchema from "./schema.ts";

export default createRPCEndpoint(CheckpointRpcSchema, {
  async listCheckpoints(_args, app: TokenRingApp) {
    const checkpointService = app.requireService(AgentCheckpointService);
    return await checkpointService.checkpointProvider.listCheckpoints();
  },

  async getCheckpoint(args, app: TokenRingApp) {
    const checkpointService = app.requireService(AgentCheckpointService);
    return await checkpointService.checkpointProvider.retrieveCheckpoint(args.id);
  },

  async launchAgentFromCheckpoint(args, app: TokenRingApp) {
    const checkpointService = app.requireService(AgentCheckpointService);
    const agentManager = app.requireService(AgentManager);

    const checkpoint = await checkpointService.checkpointProvider.retrieveCheckpoint(args.checkpointId);
    if (!checkpoint) {
      throw new Error(`Checkpoint ${args.checkpointId} not found`);
    }

    const agent = await agentManager.spawnAgentFromCheckpoint(checkpoint, { headless: args.headless});

    return {
      agentId: agent.id,
      agentName: agent.displayName,
      agentType: agent.config.agentType,
    };
  }
});
