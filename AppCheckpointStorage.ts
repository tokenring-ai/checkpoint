import { type AppSessionCheckpoint, AppSessionCheckpointSchema } from "@tokenring-ai/app/schema";
import z from "zod";

export const StoredAppCheckpointSchema = AppSessionCheckpointSchema.extend({
  id: z.string().transform(v => typeof v === 'number' ? String(v) : v)
});

export type StoredAppCheckpoint = z.input<typeof StoredAppCheckpointSchema>

export type AppSessionListItem = Omit<StoredAppCheckpoint, "state">;

export interface AppCheckpointStorage {
  displayName: string;

  storeAppCheckpoint(data: AppSessionCheckpoint): Promise<string>;

  retrieveAppCheckpoint(id: string): Promise<StoredAppCheckpoint | null>;

  listAppCheckpoints(): Promise<AppSessionListItem[]>;

  retrieveLatestAppCheckpoint(): Promise<StoredAppCheckpoint | null>;
}
