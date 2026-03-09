import type {AppSessionCheckpoint} from "@tokenring-ai/app/types";

export interface StoredAppCheckpoint extends AppSessionCheckpoint {
  id: string;
}
export type AppSessionListItem = Omit<StoredAppCheckpoint, "state">;

export interface AppCheckpointStorage {
  displayName: string;
  storeAppCheckpoint(data: AppSessionCheckpoint): Promise<string>;
  retrieveAppCheckpoint(id: string): Promise<StoredAppCheckpoint | null>;
  listAppCheckpoints(): Promise<AppSessionListItem[]>;
  retrieveLatestAppCheckpoint(): Promise<StoredAppCheckpoint | null>;
}
