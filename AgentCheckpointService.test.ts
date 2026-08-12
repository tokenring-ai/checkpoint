import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import type { Agent } from "@tokenring-ai/agent";
import createTestingAgent from "@tokenring-ai/agent/test/createTestingAgent.test";
import createTestingApp from "@tokenring-ai/app/test/createTestingApp.test";
import AgentCheckpointService from "./AgentCheckpointService.ts";
import type { AgentCheckpointStorage } from "./AgentCheckpointStorage.ts";

// Mock provider
const mockProvider: AgentCheckpointStorage = {
  displayName: "Mock Provider",
  storeAgentCheckpoint: mock().mockResolvedValue(1234),
  retrieveAgentCheckpoint: mock().mockResolvedValue({
    id: 1234,
    name: "Test Checkpoint",
    agentId: "test-agent-id",
    createdAt: Date.now(),
    state: { testState: "mocked" },
    agentType: "test-agent-type",
    sessionId: "test-session",
  }),
  listAgentCheckpoints: mock().mockResolvedValue({
    items: [
      {
        id: 1234,
        name: "Test Checkpoint",
        agentId: "test-agent-id",
        createdAt: Date.now(),
      },
    ],
    total: 1,
    hasMore: false,
    limit: 50,
    offset: 0,
  }),
};

describe("AgentCheckpointService", () => {
  let service: AgentCheckpointService;
  let mockAgent!: Agent;
  let mockApp: any;

  beforeEach(() => {
    mock.clearAllMocks();

    mockApp = createTestingApp();

    // Service requires app and options
    service = new AgentCheckpointService(mockApp, {});
    service.setCheckpointProvider(mockProvider);
    mockApp.addServices([service]);

    mockAgent = createTestingAgent(mockApp);
  });

  afterEach(() => {
    mock.clearAllMocks();
  });

  describe("Service Properties", () => {
    it("should have correct name and description", () => {
      expect(service.name).toBe("AgentCheckpointService");
      expect(service.description).toBe("Persists agent state to a storage provider");
    });

    it("should implement TokenRingService interface", () => {
      expect(service.name).toBeDefined();
      expect(service.description).toBeDefined();
      expect(typeof service.start).toBe("function");
    });
  });

  describe("Service Lifecycle", () => {
    it("should start successfully", () => {
      expect(() => service.start()).not.toThrow();
    });

    it("should attach to agent", async () => {
      const items: string[] = [];
      const mockCreationContext = {
        items,
      };

      service.attach(mockAgent, mockCreationContext);

      expect(items).toContain("Checkpoint Provider: Mock Provider");
    });
  });

  describe("Checkpoint Operations", () => {
    describe("saveAgentCheckpoint", () => {
      it("should save checkpoint successfully", async () => {
        const checkpointId = await service.saveAgentCheckpoint("Test Checkpoint", mockAgent);

        expect(checkpointId).toBe(1234);
        expect(mockProvider.storeAgentCheckpoint).toHaveBeenCalled();
        const callArgs = (mockProvider.storeAgentCheckpoint as ReturnType<typeof mock>).mock.calls[0]![0];
        expect(callArgs.name).toBe("Test Checkpoint");
        expect(callArgs.agentId).toBe(mockAgent.id);
        expect(callArgs).toHaveProperty("state");
      });

      it("should throw error when no provider is registered", async () => {
        const serviceWithoutProvider = new AgentCheckpointService(mockApp, {});

        expect(serviceWithoutProvider.saveAgentCheckpoint("Test", mockAgent)).rejects.toThrow("No checkpoint provider is registered");
      });
    });

    describe("restoreAgentCheckpoint", () => {
      it("should restore checkpoint successfully", async () => {
        spyOn(mockAgent, "restoreState").mockReturnValue();
        await service.restoreAgentCheckpoint(123, mockAgent);

        expect(mockProvider.retrieveAgentCheckpoint).toHaveBeenCalledWith(123);
        expect(mockAgent.restoreState).toHaveBeenCalledWith({ testState: "mocked" });
      });

      it("should throw error when checkpoint not found", async () => {
        (mockProvider.retrieveAgentCheckpoint as ReturnType<typeof mock>).mockResolvedValueOnce(null);

        expect(service.restoreAgentCheckpoint(999, mockAgent)).rejects.toThrow("Checkpoint 999 not found");
      });

      it("should throw error when no provider is registered", async () => {
        const serviceWithoutProvider = new AgentCheckpointService(mockApp, {});

        expect(serviceWithoutProvider.restoreAgentCheckpoint(123, mockAgent)).rejects.toThrow("No checkpoint provider is registered");
      });
    });

    describe("listAgentCheckpoints", () => {
      it("should list checkpoints successfully", async () => {
        const result = await service.listAgentCheckpoints();

        expect(result.items).toHaveLength(1);
        expect(result.total).toBe(1);
        expect(result.hasMore).toBe(false);
        expect(result.items[0]).toMatchObject({
          id: 1234,
          name: "Test Checkpoint",
          agentId: "test-agent-id",
          createdAt: expect.any(Number),
        });
      });

      it("should throw error when no provider is registered", async () => {
        const serviceWithoutProvider = new AgentCheckpointService(mockApp, {});

        expect(serviceWithoutProvider.listAgentCheckpoints()).rejects.toThrow("No checkpoint provider is registered");
      });
    });

    describe("retrieveAgentCheckpoint", () => {
      it("should retrieve checkpoint successfully", async () => {
        const checkpoint = await service.retrieveAgentCheckpoint(123);

        expect(mockProvider.retrieveAgentCheckpoint).toHaveBeenCalledWith(123);
        expect(checkpoint).toMatchObject({
          id: 1234,
          name: "Test Checkpoint",
          agentId: "test-agent-id",
        });
      });

      it("should throw error when no provider is registered", async () => {
        const serviceWithoutProvider = new AgentCheckpointService(mockApp, {});

        expect(serviceWithoutProvider.retrieveAgentCheckpoint(123)).rejects.toThrow("No checkpoint provider is registered");
      });
    });
  });
});
