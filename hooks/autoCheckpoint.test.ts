import type {HookSubscription} from '@tokenring-ai/agent/types';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import AgentCheckpointService from '../AgentCheckpointService.js';
import autoCheckpointHook from './autoCheckpoint.js';

// Mock Agent
const mockAgent = {
  generateCheckpoint: vi.fn().mockReturnValue({
    state: { testState: 'mocked' },
    config: { testConfig: 'mocked' },
    previousResponseId: 'test-response-id'
  }),
  restoreState: vi.fn(),
  requireServiceByType: vi.fn(),
  getServiceByType: vi.fn(),
  infoMessage: vi.fn(),
  errorMessage: vi.fn(),
  askQuestion: vi.fn(),
  id: 'test-agent-id',
  name: 'test-agent',
  config: { type: 'test-agent-type' }
} as any;

const mockCheckpointService = {
  saveAgentCheckpoint: vi.fn().mockResolvedValue('checkpoint-id-123')
};

describe('Auto-Checkpoint Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock behavior
    mockAgent.getServiceByType.mockReturnValue(mockCheckpointService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Hook Configuration', () => {
    it('should export correct name and description', () => {
      expect(autoCheckpointHook.name).toBe('autoCheckpoint');
      expect(autoCheckpointHook.description).toBe('Automatically saves agent checkpoints after input is handled');
    });

    it('should implement HookConfig interface', () => {
      const hook: HookSubscription = autoCheckpointHook;
      expect(hook.name).toBeDefined();
      expect(hook.description).toBeDefined();
      expect(typeof hook.afterAgentInputComplete).toBe('function');
      expect(typeof hook.beforeChatCompletion).toBe('function');
    });
  });

  describe('Hook Execution', () => {
    it('should save checkpoint after agent input complete', async () => {
      const message = 'Test message';
      
      await autoCheckpointHook.afterAgentInputComplete(mockAgent, message);
      
      expect(mockAgent.getServiceByType).toHaveBeenCalledWith(AgentCheckpointService);
      expect(mockCheckpointService.saveAgentCheckpoint).toHaveBeenCalledWith(message, mockAgent);
    });

    it('should save checkpoint before chat completion', async () => {
      const message = 'Test message';
      
      await autoCheckpointHook.beforeChatCompletion(mockAgent, message);
      
      expect(mockAgent.getServiceByType).toHaveBeenCalledWith(AgentCheckpointService);
      expect(mockCheckpointService.saveAgentCheckpoint).toHaveBeenCalledWith(message, mockAgent);
    });

    it('should use message as checkpoint name', async () => {
      const message = 'Custom checkpoint name';
      
      await autoCheckpointHook.afterAgentInputComplete(mockAgent, message);
      
      expect(mockCheckpointService.saveAgentCheckpoint).toHaveBeenCalledWith(
        'Custom checkpoint name',
        mockAgent
      );
    });

    it('should handle empty message', async () => {
      const message = '';
      
      await autoCheckpointHook.afterAgentInputComplete(mockAgent, message);
      
      expect(mockCheckpointService.saveAgentCheckpoint).toHaveBeenCalledWith(
        '',
        mockAgent
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle missing checkpoint service gracefully', async () => {
      mockAgent.getServiceByType.mockReturnValueOnce(null);
      
      const message = 'Test message';
      
      // Should not throw error, but should not save checkpoint
      await autoCheckpointHook.afterAgentInputComplete(mockAgent, message);
      
      expect(mockCheckpointService.saveAgentCheckpoint).not.toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      const error = new Error('Service error');
      mockCheckpointService.saveAgentCheckpoint.mockRejectedValueOnce(error);
      
      const message = 'Test message';
      
      // The hook should let the error propagate
      await expect(
        autoCheckpointHook.afterAgentInputComplete(mockAgent, message)
      ).rejects.toThrow('Service error');
    });

    it('should handle checkpoint service startup failures', async () => {
      const failingService = {
        saveAgentCheckpoint: vi.fn().mockRejectedValue(new Error('Service not initialized'))
      };
      mockAgent.getServiceByType.mockReturnValueOnce(failingService);
      
      const message = 'Test message';
      
      await expect(
        autoCheckpointHook.afterAgentInputComplete(mockAgent, message)
      ).rejects.toThrow('Service not initialized');
    });
  });

  describe('Service Integration', () => {
    it('should integrate with AgentCheckpointService', () => {
      expect(autoCheckpointHook.name).toBe('autoCheckpoint');
      expect(autoCheckpointHook.description).toBe('Automatically saves agent checkpoints after input is handled');
    });

    it('should call correct service methods', async () => {
      const message = 'Integration test message';
      
      await autoCheckpointHook.afterAgentInputComplete(mockAgent, message);
      
      expect(mockAgent.getServiceByType).toHaveBeenCalledWith(AgentCheckpointService);
      expect(mockCheckpointService.saveAgentCheckpoint).toHaveBeenCalledWith(
        message,
        mockAgent
      );
    });

    it('should pass correct parameters to service', async () => {
      const message = 'Parameter test message';
      const expectedCheckpointName = 'Parameter test message';
      
      await autoCheckpointHook.afterAgentInputComplete(mockAgent, message);
      
      expect(mockCheckpointService.saveAgentCheckpoint).toHaveBeenCalledWith(
        expectedCheckpointName,
        mockAgent
      );
    });
  });

  describe('Hook Timing', () => {
    it('should be triggered after agent input completion', async () => {
      const message = 'Timing test message';
      
      // Test afterAgentInputComplete hook
      await autoCheckpointHook.afterAgentInputComplete(mockAgent, message);
      expect(mockCheckpointService.saveAgentCheckpoint).toHaveBeenCalledTimes(1);
    });

    it('should be triggered before chat completion', async () => {
      const message = 'Timing test message';
      
      // Test beforeChatCompletion hook
      await autoCheckpointHook.beforeChatCompletion(mockAgent, message);
      expect(mockCheckpointService.saveAgentCheckpoint).toHaveBeenCalledTimes(1);
    });

    it('should work with both hook points', async () => {
      const message = 'Dual hook test message';
      
      // Test both hooks
      await autoCheckpointHook.afterAgentInputComplete(mockAgent, message);
      await autoCheckpointHook.beforeChatCompletion(mockAgent, message);
      
      expect(mockCheckpointService.saveAgentCheckpoint).toHaveBeenCalledTimes(2);
    });
  });

  describe('Message Handling', () => {
    it('should handle various message types', async () => {
      const messages = [
        'Simple message',
        'Message with numbers 123',
        'Message with symbols !@#$%',
        'Message\nwith\nnewlines',
        'Message with special chars: áéíóú',
        ''
      ];

      for (const message of messages) {
        vi.clearAllMocks();
        await autoCheckpointHook.afterAgentInputComplete(mockAgent, message);
        expect(mockCheckpointService.saveAgentCheckpoint).toHaveBeenCalledWith(message, mockAgent);
      }
    });

    it('should handle long messages', async () => {
      const longMessage = 'a'.repeat(1000);
      
      await autoCheckpointHook.afterAgentInputComplete(mockAgent, longMessage);
      
      expect(mockCheckpointService.saveAgentCheckpoint).toHaveBeenCalledWith(longMessage, mockAgent);
    });

    it('should handle messages with special characters', async () => {
      const specialMessage = 'Message with "quotes" and \'apostrophes\' and \\backslashes\\';
      
      await autoCheckpointHook.afterAgentInputComplete(mockAgent, specialMessage);
      
      expect(mockCheckpointService.saveAgentCheckpoint).toHaveBeenCalledWith(specialMessage, mockAgent);
    });
  });
});
