import {z} from "zod";

export const CheckpointConfigSchema = z.object({
  provider: z.looseObject({
    type: z.string(),
  })
});