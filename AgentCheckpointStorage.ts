import { AgentCheckpointSchema } from "@tokenring-ai/agent/types";
import type { MaybePromise } from "bun";
import z from "zod";

export const NamedAgentCheckpointSchema = AgentCheckpointSchema.extend({
  name: z.string(),
});

export type NamedAgentCheckpoint = z.input<typeof NamedAgentCheckpointSchema>;

export const StoredAgentCheckpointSchema = NamedAgentCheckpointSchema.extend({
  id: z.number(),
});

export type StoredAgentCheckpoint = z.input<typeof StoredAgentCheckpointSchema>;

export const AgentCheckpointListItemSchema = StoredAgentCheckpointSchema.pick({
  id: true,
  sessionId: true,
  name: true,
  agentId: true,
  agentType: true,
  createdAt: true,
});

export type AgentCheckpointListItem = z.output<typeof AgentCheckpointListItemSchema>;

/** Options for filtered, paginated checkpoint listing. */
export const CheckpointListOptionsSchema = z.object({
  sessionId: z.string().optional(),
  agentId: z.string().optional(),
  agentType: z.string().optional(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional(),
  /** Include only rows with createdAt strictly less than this timestamp (ms). */
  before: z.number().optional(),
  /** Include only rows with createdAt strictly greater than this timestamp (ms). */
  after: z.number().optional(),
  orderBy: z.enum(["createdAt", "id"]).optional(),
  orderDir: z.enum(["ASC", "DESC"]).optional(),
});

export type CheckpointListOptions = z.input<typeof CheckpointListOptionsSchema>;

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  hasMore: boolean;
  limit: number;
  offset: number;
};

export const DEFAULT_CHECKPOINT_LIST_LIMIT = 50;

export interface AgentCheckpointStorage {
  displayName: string;

  storeAgentCheckpoint(data: NamedAgentCheckpoint): MaybePromise<number>;

  retrieveAgentCheckpoint(id: number): MaybePromise<StoredAgentCheckpoint | null>;

  listAgentCheckpoints(options?: CheckpointListOptions): MaybePromise<PaginatedResult<AgentCheckpointListItem>>;
}
