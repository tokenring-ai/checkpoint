import type { AgentCheckpointData } from "@tokenring-ai/agent/types";
import type { MaybePromise } from "bun";

export interface NamedAgentCheckpoint extends AgentCheckpointData {
  name: string;
}

export interface StoredAgentCheckpoint extends NamedAgentCheckpoint {
  id: string;
}

export type AgentCheckpointListItem = Omit<StoredAgentCheckpoint, "state">;

export interface AgentCheckpointStorage {
  displayName: string;

  storeAgentCheckpoint(data: NamedAgentCheckpoint): MaybePromise<string>;

  retrieveAgentCheckpoint(id: string): MaybePromise<StoredAgentCheckpoint | null>;

  listAgentCheckpoints(): MaybePromise<AgentCheckpointListItem[]>;
}
