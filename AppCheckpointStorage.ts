import { type AppSessionCheckpoint, AppSessionCheckpointSchema } from "@tokenring-ai/app/schema";
import z from "zod";
import type { CheckpointListOptions, PaginatedResult } from "./AgentCheckpointStorage.ts";

export const StoredAppCheckpointSchema = AppSessionCheckpointSchema.extend({
  id: z.number(),
});

export type StoredAppCheckpoint = z.input<typeof StoredAppCheckpointSchema>;

export const AppCheckpointListItemSchema = StoredAppCheckpointSchema.pick({
  id: true,
  sessionId: true,
  hostname: true,
  workspaceDirectory: true,
  createdAt: true,
});

export type AppSessionListItem = z.output<typeof AppCheckpointListItemSchema>;

export type { CheckpointListOptions, PaginatedResult };

export interface AppCheckpointStorage {
  displayName: string;

  storeAppCheckpoint(data: AppSessionCheckpoint): Promise<number>;

  retrieveAppCheckpoint(id: number): Promise<StoredAppCheckpoint | null>;

  listAppCheckpoints(options?: CheckpointListOptions): Promise<PaginatedResult<AppSessionListItem>>;

  retrieveLatestAppCheckpoint(): Promise<StoredAppCheckpoint | null>;
}
