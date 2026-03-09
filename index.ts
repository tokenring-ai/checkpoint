import {z} from "zod";

export const CheckpointConfigSchema = z.object({
  provider: z.looseObject({
    type: z.string()
  })
});

export {default as AgentCheckpointService} from "./AgentCheckpointService.js";
export {default as AgentStateStorage} from "./AgentCheckpointService.js";

export type {AppCheckpointStorage, AppSessionListItem, StoredAppCheckpoint} from "./AppCheckpointStorage.js";
