import {AgentCheckpointData} from "@tokenring-ai/agent/types";

export interface NamedAgentCheckpoint extends AgentCheckpointData {
  name: string;
}

export interface StoredAgentCheckpoint extends NamedAgentCheckpoint {
  id: string;
}

export type AgentCheckpointListItem = Omit<StoredAgentCheckpoint, "state">;

export interface AgentCheckpointStorage {
  displayName: string;
  storeAgentCheckpoint(data: NamedAgentCheckpoint): Promise<string>;
  retrieveAgentCheckpoint(id: string): Promise<StoredAgentCheckpoint | null>;
  listAgentCheckpoints(): Promise<AgentCheckpointListItem[]>;
}
