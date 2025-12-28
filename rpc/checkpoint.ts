import TokenRingApp from "@tokenring-ai/app";
import {createJsonRPCEndpoint} from "@tokenring-ai/web-host/jsonrpc/createJsonRPCEndpoint";
import AgentManager from "@tokenring-ai/agent/services/AgentManager";
import AgentCheckpointService from "../AgentCheckpointService.ts";
import CheckpointRpcSchema from "./schema.ts";

export default createJsonRPCEndpoint(CheckpointRpcSchema, {
  async listCheckpoints(_args, app: TokenRingApp) {
    const checkpointService = app.requireService(AgentCheckpointService);
    return await checkpointService.listCheckpoints();
  },

  async getCheckpoint(args, app: TokenRingApp) {
    const checkpointService = app.requireService(AgentCheckpointService);
    return await checkpointService.getActiveProvider().retrieveCheckpoint(args.id);
  },

  async launchAgentFromCheckpoint(args, app: TokenRingApp) {
    const checkpointService = app.requireService(AgentCheckpointService);
    const agentManager = app.requireService(AgentManager);

    const checkpoint = await checkpointService.getActiveProvider().retrieveCheckpoint(args.checkpointId);
    if (!checkpoint) {
      throw new Error(`Checkpoint ${args.checkpointId} not found`);
    }

    const agent = await agentManager.spawnAgentFromCheckpoint(checkpoint, { headless: args.headless});

    return {
      agentId: agent.id,
      agentName: agent.name,
      agentType: agent.config.type,
    };
  }
});
