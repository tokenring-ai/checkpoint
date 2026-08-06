import { type AppSessionCheckpoint, AppSessionCheckpointSchema } from "@tokenring-ai/app/schema";
import z from "zod";

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

export interface AppCheckpointStorage {
  displayName: string;

  storeAppCheckpoint(data: AppSessionCheckpoint): Promise<number>;

  retrieveAppCheckpoint(id: number): Promise<StoredAppCheckpoint | null>;

  listAppCheckpoints(): Promise<AppSessionListItem[]>;

  retrieveLatestAppCheckpoint(): Promise<StoredAppCheckpoint | null>;
}
