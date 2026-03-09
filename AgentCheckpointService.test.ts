import {Agent, AgentLifecycleService} from '@tokenring-ai/agent';
import createTestingAgent from "@tokenring-ai/agent/test/createTestingAgent";
import createTestingApp from "@tokenring-ai/app/test/createTestingApp";
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import AgentCheckpointService from './AgentCheckpointService.js';
import type {AgentCheckpointStorage} from './AgentCheckpointStorage.js';
import autoCheckpointHook from './hooks/autoCheckpoint.js';

// Mock provider
const mockProvider: AgentCheckpointStorage = {
  start: vi.fn().mockResolvedValue(undefined),
  storeAgentCheckpoint: vi.fn().mockResolvedValue('checkpoint-id-123'),
  retrieveAgentCheckpoint: vi.fn().mockResolvedValue({
    id: 'checkpoint-id-123',
    name: 'Test Checkpoint',
    agentId: 'test-agent-id',
    createdAt: Date.now(),
    state: { testState: 'mocked' },
    config: { testConfig: 'mocked' },
    previousResponseId: 'test-response-id'
  }),
  listAgentCheckpoints: vi.fn().mockResolvedValue([
    {
      id: 'checkpoint-id-123',
      name: 'Test Checkpoint',
      agentId: 'test-agent-id',
      createdAt: Date.now()
    }
  ])
};

describe('AgentCheckpointService', () => {
  let service: AgentCheckpointService;
  let lifecycleService!: AgentLifecycleService;
  let mockAgent!: Agent;

  beforeEach(() => {
    vi.clearAllMocks();

    const app = createTestingApp();
    lifecycleService = new AgentLifecycleService();
    
    // Register the autoCheckpoint hook before adding services
    lifecycleService.registerHook('@tokenring-ai/checkpoint/autoCheckpoint', autoCheckpointHook);
    
    app.addServices(lifecycleService);

    service = new AgentCheckpointService({});
    service.setCheckpointProvider(mockProvider);
    app.addServices(service);

    mockAgent = createTestingAgent(app);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Service Properties', () => {
    it('should have correct name and description', () => {
      expect(service.name).toBe('AgentCheckpointService');
      expect(service.description).toBe('Persists agent state to a storage provider');
    });

    it('should implement TokenRingService interface', () => {
      expect(service.name).toBeDefined();
      expect(service.description).toBeDefined();
      expect(typeof service.start).toBe('function');
    });
  });


  describe('Service Lifecycle', () => {
    it('should start successfully', async () => {
      await expect(service.start()).resolves.not.toThrow();
    });

    it('should attach to agent', async () => {
      vi.spyOn(lifecycleService, 'enableHooks').mockReturnValue();
      await service.attach(mockAgent);
      
      expect(lifecycleService.enableHooks).toHaveBeenCalledWith(
        ['@tokenring-ai/checkpoint/autoCheckpoint'],
        mockAgent
      );
    });
  });

  describe('Checkpoint Operations', () => {
    describe('saveAgentCheckpoint', () => {
      it('should save checkpoint successfully', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: false });

        const checkpointId = await service.saveAgentCheckpoint('Test Checkpoint', mockAgent);
        

        expect(checkpointId).toBe('checkpoint-id-123');
        expect(mockProvider.storeAgentCheckpoint).toHaveBeenCalledExactlyOnceWith({
          agentId: mockAgent.id,
          createdAt: Date.now(),
          config: mockAgent.config,
          name: 'Test Checkpoint',
          state: {
            "AgentEventState": {
              "events": [
                {
                  "timestamp": expect.any(Number),
                  "message": "",
                  "type": "agent.created",
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
            "HooksState": {
              "enabledHooks": [
               "@tokenring-ai/checkpoint/autoCheckpoint",
              ],
            },
            "TodoState": {
              "todos": [],
            },
          },
        });
      });

      it('should use default label when none provided', async () => {
        await service.saveAgentCheckpoint(undefined as any, mockAgent);
        
        expect(mockProvider.storeAgentCheckpoint).toHaveBeenCalled();
      });
    });

    describe('restoreAgentCheckpoint', () => {
      it('should restore checkpoint successfully', async () => {
        vi.spyOn(mockAgent, 'restoreState')
        await service.restoreAgentCheckpoint('checkpoint-id-123', mockAgent);
        
        expect(mockProvider.retrieveAgentCheckpoint).toHaveBeenCalledWith('checkpoint-id-123');
        expect(mockAgent.restoreState).toHaveBeenCalledWith({ testState: 'mocked' });
      });

      it('should throw error when checkpoint not found', async () => {
        mockProvider.retrieveAgentCheckpoint.mockResolvedValueOnce(null);
        
        await expect(service.restoreAgentCheckpoint('non-existent', mockAgent))
          .rejects.toThrow('Checkpoint non-existent not found');
      });
    });

    describe('listCheckpoints', () => {
      it('should list checkpoints successfully', async () => {
        const checkpoints = await service.listAgentCheckpoints();
        
        expect(checkpoints).toHaveLength(1);
        expect(checkpoints[0]).toMatchObject({
          id: 'checkpoint-id-123',
          name: 'Test Checkpoint',
          agentId: 'test-agent-id',
          createdAt: expect.any(Number)
        });
      });
    });
  });
});
