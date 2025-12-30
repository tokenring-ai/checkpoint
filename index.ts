import {z} from "zod";

export const CheckpointConfigSchema = z.object({
  provider: z.looseObject({
   type: "string"
  })
});

export {default as AgentStateStorage} from "../checkpoint/AgentCheckpointService.ts";