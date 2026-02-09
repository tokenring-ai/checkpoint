import {TokenRingAgentCommand} from '@tokenring-ai/agent/types';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import checkpointCommand from './checkpoint.js';

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
  saveAgentCheckpoint: vi.fn().mockResolvedValue('checkpoint-id-123'),
  restoreAgentCheckpoint: vi.fn().mockResolvedValue(undefined),
  listCheckpoints: vi.fn().mockResolvedValue([
    {
      id: 'checkpoint-1',
      name: 'Test Checkpoint 1',
      agentId: 'test-agent-id',
      createdAt: Date.now() - 1000
    },
    {
      id: 'checkpoint-2',
      name: 'Test Checkpoint 2',
      agentId: 'test-agent-id',
      createdAt: Date.now()
    }
  ])
};

describe('Checkpoint Command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAgent.requireServiceByType.mockReturnValue(mockCheckpointService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Command Configuration', () => {
    it('should export correct description', () => {
      expect(checkpointCommand.description).toBe('/checkpoint - Create or restore conversation checkpoints to resume chat');
    });

    it('should implement TokenRingAgentCommand interface', () => {
      const command: TokenRingAgentCommand = checkpointCommand;
      expect(command.description).toBeDefined();
      expect(typeof command.execute).toBe('function');
      expect(command.help).toBeDefined();
    });
  });

  describe('Command Execution', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      mockAgent.requireServiceByType.mockReturnValue(mockCheckpointService);
    });

    describe('Create Action', () => {
      it('should create checkpoint with default label', async () => {
        await checkpointCommand.execute('create', mockAgent);
        
        expect(mockCheckpointService.saveAgentCheckpoint).toHaveBeenCalledWith('New Checkpoint', mockAgent);
        expect(mockAgent.infoMessage).toHaveBeenCalledWith('Checkpoint created: checkpoint-id-123: New Checkpoint');
      });

      it('should create checkpoint with custom label', async () => {
        await checkpointCommand.execute('create My Custom Label', mockAgent);
        
        expect(mockCheckpointService.saveAgentCheckpoint).toHaveBeenCalledWith('My Custom Label', mockAgent);
        expect(mockAgent.infoMessage).toHaveBeenCalledWith('Checkpoint created: checkpoint-id-123: My Custom Label');
      });

      it('should create checkpoint with complex label', async () => {
        await checkpointCommand.execute('create Label with numbers 123 and symbols !@#', mockAgent);
        
        expect(mockCheckpointService.saveAgentCheckpoint).toHaveBeenCalledWith('Label with numbers 123 and symbols !@#', mockAgent);
      });

      it('should handle create with multiple words', async () => {
        await checkpointCommand.execute('create This is a multi word label', mockAgent);
        
        expect(mockCheckpointService.saveAgentCheckpoint).toHaveBeenCalledWith('This is a multi word label', mockAgent);
      });
    });

    describe('Restore Action', () => {
      it('should restore checkpoint with valid ID', async () => {
        await checkpointCommand.execute('restore checkpoint-1', mockAgent);
        
        expect(mockCheckpointService.restoreAgentCheckpoint).toHaveBeenCalledWith('checkpoint-1', mockAgent);
        expect(mockAgent.infoMessage).toHaveBeenCalledWith('Checkpoint checkpoint-1 loaded');
      });

      it('should show error when no ID provided', async () => {
        await checkpointCommand.execute('restore', mockAgent);
        
        expect(mockAgent.errorMessage).toHaveBeenCalledWith('Usage: /checkpoint restore <id> (see /checkpoint list for ids)');
        expect(mockCheckpointService.restoreAgentCheckpoint).not.toHaveBeenCalled();
      });

      it('should handle restore with complex ID', async () => {
        await checkpointCommand.execute('restore complex-id-with-dashes-123', mockAgent);
        
        expect(mockCheckpointService.restoreAgentCheckpoint).toHaveBeenCalledWith('complex-id-with-dashes-123', mockAgent);
      });
    });

    describe('List Action (Default)', () => {
      beforeEach(() => {
        // Mock askQuestion for tree selection
        mockAgent.askQuestion.mockResolvedValue('checkpoint-1');
      });

      it('should list checkpoints when none provided', async () => {
        await checkpointCommand.execute('list', mockAgent);
        
        expect(mockCheckpointService.listCheckpoints).toHaveBeenCalled();
      });

      it('should handle empty checkpoint list', async () => {
        mockCheckpointService.listCheckpoints.mockResolvedValueOnce([]);
        
        await checkpointCommand.execute('list', mockAgent);
        
        expect(mockAgent.infoMessage).toHaveBeenCalledWith('No checkpoints saved. Use /checkpoint create to make one.');
      });


      it('should restore selected checkpoint from list', async () => {
        mockAgent.askQuestion.mockResolvedValue(['checkpoint-1']);
        
        await checkpointCommand.execute('list', mockAgent);
        
        expect(mockCheckpointService.restoreAgentCheckpoint).toHaveBeenCalledWith('checkpoint-1', mockAgent);
        expect(mockAgent.infoMessage).toHaveBeenCalledWith('Checkpoint checkpoint-1 loaded');
      });

      it('should handle cancellation of tree selection', async () => {
        mockAgent.askQuestion.mockResolvedValue(null);
        
        await checkpointCommand.execute('list', mockAgent);
        
        expect(mockAgent.infoMessage).toHaveBeenCalledWith('Checkpoint selection cancelled. No changes made.');
        expect(mockCheckpointService.restoreAgentCheckpoint).not.toHaveBeenCalled();
      });

      it('should handle tree selection errors', async () => {
        const error = new Error('Tree selection failed');
        mockAgent.askQuestion.mockRejectedValueOnce(error);
        
        await checkpointCommand.execute('list', mockAgent);
        
        expect(mockAgent.errorMessage).toHaveBeenCalledWith('Error during checkpoint selection: Error: Tree selection failed');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle checkpoint service errors', async () => {
      const error = new Error('Service error');
      mockCheckpointService.saveAgentCheckpoint.mockRejectedValueOnce(error);
      
      await expect(checkpointCommand.execute('create Test', mockAgent)).rejects.toThrow('Service error');
    });

    it('should handle restore errors', async () => {
      const error = new Error('Restore failed');
      mockCheckpointService.restoreAgentCheckpoint.mockRejectedValueOnce(error);
      
      await expect(checkpointCommand.execute('restore invalid-id', mockAgent)).rejects.toThrow('Restore failed');
    });

    it('should handle list errors', async () => {
      const error = new Error('List failed');
      mockCheckpointService.listCheckpoints.mockRejectedValueOnce(error);
      
      await expect(checkpointCommand.execute('list', mockAgent)).rejects.toThrow('List failed');
    });
  });

  describe('Command Parsing', () => {
    it('should parse create command correctly', () => {
      expect(checkpointCommand.execute).toBeDefined();
    });

    it('should handle various input formats', async () => {
      const testCases = [
        'create',
        'create ',
        'create Label',
        'create Multiple Word Label',
        'restore id',
        'restore complex-id',
        '',
        'invalid'
      ];

      for (const input of testCases) {
        vi.clearAllMocks();
        await checkpointCommand.execute(input, mockAgent);
      }
    });

    it('should handle whitespace correctly', async () => {
      await checkpointCommand.execute('create  test  label  ', mockAgent);
      
      expect(mockCheckpointService.saveAgentCheckpoint).toHaveBeenCalledWith('test  label', mockAgent);
    });
  });


  describe('Help Documentation', () => {
    it('should provide comprehensive help', () => {
      const help = checkpointCommand.help;
      
      expect(help).toContain('/checkpoint - Create or restore conversation checkpoints');
      expect(help).toContain('create [label]');
      expect(help).toContain('restore <id>');
      expect(help).toContain('list');
      expect(help).toContain('Examples');
      expect(help).toContain('Tips');
    });
  });
});
