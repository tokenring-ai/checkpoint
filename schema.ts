import { hostname } from "node:os";
import type { ConfigFieldMeta } from "@tokenring-ai/app/config/metadata";
import { z } from "zod";

export const AppCheckpointServiceSchema = z
  .object({
    restorePreviousState: z
      .boolean()
      .default(false)
      .meta({ description: "Restore the most recent checkpoint automatically on startup" } satisfies ConfigFieldMeta),
    hostname: z
      .string()
      .default(hostname())
      .meta({ hidden: true } satisfies ConfigFieldMeta),
  })
  .prefault({});

export type ParsedAppCheckpointConfig = z.output<typeof AppCheckpointServiceSchema>;

export const AgentCheckpointServiceSchema = z.object({}).prefault({});

export type ParsedAgentCheckpointConfig = z.output<typeof AgentCheckpointServiceSchema>;

export const CheckpointConfigSchema = z
  .object({
    app: AppCheckpointServiceSchema,
    agent: AgentCheckpointServiceSchema,
  })
  .prefault({})
  .meta({ label: "Checkpoint", description: "Save and restore agent/app state snapshots" } satisfies ConfigFieldMeta);
