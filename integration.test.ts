import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { type Agent, AgentCommandService } from "@tokenring-ai/agent";
import createTestingAgent from "@tokenring-ai/agent/test/createTestingAgent.test";
import type TokenRingApp from "@tokenring-ai/app";
import createTestingApp from "@tokenring-ai/app/test/createTestingApp.test";
import { AfterAgentInputHandled } from "@tokenring-ai/lifecycle/util/hooks";
import EnhancedMap from "@tokenring-ai/utility/map/enhancedMap";
import AgentCheckpointService from "./AgentCheckpointService.ts";
import type { AgentCheckpointStorage } from "./AgentCheckpointStorage.ts";
import createCheckpointCommand from "./commands/agent-checkpoint/create.ts";
import historyCommand from "./commands/agent-checkpoint/history.ts";
import listCheckpointCommand from "./commands/agent-checkpoint/list.ts";
import restoreCheckpointCommand from "./commands/agent-checkpoint/restore.ts";
import autoCheckpointHook from "./hooks/autoCheckpoint.ts";
import checkpointRPC from "./rpc/checkpoint.ts";

void mock.module("@tokenring-ai/web-host", () => ({}));
void mock.module("@tokenring-ai/web-host/JsonRpcResource", () => ({}));

class WebHostService {
  static registerResource = mock();
  readonly name = "WebHostService";
  description = "Provides access to the Web Host API";
}

// Mock provider with realistic implementation
function createMockProvider(): AgentCheckpointStorage {
  const checkpoints = new EnhancedMap<number, any>();
  let nextId = 1;

  return {
    displayName: "Mock Provider",

    storeAgentCheckpoint: async data => {
      const id = nextId++;
      const checkpoint = {
        id,
        ...data,
        createdAt: Date.now(),
      };
      checkpoints.set(id, checkpoint);
      return id;
    },

    retrieveAgentCheckpoint: async id => {
      return checkpoints.get(id) ?? null;
    },

    listAgentCheckpoints: async () => {
      return checkpoints.mapValues(cp => ({
        id: cp.id,
        name: cp.name,
        sessionId: cp.sessionId,
        agentId: cp.agentId,
        agentType: cp.agentType,
        createdAt: cp.createdAt,
      }));
    },
  } satisfies AgentCheckpointStorage;
}

describe("Checkpoint Integration", () => {
  let checkpointService: AgentCheckpointService;
  let app: TokenRingApp;
  let agent: Agent;
  let agentCommandService: AgentCommandService;

  beforeEach(() => {
    mock.clearAllMocks();

    app = createTestingApp();
    checkpointService = new AgentCheckpointService(app, {});
    checkpointService.setCheckpointProvider(createMockProvider());
    agentCommandService = new AgentCommandService();

    app.addServices([checkpointService, agentCommandService, new WebHostService()]);

    agent = createTestingAgent(app);
    checkpointService.attach(agent, { items: [] });

    spyOn(agent, "restoreState");
  });

  afterEach(() => {
    mock.clearAllMocks();
  });

  describe("End-to-End Checkpoint Workflow", () => {
    it("should complete full checkpoint lifecycle", async () => {
      // 1. Save checkpoint
      const checkpointId = await checkpointService.saveAgentCheckpoint("Integration Test", agent);
      expect(checkpointId).toBeDefined();
      expect(checkpointId).toEqual(expect.any(Number));

      // 2. List checkpoints
      const checkpoints = await checkpointService.listAgentCheckpoints();
      expect(checkpoints).toHaveLength(1);
      expect(checkpoints[0]!.name).toBe("Integration Test");

      // 3. Restore checkpoint
      await checkpointService.restoreAgentCheckpoint(checkpointId, agent);
      expect(agent.restoreState).toHaveBeenCalled();
    });

    it("should handle multiple checkpoints", async () => {
      // Create multiple checkpoints
      const checkpoint1 = await checkpointService.saveAgentCheckpoint("First Checkpoint", agent);
      const checkpoint2 = await checkpointService.saveAgentCheckpoint("Second Checkpoint", agent);

      expect(checkpoint1).not.toBe(checkpoint2);

      // List should show both
      const checkpoints = await checkpointService.listAgentCheckpoints();
      expect(checkpoints).toHaveLength(2);

      // Restore first checkpoint
      await checkpointService.restoreAgentCheckpoint(checkpoint1, agent);
      expect(agent.restoreState).toHaveBeenCalled();
    });
  });

  describe("Command Integration", () => {
    it("should execute checkpoint create command", async () => {
      const result = await createCheckpointCommand.execute({ args: {}, remainder: "Integration Test Command", agent });

      const checkpoints = await checkpointService.listAgentCheckpoints();
      expect(checkpoints).toHaveLength(1);
      expect(checkpoints[0]!.name).toBe("Integration Test Command");
      expect(result).toContain("Checkpoint created");
    });

    it("should execute checkpoint list command with empty list", async () => {
      // Don't create any checkpoints - use fresh provider
      const emptyProvider = createMockProvider();
      checkpointService.setCheckpointProvider(emptyProvider);

      const result = await listCheckpointCommand.execute({ args: {}, agent });

      expect(result).toBe("No checkpoints saved. Use /agent checkpoint create to make one.");
    });

    it("should execute checkpoint restore command", async () => {
      const checkpointId = await checkpointService.saveAgentCheckpoint("Restore Test", agent);

      spyOn(agent, "restoreState").mockReturnValue();
      const result = await restoreCheckpointCommand.execute({ args: { checkpointId: String(checkpointId) }, agent });

      expect(result).toBe(`Checkpoint ${checkpointId} loaded`);
      expect(agent.restoreState).toHaveBeenCalled();
    });

    it("should execute history command", async () => {
      spyOn(agent, "askQuestion").mockResolvedValue(null); // Cancel selection

      // Create checkpoints
      await checkpointService.saveAgentCheckpoint("History Test 1", agent);
      await checkpointService.saveAgentCheckpoint("History Test 2", agent);

      const result = await historyCommand.execute({ agent });

      expect(result).toBe("Checkpoint browsing cancelled.");
    });
  });

  describe("Hook Integration", () => {
    it("should trigger auto checkpoint hook", async () => {
      const message = "Auto checkpoint test message";

      const hook = autoCheckpointHook.callbacks.find(cb => cb.hookConstructor === AfterAgentInputHandled);
      expect(hook).toBeDefined();

      const requestData = new AfterAgentInputHandled({ input: { message } } as any, {} as any);
      await hook?.callback(requestData, agent);

      // Check if checkpoint was saved
      const checkpoints = await checkpointService.listAgentCheckpoints();
      expect(checkpoints.length).toBeGreaterThan(0);
    });
  });

  describe("RPC Integration", () => {
    it("should list checkpoints via RPC", async () => {
      // Create a checkpoint first
      await checkpointService.saveAgentCheckpoint("RPC Test", agent);

      const result = await checkpointRPC.methods.listCheckpoints.execute({}, app);
      expect(result).toHaveLength(1);
      expect(result[0]!.name).toBe("RPC Test");
    });

    it("should get checkpoint via RPC", async () => {
      const checkpointId = await checkpointService.saveAgentCheckpoint("Get Test", agent);

      const result = await checkpointRPC.methods.getCheckpoint.execute({ id: checkpointId }, app);
      expect(result.status).toBe("success");
      if (result.status === "success") {
        expect(result.checkpoint?.name).toBe("Get Test");
      }
    });

    it("should handle RPC when checkpoint not found", async () => {
      const result = await checkpointRPC.methods.getCheckpoint.execute({ id: 999999 }, app);
      expect(result).toEqual({ status: "checkpointNotFound" });
    });
  });

  describe("Provider Integration", () => {
    it("should work with mock provider", async () => {
      // Test provider operations
      const id = await checkpointService.saveAgentCheckpoint("Provider Test", agent);
      expect(id).toBeDefined();

      const checkpoint = await checkpointService.checkpointProvider?.retrieveAgentCheckpoint(id);
      expect(checkpoint).not.toBeNull();
      expect(checkpoint?.name).toBe("Provider Test");

      const list = await checkpointService.listAgentCheckpoints();
      expect(list).toHaveLength(1);
    });
  });

  describe("Performance Integration", () => {
    it("should handle concurrent operations", async () => {
      const promises: Array<Promise<number>> = [
        checkpointService.saveAgentCheckpoint("Concurrent 1", agent),
        checkpointService.saveAgentCheckpoint("Concurrent 2", agent),
        checkpointService.saveAgentCheckpoint("Concurrent 3", agent),
      ];

      const ids = await Promise.all(promises);
      expect(ids).toHaveLength(3);
      expect(new Set(ids).size).toBe(3); // All IDs should be unique
    });

    it("should maintain performance with many checkpoints", async () => {
      const startTime = Date.now();

      // Create 50 checkpoints
      for (let i = 0; i < 50; i++) {
        await checkpointService.saveAgentCheckpoint(`Performance Test ${i}`, agent);
      }

      const checkpoints = await checkpointService.listAgentCheckpoints();
      const endTime = Date.now();

      expect(checkpoints).toHaveLength(50);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});
