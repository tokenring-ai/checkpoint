import {z} from "zod";

export const CheckpointPluginConfigSchema = z.object({
  defaultProvider: z.string(),
  providers: z.record(z.string(), z.any())
});



export {default as AgentStateStorage} from "../checkpoint/AgentCheckpointService.ts";