import AgentManager from "@tokenring-ai/agent/services/AgentManager";
import type TokenRingApp from "@tokenring-ai/app";
import { createPollingQueryStream } from "@tokenring-ai/rpc/createPollingQueryStream";
import { createRPCEndpoint } from "@tokenring-ai/rpc/createRPCEndpoint";
import AgentCheckpointService from "../AgentCheckpointService.ts";
import CheckpointRpcSchema from "./schema.ts";

const streamCheckpoints = createPollingQueryStream({
  intervalMs: 5000,
  poll: async (_args, app) => {
    const checkpointService = app.requireService(AgentCheckpointService);
    return await checkpointService.listAgentCheckpoints();
  },
});

export default createRPCEndpoint(CheckpointRpcSchema, {
  async listCheckpoints(_args, app: TokenRingApp) {
    const checkpointService = app.requireService(AgentCheckpointService);
    return await checkpointService.listAgentCheckpoints();
  },

  streamCheckpoints,

  async getCheckpoint(args, app: TokenRingApp) {
    const checkpointService = app.requireService(AgentCheckpointService);
    const checkpoint = await checkpointService.retrieveAgentCheckpoint(args.id);
    if (checkpoint) {
      return {
        status: "success",
        checkpoint,
      };
    }

    return { status: "checkpointNotFound" };
  },

  async launchAgentFromCheckpoint(args, app: TokenRingApp) {
    const checkpointService = app.requireService(AgentCheckpointService);
    const agentManager = app.requireService(AgentManager);

    const checkpoint = await checkpointService.retrieveAgentCheckpoint(args.checkpointId);
    if (!checkpoint) {
      return {
        status: "checkpointNotFound",
      };
    }

    const agent = agentManager.spawnAgentFromCheckpoint(checkpoint, {
      headless: args.headless,
    });

    return {
      status: "success",
      agentId: agent.id,
      agentName: agent.displayName,
      agentType: agent.config.agentType,
    };
  },
});
