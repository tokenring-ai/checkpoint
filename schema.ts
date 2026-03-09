import {z} from "zod";

export const AppCheckpointServiceSchema = z.object({
  restorePreviousState: z.boolean().default(false),
}).prefault({});

export type ParsedAppCheckpointConfig = z.output<typeof AppCheckpointServiceSchema>;

export const AgentCheckpointServiceSchema = z.object({
}).prefault({});

export type ParsedAgentCheckpointConfig = z.output<typeof AgentCheckpointServiceSchema>;

export const CheckpointConfigSchema = z.object({
  app: AppCheckpointServiceSchema,
  agent: AgentCheckpointServiceSchema,
}).prefault({});