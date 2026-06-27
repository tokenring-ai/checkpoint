import { AgentCheckpointSchema } from "@tokenring-ai/agent/types";
import type { MaybePromise } from "bun";
import z from "zod";

export const NamedAgentCheckpointSchema = AgentCheckpointSchema.extend({
  name: z.string()
});

export type NamedAgentCheckpoint = z.input<typeof NamedAgentCheckpointSchema>;

export const StoredAgentCheckpointSchema = NamedAgentCheckpointSchema.extend({
  id: z.number()
});

export type StoredAgentCheckpoint = z.input<typeof StoredAgentCheckpointSchema>

export type AgentCheckpointListItem = Omit<StoredAgentCheckpoint, "state">;

export interface AgentCheckpointStorage {
  displayName: string;

  storeAgentCheckpoint(data: NamedAgentCheckpoint): MaybePromise<number>;

  retrieveAgentCheckpoint(id: number): MaybePromise<StoredAgentCheckpoint | null>;

  listAgentCheckpoints(): MaybePromise<AgentCheckpointListItem[]>;
}
