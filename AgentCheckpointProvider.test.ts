import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import type {AgentCheckpointListItem, AgentCheckpointStorage, NamedAgentCheckpoint, StoredAgentCheckpoint} from './AgentCheckpointStorage.js';

describe('AgentCheckpointProvider Interface', () => {
  let provider: AgentCheckpointStorage & {
    start: () => Promise<void>;
    storeAgentCheckpoint: (data: NamedAgentCheckpoint) => Promise<string>;
    retrieveAgentCheckpoint: (id: string) => Promise<StoredAgentCheckpoint | null>;
    listAgentCheckpoints: () => Promise<AgentCheckpointListItem[]>;
  };

  beforeEach(() => {
    // Create a mock implementation of the provider interface
    provider = {
      start: vi.fn().mockResolvedValue(undefined),
      storeCheckpoint: vi.fn().mockResolvedValue('mock-checkpoint-id'),
      retrieveCheckpoint: vi.fn().mockResolvedValue({
        id: 'mock-checkpoint-id',
        name: 'Mock Checkpoint',
        agentId: 'mock-agent-id',
        createdAt: Date.now(),
        state: { mockState: 'mock' },
        config: { mockConfig: 'mock' },
        previousResponseId: 'mock-response-id'
      }),
      listCheckpoints: vi.fn().mockResolvedValue([
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
    it('should have start method', () => {
      expect(typeof provider.start).toBe('function');
    });

    it('should have storeCheckpoint method', () => {
      expect(typeof provider.storeAgentCheckpoint).toBe('function');
    });

    it('should have retrieveCheckpoint method', () => {
      expect(typeof provider.retrieveAgentCheckpoint).toBe('function');
    });

    it('should have listCheckpoints method', () => {
      expect(typeof provider.listAgentCheckpoints).toBe('function');
    });
  });

  describe('Data Structures', () => {
    it('should handle NamedAgentCheckpoint correctly', () => {
      const checkpoint: NamedAgentCheckpoint = {
        name: 'Test Checkpoint',
        state: { testState: 'test' },
        config: { testConfig: 'test' },
        previousResponseId: 'test-response-id'
      };

      expect(checkpoint).toMatchObject({
        name: expect.any(String),
        state: expect.any(Object),
        config: expect.any(Object),
        previousResponseId: expect.any(String)
      });
    });

    it('should handle StoredAgentCheckpoint correctly', () => {
      const storedCheckpoint: StoredAgentCheckpoint = {
        id: 'test-id',
        name: 'Test Checkpoint',
        agentId: 'test-agent-id',
        createdAt: Date.now(),
        state: { testState: 'test' },
        config: { testConfig: 'test' },
        previousResponseId: 'test-response-id'
      };

      expect(storedCheckpoint).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        agentId: expect.any(String),
        createdAt: expect.any(Number),
        state: expect.any(Object),
        config: expect.any(Object),
        previousResponseId: expect.any(String)
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

      // Should not have state or config properties
      expect(listItem.state).toBeUndefined();
      expect(listItem.config).toBeUndefined();
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
        config: { testConfig: 'test' },
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
        config: expect.any(Object),
        previousResponseId: expect.any(String)
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
        config: { testConfig: 'test' },
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
        config: { valid: true },
        previousResponseId: 'valid-response-id'
      };

      expect(validCheckpoint.name).toBeDefined();
      expect(validCheckpoint.state).toBeDefined();
      expect(validCheckpoint.config).toBeDefined();
      expect(validCheckpoint.previousResponseId).toBeDefined();
    });

    it('should handle empty state and config', () => {
      const minimalCheckpoint: NamedAgentCheckpoint = {
        name: 'Minimal Checkpoint',
        state: {},
        config: {},
        previousResponseId: 'minimal-response-id'
      };

      expect(minimalCheckpoint.state).toEqual({});
      expect(minimalCheckpoint.config).toEqual({});
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
        config: {
          complex: true,
          config: 'nested'
        },
        previousResponseId: 'complex-response-id'
      };

      expect(complexCheckpoint.state.nested.deep.value).toBe('deep-value');
      expect(complexCheckpoint.state.nested.array).toEqual([1, 2, 3]);
    });
  });
});
