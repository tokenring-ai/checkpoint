import TokenRingApp from "@tokenring-ai/app";
import {AgentCommandService, AgentLifecycleService} from "@tokenring-ai/agent";
import {TokenRingPlugin} from "@tokenring-ai/app";
import {z} from "zod";
import AgentCheckpointService from "./AgentCheckpointService.ts";
import * as chatCommands from "./chatCommands.ts";
import * as hooks from "./hooks.ts";
import packageJSON from "./package.json" with {type: "json"};

export const CheckpointPackageConfigSchema = z.object({
  defaultProvider: z.string(),
  providers: z.record(z.string(), z.any())
});

export default {
  name: packageJSON.name,
  version: packageJSON.version,
  description: packageJSON.description,
  install(app: TokenRingApp) {
    app.waitForService(AgentCommandService, agentCommandService =>
      agentCommandService.addAgentCommands(chatCommands)
    );
    app.waitForService(AgentLifecycleService, lifecycleService =>
      lifecycleService.addHooks(packageJSON.name, hooks)
    );
    app.addServices(new AgentCheckpointService());
  },

  start(app: TokenRingApp) {
    const config = app.getConfigSlice("checkpoint", CheckpointPackageConfigSchema);
    app.requireService(AgentCheckpointService).setActiveProviderName(config.defaultProvider);
  }
} as TokenRingPlugin;

export {default as AgentStateStorage} from "../checkpoint/AgentCheckpointService.ts";