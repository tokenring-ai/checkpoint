import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import type {AgentCheckpointListItem, AgentCheckpointStorage, NamedAgentCheckpoint, StoredAgentCheckpoint} from './AgentCheckpointStorage.ts';

describe('AgentCheckpointProvider Interface', () => {
  let provider: AgentCheckpointStorage & {
    start: () => Promise<void>;
  };

  beforeEach(() => {
    // Create a mock implementation of the provider interface
    provider = {
      displayName: 'Mock Provider',
      start: vi.fn().mockResolvedValue(undefined),
      storeAgentCheckpoint: vi.fn().mockResolvedValue('mock-checkpoint-id'),
      retrieveAgentCheckpoint: vi.fn().mockResolvedValue({
        id: 'mock-checkpoint-id',
        name: 'Mock Checkpoint',
        agentId: 'mock-agent-id',
        createdAt: Date.now(),
        state: { mockState: 'mock' },
        agentType: 'mock-agent-type',
        sessionId: 'mock-session',
      }),
      listAgentCheckpoints: vi.fn().mockResolvedValue([
        {
          id: 'mock-checkpoint-id',
          name: 'Mock Checkpoint',
          agentId: 'mock-agent-id',
          createdAt: Date.now()
        }
      ])
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Interface Requirements', () => {
    it('should have displayName property', () => {
      expect(typeof provider.displayName).toBe('string');
    });

    it('should have start method', () => {
      expect(typeof provider.start).toBe('function');
    });

    it('should have storeAgentCheckpoint method', () => {
      expect(typeof provider.storeAgentCheckpoint).toBe('function');
    });

    it('should have retrieveAgentCheckpoint method', () => {
      expect(typeof provider.retrieveAgentCheckpoint).toBe('function');
    });

    it('should have listAgentCheckpoints method', () => {
      expect(typeof provider.listAgentCheckpoints).toBe('function');
    });
  });

  describe('Data Structures', () => {
    it('should handle NamedAgentCheckpoint correctly', () => {
      const checkpoint: NamedAgentCheckpoint = {
        name: 'Test Checkpoint',
        state: { testState: 'test' },
        agentType: 'test-agent-type',
        sessionId: 'test-session',
        previousResponseId: 'test-response-id'
      };

      expect(checkpoint).toMatchObject({
        name: expect.any(String),
        state: expect.any(Object),
        agentType: expect.any(String),
        sessionId: expect.any(String),
      });
    });

    it('should handle StoredAgentCheckpoint correctly', () => {
      const storedCheckpoint: StoredAgentCheckpoint = {
        id: 'test-id',
        name: 'Test Checkpoint',
        agentId: 'test-agent-id',
        createdAt: Date.now(),
        state: { testState: 'test' },
        agentType: 'test-agent-type',
        sessionId: 'test-session',
      };

      expect(storedCheckpoint).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        agentId: expect.any(String),
        createdAt: expect.any(Number),
        state: expect.any(Object),
        agentType: expect.any(String),
        sessionId: expect.any(String),
      });
    });

    it('should handle AgentCheckpointListItem correctly', () => {
      const listItem: AgentCheckpointListItem = {
        id: 'test-id',
        name: 'Test Checkpoint',
        agentId: 'test-agent-id',
        createdAt: Date.now()
      };

      expect(listItem).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        agentId: expect.any(String),
        createdAt: expect.any(Number)
      });

      // Should not have state, agentType, sessionId, or previousResponseId properties
      expect((listItem as any).state).toBeUndefined();
      expect((listItem as any).agentType).toBeUndefined();
      expect((listItem as any).sessionId).toBeUndefined();
    });
  });

  describe('Provider Operations', () => {
    it('should start successfully', async () => {
      await expect(provider.start()).resolves.not.toThrow();
    });

    it('should store checkpoint', async () => {
      const checkpointData: NamedAgentCheckpoint = {
        name: 'Test Checkpoint',
        state: { testState: 'test' },
        agentType: 'test-agent-type',
        sessionId: 'test-session',
        previousResponseId: 'test-response-id'
      };

      const result = await provider.storeAgentCheckpoint(checkpointData);
      
      expect(result).toBe('mock-checkpoint-id');
      expect(provider.storeAgentCheckpoint).toHaveBeenCalledWith(checkpointData);
    });

    it('should retrieve checkpoint', async () => {
      const result = await provider.retrieveAgentCheckpoint('mock-checkpoint-id');
      
      expect(result).toMatchObject({
        id: 'mock-checkpoint-id',
        name: expect.any(String),
        agentId: expect.any(String),
        createdAt: expect.any(Number),
        state: expect.any(Object),
        agentType: expect.any(String),
        sessionId: expect.any(String),
      });
    });

    it('should return null when checkpoint not found', async () => {
      provider.retrieveAgentCheckpoint.mockResolvedValueOnce(null);
      
      const result = await provider.retrieveAgentCheckpoint('non-existent-id');
      
      expect(result).toBeNull();
    });

    it('should list checkpoints', async () => {
      const result = await provider.listAgentCheckpoints();
      
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        agentId: expect.any(String),
        createdAt: expect.any(Number)
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle storage errors', async () => {
      provider.storeAgentCheckpoint.mockRejectedValueOnce(new Error('Storage failed'));
      
      const checkpointData: NamedAgentCheckpoint = {
        name: 'Test Checkpoint',
        state: { testState: 'test' },
        agentType: 'test-agent-type',
        sessionId: 'test-session',
        previousResponseId: 'test-response-id'
      };

      await expect(provider.storeAgentCheckpoint(checkpointData))
        .rejects.toThrow('Storage failed');
    });

    it('should handle retrieval errors', async () => {
      provider.retrieveAgentCheckpoint.mockRejectedValueOnce(new Error('Retrieval failed'));
      
      await expect(provider.retrieveAgentCheckpoint('test-id'))
        .rejects.toThrow('Retrieval failed');
    });

    it('should handle listing errors', async () => {
      provider.listAgentCheckpoints.mockRejectedValueOnce(new Error('Listing failed'));
      
      await expect(provider.listAgentCheckpoints())
        .rejects.toThrow('Listing failed');
    });
  });

  describe('Data Validation', () => {
    it('should validate checkpoint data structure', () => {
      const validCheckpoint: NamedAgentCheckpoint = {
        name: 'Valid Checkpoint',
        state: { valid: true },
        agentType: 'valid-agent-type',
        sessionId: 'valid-session',
        previousResponseId: 'valid-response-id'
      };

      expect(validCheckpoint.name).toBeDefined();
      expect(validCheckpoint.state).toBeDefined();
      expect(validCheckpoint.agentType).toBeDefined();
      expect(validCheckpoint.sessionId).toBeDefined();
    });

    it('should handle empty state', () => {
      const minimalCheckpoint: NamedAgentCheckpoint = {
        name: 'Minimal Checkpoint',
        state: {},
        agentType: 'minimal-agent-type',
        sessionId: 'minimal-session',
        previousResponseId: 'minimal-response-id'
      };

      expect(minimalCheckpoint.state).toEqual({});
    });

    it('should handle complex nested data', () => {
      const complexCheckpoint: NamedAgentCheckpoint = {
        name: 'Complex Checkpoint',
        state: {
          nested: {
            deep: {
              value: 'deep-value'
            },
            array: [1, 2, 3],
            boolean: true,
            nullValue: null
          }
        },
        agentType: 'complex-agent-type',
        sessionId: 'complex-session',
        previousResponseId: 'complex-response-id'
      };

      expect(complexCheckpoint.state.nested.deep.value).toBe('deep-value');
      expect(complexCheckpoint.state.nested.array).toEqual([1, 2, 3]);
    });
  });
});
