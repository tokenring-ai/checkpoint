import TokenRingApp from "@tokenring-ai/app";
import {AgentCommandService, AgentLifecycleService} from "@tokenring-ai/agent";
import {TokenRingPlugin} from "@tokenring-ai/app";
import {WebHostService} from "@tokenring-ai/web-host";
import JsonRpcResource from "@tokenring-ai/web-host/JsonRpcResource";
import AgentCheckpointService from "./AgentCheckpointService.ts";
import chatCommands from "./chatCommands.ts";
import hooks from "./hooks.ts";
import {CheckpointPluginConfigSchema} from "./index.ts";
import packageJSON from "./package.json" with {type: "json"};
import checkpointRPC from "./rpc/checkpoint.ts";


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
    app.waitForService(WebHostService, webHostService => {
      webHostService.registerResource("Checkpoint RPC endpoint", new JsonRpcResource(app, checkpointRPC));
    });
  },

  start(app: TokenRingApp) {
    const config = app.getConfigSlice("checkpoint", CheckpointPluginConfigSchema);
    app.requireService(AgentCheckpointService).setActiveProviderName(config.defaultProvider);
  }
} as TokenRingPlugin;
