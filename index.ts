import {z} from "zod";
import AgentCheckpointService from "./AgentCheckpointService.ts";
import * as chatCommands from "./chatCommands.ts";
import * as hooks from "./hooks.ts";
import packageJSON from "./package.json" with {type: "json"};
import type {AgentTeam, TokenRingPackage} from "@tokenring-ai/agent";

export const CheckpointPackageConfigSchema = z.object({
  defaultProvider: z.string(),
  providers: z.record(z.string(), z.any())
});

export default {
  name: packageJSON.name,
  version: packageJSON.version,
  description: packageJSON.description,
  install(agentTeam: AgentTeam) {
    agentTeam.addChatCommands(chatCommands);
    agentTeam.addHooks(packageJSON.name, hooks);
    agentTeam.addServices(new AgentCheckpointService());
  },

  start(agentTeam: AgentTeam) {
    const config = agentTeam.getConfigSlice("checkpoint", CheckpointPackageConfigSchema);
    agentTeam.services.requireItemByType(AgentCheckpointService).setActiveProviderName(config.defaultProvider);
  }
} as TokenRingPackage;

export {default as AgentStateStorage} from "../checkpoint/AgentCheckpointService.ts";