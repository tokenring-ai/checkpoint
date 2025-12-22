import {Agent, AgentLifecycleService} from '@tokenring-ai/agent';
import createTestingAgent from "@tokenring-ai/agent/test/createTestingAgent";
import createTestingApp from "@tokenring-ai/app/test/createTestingApp";
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import type {AgentCheckpointProvider} from './AgentCheckpointProvider.js';
import AgentCheckpointService from './AgentCheckpointService.js';

// Mock provider
const mockProvider: AgentCheckpointProvider = {
  start: vi.fn().mockResolvedValue(undefined),
  storeCheckpoint: vi.fn().mockResolvedValue('checkpoint-id-123'),
  retrieveCheckpoint: vi.fn().mockResolvedValue({
    id: 'checkpoint-id-123',
    name: 'Test Checkpoint',
    agentId: 'test-agent-id',
    createdAt: Date.now(),
    state: { testState: 'mocked' },
    config: { testConfig: 'mocked' },
    previousResponseId: 'test-response-id'
  }),
  listCheckpoints: vi.fn().mockResolvedValue([
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
    app.addServices(lifecycleService);

    service = new AgentCheckpointService();
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
      expect(typeof service.run).toBe('function');
    });
  });

  describe('Provider Registration', () => {
    it('should register a provider', () => {
      service.registerProvider('test-provider', mockProvider);
      
      expect(service.getAvailableProviders()).toContain('test-provider');
    });

    it('should get active provider', () => {
      service.registerProvider('test-provider', mockProvider);
      service.setActiveProviderName('test-provider');
      
      expect(service.getActiveProviderName()).toBe('test-provider');
      expect(service.getActiveProvider()).toBe(mockProvider);
    });

    it('should throw error when no active provider is set', () => {
      expect(() => service.getActiveProvider()).toThrow();
    });
  });

  describe('Service Lifecycle', () => {
    it('should run successfully', async () => {
      service.registerProvider('test-provider', mockProvider);
      service.setActiveProviderName('test-provider');
      
      await expect(service.run()).resolves.not.toThrow();
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
    beforeEach(() => {
      service.registerProvider('test-provider', mockProvider);
      service.setActiveProviderName('test-provider');
    });

    describe('saveAgentCheckpoint', () => {
      it('should save checkpoint successfully', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: false });

        const checkpointId = await service.saveAgentCheckpoint('Test Checkpoint', mockAgent);
        

        expect(checkpointId).toBe('checkpoint-id-123');
        expect(mockProvider.storeCheckpoint).toHaveBeenCalledExactlyOnceWith({
          agentId: mockAgent.id,
          createdAt: Date.now(),
          config: mockAgent.config,
          name: 'Test Checkpoint',
          state: {
            "AgentEventState": {
              "busyWith": null,
              "events": [],
              "idle": true,
            },
            "CommandHistoryState": {
              "commands": [],
            },
            "CostTrackingState": {},
            "HooksState": {
              "enabledHooks": [],
            },
          },
        });
      });

      it('should use default label when none provided', async () => {
        await service.saveAgentCheckpoint(undefined as any, mockAgent);
        
        expect(mockProvider.storeCheckpoint).toHaveBeenCalled();
      });
    });

    describe('restoreAgentCheckpoint', () => {
      it('should restore checkpoint successfully', async () => {
        vi.spyOn(mockAgent, 'restoreState')
        await service.restoreAgentCheckpoint('checkpoint-id-123', mockAgent);
        
        expect(mockProvider.retrieveCheckpoint).toHaveBeenCalledWith('checkpoint-id-123');
        expect(mockAgent.restoreState).toHaveBeenCalledWith({ testState: 'mocked' });
      });

      it('should throw error when checkpoint not found', async () => {
        mockProvider.retrieveCheckpoint.mockResolvedValueOnce(null);
        
        await expect(service.restoreAgentCheckpoint('non-existent', mockAgent))
          .rejects.toThrow('Checkpoint non-existent not found');
      });
    });

    describe('listCheckpoints', () => {
      it('should list checkpoints successfully', async () => {
        const checkpoints = await service.listCheckpoints();
        
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

  describe('Error Handling', () => {
    it('should handle provider startup failures', async () => {
      const failingProvider: AgentCheckpointProvider = {
        start: vi.fn().mockRejectedValue(new Error('Startup failed')),
        storeCheckpoint: vi.fn().mockRejectedValue(new Error('Store failed')),
        retrieveCheckpoint: vi.fn().mockRejectedValue(new Error('Retrieve failed')),
        listCheckpoints: vi.fn().mockRejectedValue(new Error('List failed'))
      };
      
      service.registerProvider('failing-provider', failingProvider);
      service.setActiveProviderName('failing-provider');
      
      await expect(service.run()).rejects.toThrow('Startup failed');
    });
  });

  describe('Provider Management', () => {
    it('should handle multiple providers', () => {
      const provider2: AgentCheckpointProvider = {
        ...mockProvider,
        storeCheckpoint: vi.fn().mockResolvedValue('checkpoint-id-456')
      };
      
      service.registerProvider('provider-1', mockProvider);
      service.registerProvider('provider-2', provider2);
      service.setActiveProviderName('provider-1');
      
      expect(service.getAvailableProviders()).toEqual(['provider-1', 'provider-2']);
      
      service.setActiveProviderName('provider-2');
      expect(service.getActiveProviderName()).toBe('provider-2');
    });

    it('should switch between providers', async () => {
      service.registerProvider('provider-1', mockProvider);
      service.registerProvider('provider-2', mockProvider);
      
      service.setActiveProviderName('provider-1');
      await service.saveAgentCheckpoint('Test 1', mockAgent);
      expect(mockProvider.storeCheckpoint).toHaveBeenCalledTimes(1);
      
      service.setActiveProviderName('provider-2');
      await service.saveAgentCheckpoint('Test 2', mockAgent);
      expect(mockProvider.storeCheckpoint).toHaveBeenCalledTimes(2);
    });
  });
});
