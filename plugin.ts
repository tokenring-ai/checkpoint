import { AgentCommandService } from "@tokenring-ai/agent";
import type { TokenRingPlugin } from "@tokenring-ai/app";
import { AgentLifecycleService } from "@tokenring-ai/lifecycle";
import { RpcService } from "@tokenring-ai/rpc";

import { z } from "zod";
import AgentCheckpointService from "./AgentCheckpointService.ts";
import AppCheckpointService from "./AppCheckpointService.ts";
import agentCommands from "./commands.ts";
import autoCheckpoint from "./hooks/autoCheckpoint.ts";
import packageJSON from "./package.json" with { type: "json" };
import checkpointRPC from "./rpc/checkpoint.ts";
import { CheckpointConfigSchema } from "./schema.ts";

const packageConfigSchema = z.object({
  checkpoint: CheckpointConfigSchema,
});

export default {
  name: packageJSON.name,
  displayName: "Checkpoint Service",
  version: packageJSON.version,
  description: packageJSON.description,
  install(app) {
    app.addService(new AgentCheckpointService(app));
    app.addService(new AppCheckpointService(app));

    app.waitForService(AgentCommandService, agentCommandService => agentCommandService.addAgentCommands(agentCommands));
    app.waitForService(AgentLifecycleService, lifecycleService => lifecycleService.addHooks(autoCheckpoint));
    app.waitForService(RpcService, rpcService => {
      rpcService.registerEndpoint(checkpointRPC);
    });
  },
  reconfigure(app, config) {
    app.requireService(AgentCheckpointService).reconfigure(config.checkpoint.agent);
    app.requireService(AppCheckpointService).reconfigure(config.checkpoint.app);
  },
  configSchema: packageConfigSchema,
} satisfies TokenRingPlugin<typeof packageConfigSchema>;
