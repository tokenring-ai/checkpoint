import {Agent, AgentCommandService, AgentLifecycleService} from '@tokenring-ai/agent';
import createTestingAgent from "@tokenring-ai/agent/test/createTestingAgent";
import TokenRingApp from "@tokenring-ai/app";
import createTestingApp from "@tokenring-ai/app/test/createTestingApp";
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import AgentCheckpointService from './AgentCheckpointService.js';
import type {AgentCheckpointStorage} from './AgentCheckpointStorage.js';
import checkpointCommand from './commands/checkpoint.js';
import {history} from './commands/agent-checkpoint/history.js';
import autoCheckpointHook from './hooks/autoCheckpoint.js';
import checkpointRPC from './rpc/checkpoint.js';

vi.mock('@tokenring-ai/web-host');
vi.mock('@tokenring-ai/web-host/JsonRpcResource');

class WebHostService {
  readonly name = "WebHostService"
  description = "Provides access to the Web Host API"
  static registerResource = vi.fn()
}

// Mock provider with realistic implementation
function createMockProvider() : AgentCheckpointStorage {
  const checkpoints = new Map<string, any>();

  return {
    start: async () => {},

    storeAgentCheckpoint: async (data) => {
      const id = `checkpoint-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const checkpoint = {
        id,
        ...data,
        createdAt: Date.now()
      };
      checkpoints.set(id, checkpoint);
      return id;
    },

    retrieveAgentCheckpoint: async (id) => {
      return checkpoints.get(id) || null;
    },

    listAgentCheckpoints: async () => {
      return Array.from(checkpoints.values()).map(cp => ({
        id: cp.id,
        name: cp.name,
        agentId: cp.agentId,
        createdAt: cp.createdAt
      }));
    }
  } satisfies AgentCheckpointStorage;
}


describe('Checkpoint Integration', () => {
  let checkpointService: AgentCheckpointService;
  let app: TokenRingApp;
  let agent: Agent;
  let agentCommandService: AgentCommandService;
  let lifecycleService: AgentLifecycleService;

  beforeEach(() => {
    vi.clearAllMocks();

    app = createTestingApp();
    checkpointService  = new AgentCheckpointService();
    checkpointService.setCheckpointProvider(createMockProvider());
    lifecycleService = new AgentLifecycleService();
    agentCommandService = new AgentCommandService();

    lifecycleService.registerHook('@tokenring-ai/checkpoint/autoCheckpoint', autoCheckpointHook);

    app.addServices(checkpointService,agentCommandService, lifecycleService, new WebHostService());

    agent = createTestingAgent(app);
    checkpointService.attach(agent);

    vi.spyOn(agent, 'restoreState');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('End-to-End Checkpoint Workflow', () => {
    it('should complete full checkpoint lifecycle', async () => {
      // 1. Save checkpoint
      const checkpointId = await checkpointService.saveAgentCheckpoint('Integration Test', agent);
      expect(checkpointId).toBeDefined();
      expect(checkpointId).toMatch(/^checkpoint-\d+-.+$/);

      // 2. List checkpoints
      const checkpoints = await checkpointService.listAgentCheckpoints();
      expect(checkpoints).toHaveLength(1);
      expect(checkpoints[0].name).toBe('Integration Test');

      // 3. Restore checkpoint
      await checkpointService.restoreAgentCheckpoint(checkpointId, agent);
      expect(agent.restoreState).toHaveBeenCalledWith({
        "AgentEventState": {
          "events": [
            {
              "timestamp": expect.any(Number),
              "type": "agent.created",
              "message": "",
            },
          ],
        },
        "AgentExecutionState": {},
        "CommandHistoryState": {
          "commands": [],
        },
        "CostTrackingState": {
          "costs": {}
        },
        "LifecycleState": {
          "enabledHooks": [
           "@tokenring-ai/checkpoint/autoCheckpoint",
          ],
        },
        "TodoState": {
          "todos": [],
        },
      });
    });

    it('should handle multiple checkpoints', async () => {
      // Create multiple checkpoints
      const checkpoint1 = await checkpointService.saveAgentCheckpoint('First Checkpoint', agent);
      const checkpoint2 = await checkpointService.saveAgentCheckpoint('Second Checkpoint', agent);
      
      expect(checkpoint1).not.toBe(checkpoint2);

      // List should show both
      const checkpoints = await checkpointService.listAgentCheckpoints();
      // First checkpoint is automatically created when agent starts
      expect(checkpoints).toHaveLength(2);

      // Restore first checkpoint
      await checkpointService.restoreAgentCheckpoint(checkpoint1, agent);
      expect(agent.restoreState).toHaveBeenCalled();
    });
  });

  describe('Command Integration', () => {
    it('should execute checkpoint create command', async () => {
      await checkpointCommand.execute('create Integration Test Command', agent);
      
      const checkpoints = await checkpointService.listAgentCheckpoints();
      expect(checkpoints).toHaveLength(1);
      expect(checkpoints[0].name).toBe('Integration Test Command');
    });

    it('should execute checkpoint list command', async () => {
      vi.spyOn(agent, 'askQuestion').mockResolvedValue('test-checkpoint-id');
      // Create a checkpoint first
      await checkpointService.saveAgentCheckpoint('List Test', agent);

      await checkpointCommand.execute('list', agent);
      
      expect(agent.askQuestion).toHaveBeenCalled();
    });

    it('should execute history command', async () => {
      vi.spyOn(agent, 'askQuestion').mockResolvedValue('test-checkpoint-id');
      // Create checkpoints
      await checkpointService.saveAgentCheckpoint('History Test 1', agent);
      await checkpointService.saveAgentCheckpoint('History Test 2', agent);
      
      await history('list', agent);
      
      expect(agent.askQuestion).toHaveBeenCalled();
    });
  });

  describe('Hook Integration', () => {
    it('should trigger auto checkpoint hook', async () => {
      const message = 'Auto checkpoint test message';
      await autoCheckpointHook.afterAgentInputComplete(agent, message);
      
      // Check if checkpoint was saved
      const checkpoints = await checkpointService.listAgentCheckpoints();
      expect(checkpoints.length).toBeGreaterThan(0);
    });
  });

  describe('RPC Integration', () => {

    it('should list checkpoints via RPC', async () => {
      // Create a checkpoint first
      await checkpointService.saveAgentCheckpoint('RPC Test', agent);
      
      const result = await checkpointRPC.methods.listCheckpoints.execute({}, app);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('RPC Test');
    });

    it('should get checkpoint via RPC', async () => {
      const checkpointId = await checkpointService.saveAgentCheckpoint('Get Test', agent);
      
      const result = await checkpointRPC.methods.getCheckpoint.execute({ id: checkpointId }, app);
      expect(result).not.toBeNull();
      expect(result.name).toBe('Get Test');
    });

    it('should handle RPC when checkpoint not found', async () => {
      const result = await checkpointRPC.methods.getCheckpoint.execute({ id: 'non-existent-id' }, app);
      expect(result).toBeNull();
    });
  });

  describe('Provider Integration', () => {
    it('should work with mock provider', async () => {
      // Test provider operations
      const id = await checkpointService.saveAgentCheckpoint('Provider Test', agent);
      expect(id).toBeDefined();
      
      const checkpoint = await checkpointService.checkpointProvider.retrieveAgentCheckpoint(id);
      expect(checkpoint).not.toBeNull();
      expect(checkpoint.name).toBe('Provider Test');
      
      const list = await checkpointService.listAgentCheckpoints();
      expect(list).toHaveLength(1);
    });
  });


  describe('Performance Integration', () => {
    it('should handle concurrent operations', async () => {
      const promises: Array<Promise<string>> = [
        checkpointService.saveAgentCheckpoint('Concurrent 1', agent),
        checkpointService.saveAgentCheckpoint('Concurrent 2', agent),
        checkpointService.saveAgentCheckpoint('Concurrent 3', agent)
      ];
      
      const ids = await Promise.all(promises);
      expect(ids).toHaveLength(3);
      expect(new Set(ids).size).toBe(3); // All IDs should be unique
    });

    it('should maintain performance with many checkpoints', async () => {
      const startTime = Date.now();
      
      // Create 50 checkpoints
      for (let i = 0; i < 50; i++) {
        await checkpointService.saveAgentCheckpoint(`Performance Test ${i}`, agent);
      }
      
      const listTime = Date.now();
      const checkpoints = await checkpointService.listAgentCheckpoints();
      const endTime = Date.now();
      
      expect(checkpoints).toHaveLength(50);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});
