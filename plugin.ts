import { AgentCommandService } from "@tokenring-ai/agent";
import type { TokenRingPlugin } from "@tokenring-ai/app";
import { AgentLifecycleService } from "@tokenring-ai/lifecycle";
import { RpcService } from "@tokenring-ai/rpc";

import { z } from "zod";
import AgentCheckpointService from "./AgentCheckpointService.ts";
import AppCheckpointService from "./AppCheckpointService.ts";
import agentCommands from "./commands.ts";
import hooks from "./hooks.ts";
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
  install(app, config) {
    const agentCheckpointService = new AgentCheckpointService(app, config.checkpoint.agent);
    app.addServices(agentCheckpointService);

    const appCheckpointService = new AppCheckpointService(app, config.checkpoint.app);
    app.addServices(appCheckpointService);

    app.waitForService(AgentCommandService, agentCommandService => agentCommandService.addAgentCommands(agentCommands));
    app.waitForService(AgentLifecycleService, lifecycleService => lifecycleService.addHooks(hooks));
    app.waitForService(RpcService, rpcService => {
      rpcService.registerEndpoint(checkpointRPC);
    });
  },
  config: packageConfigSchema,
} satisfies TokenRingPlugin<typeof packageConfigSchema>;
