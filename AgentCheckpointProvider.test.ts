import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import type { AgentCheckpointListItem, AgentCheckpointStorage, NamedAgentCheckpoint, StoredAgentCheckpoint } from "./AgentCheckpointStorage.ts";

describe("AgentCheckpointProvider Interface", () => {
  let provider: AgentCheckpointStorage & {
    start: () => Promise<void>;
  };

  beforeEach(() => {
    // Create a mock implementation of the provider interface
    provider = {
      displayName: "Mock Provider",
      start: mock().mockResolvedValue(undefined),
      storeAgentCheckpoint: mock().mockResolvedValue(1234),
      retrieveAgentCheckpoint: mock().mockResolvedValue({
        id: 1234,
        name: "Mock Checkpoint",
        agentId: "mock-agent-id",
        createdAt: Date.now(),
        state: { mockState: "mock" },
        agentType: "mock-agent-type",
        sessionId: "mock-session",
      }),
      listAgentCheckpoints: mock().mockResolvedValue({
        items: [
          {
            id: 1234,
            name: "Mock Checkpoint",
            agentId: "mock-agent-id",
            createdAt: Date.now(),
          },
        ],
        total: 1,
        hasMore: false,
        limit: 50,
        offset: 0,
      }),
    };
  });

  afterEach(() => {
    mock.clearAllMocks();
  });

  describe("Interface Requirements", () => {
    it("should have displayName property", () => {
      expect(typeof provider.displayName).toBe("string");
    });

    it("should have start method", () => {
      expect(typeof provider.start).toBe("function");
    });

    it("should have storeAgentCheckpoint method", () => {
      expect(typeof provider.storeAgentCheckpoint).toBe("function");
    });

    it("should have retrieveAgentCheckpoint method", () => {
      expect(typeof provider.retrieveAgentCheckpoint).toBe("function");
    });

    it("should have listAgentCheckpoints method", () => {
      expect(typeof provider.listAgentCheckpoints).toBe("function");
    });
  });

  describe("Data Structures", () => {
    it("should handle NamedAgentCheckpoint correctly", () => {
      const checkpoint: NamedAgentCheckpoint = {
        name: "Test Checkpoint",
        agentId: "test-agent-id",
        sessionId: "test-session",
        createdAt: Date.now(),
        agentType: "test-agent-type",
        state: { testState: "test" },
      };

      expect(checkpoint).toMatchObject({
        name: expect.any(String),
        state: expect.any(Object),
        agentType: expect.any(String),
        sessionId: expect.any(String),
      });
    });

    it("should handle StoredAgentCheckpoint correctly", () => {
      const storedCheckpoint: StoredAgentCheckpoint = {
        id: 123,
        name: "Test Checkpoint",
        agentId: "test-agent-id",
        createdAt: Date.now(),
        state: { testState: "test" },
        agentType: "test-agent-type",
        sessionId: "test-session",
      };

      expect(storedCheckpoint).toMatchObject({
        id: expect.any(Number),
        name: expect.any(String),
        agentId: expect.any(String),
        createdAt: expect.any(Number),
        state: expect.any(Object),
        agentType: expect.any(String),
        sessionId: expect.any(String),
      });
    });

    it("should handle AgentCheckpointListItem correctly", () => {
      const listItem: AgentCheckpointListItem = {
        id: 123,
        name: "Test Checkpoint",
        agentId: "test-agent-id",
        sessionId: "test-session",
        agentType: "test-agent-type",
        createdAt: Date.now(),
      };

      expect(listItem).toMatchObject({
        id: expect.any(Number),
        name: expect.any(String),
        agentId: expect.any(String),
        createdAt: expect.any(Number),
      });

      // Should not have state, agentType, sessionId, or previousResponseId properties
      expect((listItem as any).state).toBeUndefined();
      expect((listItem as any).previousResponseId).toBeUndefined();
    });
  });

  describe("Provider Operations", () => {
    it("should start successfully", async () => {
      await expect(provider.start()).resolves.toBeUndefined();
    });

    it("should store checkpoint", async () => {
      const checkpointData: NamedAgentCheckpoint = {
        name: "Test Checkpoint",
        agentId: "test-agent-id",
        sessionId: "test-session",
        createdAt: Date.now(),
        agentType: "test-agent-type",
        state: { testState: "test" },
      };

      const result = await provider.storeAgentCheckpoint(checkpointData);

      expect(result).toBe(1234);
      expect(provider.storeAgentCheckpoint).toHaveBeenCalledWith(checkpointData);
    });

    it("should retrieve checkpoint", async () => {
      const result = await provider.retrieveAgentCheckpoint(1);

      expect(result).toMatchObject({
        id: 1234,
        name: expect.any(String),
        agentId: expect.any(String),
        createdAt: expect.any(Number),
        state: expect.any(Object),
        agentType: expect.any(String),
        sessionId: expect.any(String),
      });
    });

    it("should return null when checkpoint not found", async () => {
      (provider.retrieveAgentCheckpoint as ReturnType<typeof mock>).mockResolvedValueOnce(null);

      const result = await provider.retrieveAgentCheckpoint(999);

      expect(result).toBeNull();
    });

    it("should list checkpoints", async () => {
      const result = await provider.listAgentCheckpoints();

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.items[0]).toMatchObject({
        id: expect.any(Number),
        name: expect.any(String),
        agentId: expect.any(String),
        createdAt: expect.any(Number),
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle storage errors", async () => {
      (provider.storeAgentCheckpoint as ReturnType<typeof mock>).mockRejectedValueOnce(new Error("Storage failed"));

      const checkpointData: NamedAgentCheckpoint = {
        name: "Test Checkpoint",
        agentId: "test-agent-id",
        sessionId: "test-session",
        createdAt: Date.now(),
        agentType: "test-agent-type",
        state: { testState: "test" },
      };

      expect(provider.storeAgentCheckpoint(checkpointData)).rejects.toThrow("Storage failed");
    });

    it("should handle retrieval errors", async () => {
      (provider.retrieveAgentCheckpoint as ReturnType<typeof mock>).mockRejectedValueOnce(new Error("Retrieval failed"));

      expect(provider.retrieveAgentCheckpoint(123)).rejects.toThrow("Retrieval failed");
    });

    it("should handle listing errors", async () => {
      (provider.listAgentCheckpoints as ReturnType<typeof mock>).mockRejectedValueOnce(new Error("Listing failed"));

      expect(provider.listAgentCheckpoints()).rejects.toThrow("Listing failed");
    });
  });

  describe("Data Validation", () => {
    it("should validate checkpoint data structure", () => {
      const validCheckpoint: NamedAgentCheckpoint = {
        name: "Valid Checkpoint",
        agentId: "valid-agent-id",
        sessionId: "valid-session",
        createdAt: Date.now(),
        agentType: "valid-agent-type",
        state: { valid: true },
      };

      expect(validCheckpoint.name).toBeDefined();
      expect(validCheckpoint.state).toBeDefined();
      expect(validCheckpoint.agentType).toBeDefined();
      expect(validCheckpoint.sessionId).toBeDefined();
    });

    it("should handle empty state", () => {
      const minimalCheckpoint: NamedAgentCheckpoint = {
        name: "Minimal Checkpoint",
        agentId: "minimal-agent-id",
        sessionId: "minimal-session",
        createdAt: Date.now(),
        agentType: "minimal-agent-type",
        state: {},
      };

      expect(minimalCheckpoint.state).toEqual({});
    });

    it("should handle complex nested data", () => {
      const complexCheckpoint: NamedAgentCheckpoint = {
        name: "Complex Checkpoint",
        agentId: "complex-agent-id",
        sessionId: "complex-session",
        createdAt: Date.now(),
        agentType: "complex-agent-type",
        state: {
          nested: {
            deep: {
              value: "deep-value",
            },
            array: [1, 2, 3],
            boolean: true,
            nullValue: null,
          },
        },
      };

      const nested = complexCheckpoint.state.nested as { deep: { value: string }; array: number[] };
      expect(nested.deep.value).toBe("deep-value");
      expect(nested.array).toEqual([1, 2, 3]);
    });
  });
});
