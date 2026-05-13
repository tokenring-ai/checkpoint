import { TokenRingAgentCommand } from "@tokenring-ai/agent/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import createCheckpointCommand from "./agent-checkpoint/create.ts";
import listCheckpointCommand from "./agent-checkpoint/list.ts";
import restoreCheckpointCommand from "./agent-checkpoint/restore.ts";

// Mock Agent
const mockAgent = {
  generateCheckpoint: vi.fn().mockReturnValue({
    state: { testState: "mocked" },
    config: { testConfig: "mocked" },
    previousResponseId: "test-response-id"
  }),
  restoreState: vi.fn(),
  requireServiceByType: vi.fn(),
  getServiceByType: vi.fn(),
  infoMessage: vi.fn(),
  errorMessage: vi.fn(),
  askQuestion: vi.fn(),
  id: "test-agent-id",
  name: "test-agent",
  config: { type: "test-agent-type" }
} as any;

const mockCheckpointService = {
  saveAgentCheckpoint: vi.fn().mockResolvedValue("checkpoint-id-123"),
  restoreAgentCheckpoint: vi.fn().mockResolvedValue(undefined),
  listAgentCheckpoints: vi.fn().mockResolvedValue([
    {
      id: "checkpoint-1",
      name: "Test Checkpoint 1",
      agentId: "test-agent-id",
      createdAt: Date.now() - 1000
    },
    {
      id: "checkpoint-2",
      name: "Test Checkpoint 2",
      agentId: "test-agent-id",
      createdAt: Date.now()
    }
  ])
};

describe("Checkpoint Commands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAgent.requireServiceByType.mockReturnValue(mockCheckpointService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Create Command", () => {
    describe("Command Configuration", () => {
      it("should export correct description", () => {
        expect(createCheckpointCommand.description).toBe("Create a conversation checkpoint");
      });

      it("should implement TokenRingAgentCommand interface", () => {
        const command: TokenRingAgentCommand = createCheckpointCommand;
        expect(command.description).toBeDefined();
        expect(typeof command.execute).toBe("function");
        expect(command.help).toBeDefined();
      });
    });

    describe("Command Execution", () => {
      it("should create checkpoint with default label", async () => {
        const result = await createCheckpointCommand.execute({ remainder: "New Checkpoint", agent: mockAgent });

        expect(mockCheckpointService.saveAgentCheckpoint).toHaveBeenCalledWith("New Checkpoint", mockAgent);
        expect(result).toBe("Checkpoint created: checkpoint-id-123: New Checkpoint");
      });

      it("should create checkpoint with custom label", async () => {
        const result = await createCheckpointCommand.execute({ remainder: "My Custom Label", agent: mockAgent });

        expect(mockCheckpointService.saveAgentCheckpoint).toHaveBeenCalledWith("My Custom Label", mockAgent);
        expect(result).toBe("Checkpoint created: checkpoint-id-123: My Custom Label");
      });

      it("should create checkpoint with complex label", async () => {
        const result = await createCheckpointCommand.execute({ remainder: "Label with numbers 123 and symbols !@#", agent: mockAgent });

        expect(mockCheckpointService.saveAgentCheckpoint).toHaveBeenCalledWith("Label with numbers 123 and symbols !@#", mockAgent);
        expect(result).toBe("Checkpoint created: checkpoint-id-123: Label with numbers 123 and symbols !@#");
      });

      it("should handle create with multiple words", async () => {
        const result = await createCheckpointCommand.execute({ remainder: "This is a multi word label", agent: mockAgent });

        expect(mockCheckpointService.saveAgentCheckpoint).toHaveBeenCalledWith("This is a multi word label", mockAgent);
        expect(result).toBe("Checkpoint created: checkpoint-id-123: This is a multi word label");
      });
    });

    describe("Error Handling", () => {
      it("should handle checkpoint service errors", async () => {
        const error = new Error("Service error");
        mockCheckpointService.saveAgentCheckpoint.mockRejectedValueOnce(error);

        await expect(createCheckpointCommand.execute({ remainder: "Test", agent: mockAgent })).rejects.toThrow("Service error");
      });
    });
  });

  describe("Restore Command", () => {
    describe("Command Configuration", () => {
      it("should export correct description", () => {
        expect(restoreCheckpointCommand.description).toBe("Restore a checkpoint by ID");
      });

      it("should implement TokenRingAgentCommand interface", () => {
        const command: TokenRingAgentCommand = restoreCheckpointCommand;
        expect(command.description).toBeDefined();
        expect(typeof command.execute).toBe("function");
        expect(command.help).toBeDefined();
      });
    });

    describe("Command Execution", () => {
      it("should restore checkpoint with valid ID", async () => {
        const result = await restoreCheckpointCommand.execute({ positionals: { checkpointId: "checkpoint-1" }, agent: mockAgent });

        expect(mockCheckpointService.restoreAgentCheckpoint).toHaveBeenCalledWith("checkpoint-1", mockAgent);
        expect(result).toBe("Checkpoint checkpoint-1 loaded");
      });

      it("should handle restore with complex ID", async () => {
        const result = await restoreCheckpointCommand.execute({ positionals: { checkpointId: "complex-id-with-dashes-123" }, agent: mockAgent });

        expect(mockCheckpointService.restoreAgentCheckpoint).toHaveBeenCalledWith("complex-id-with-dashes-123", mockAgent);
        expect(result).toBe("Checkpoint complex-id-with-dashes-123 loaded");
      });
    });

    describe("Error Handling", () => {
      it("should handle restore errors", async () => {
        const error = new Error("Restore failed");
        mockCheckpointService.restoreAgentCheckpoint.mockRejectedValueOnce(error);

        await expect(restoreCheckpointCommand.execute({ positionals: { checkpointId: "invalid-id" }, agent: mockAgent })).rejects.toThrow("Restore failed");
      });
    });
  });

  describe("List Command", () => {
    describe("Command Configuration", () => {
      it("should export correct description", () => {
        expect(listCheckpointCommand.description).toBe("Interactive checkpoint browser");
      });

      it("should implement TokenRingAgentCommand interface", () => {
        const command: TokenRingAgentCommand = listCheckpointCommand;
        expect(command.description).toBeDefined();
        expect(typeof command.execute).toBe("function");
        expect(command.help).toBeDefined();
      });
    });

    describe("Command Execution", () => {
      beforeEach(() => {
        // Mock askQuestion for tree selection
        mockAgent.askQuestion.mockResolvedValue(["checkpoint-1"]);
      });

      it("should list checkpoints", async () => {
        const result = await listCheckpointCommand.execute({ agent: mockAgent });

        expect(mockCheckpointService.listAgentCheckpoints).toHaveBeenCalled();
        expect(result).toBe("Checkpoint checkpoint-1 loaded");
      });

      it("should handle empty checkpoint list", async () => {
        mockCheckpointService.listAgentCheckpoints.mockResolvedValueOnce([]);

        const result = await listCheckpointCommand.execute({ agent: mockAgent });

        expect(result).toBe("No checkpoints saved. Use /agent checkpoint create to make one.");
        expect(mockCheckpointService.restoreAgentCheckpoint).not.toHaveBeenCalled();
      });

      it("should restore selected checkpoint from list", async () => {
        mockAgent.askQuestion.mockResolvedValue(["checkpoint-1"]);

        const result = await listCheckpointCommand.execute({ agent: mockAgent });

        expect(mockCheckpointService.restoreAgentCheckpoint).toHaveBeenCalledWith("checkpoint-1", mockAgent);
        expect(result).toBe("Checkpoint checkpoint-1 loaded");
      });

      it("should handle cancellation of tree selection", async () => {
        mockAgent.askQuestion.mockResolvedValue(null);

        const result = await listCheckpointCommand.execute({ agent: mockAgent });

        expect(result).toBe("Checkpoint selection cancelled. No changes made.");
        expect(mockCheckpointService.restoreAgentCheckpoint).not.toHaveBeenCalled();
      });

      it("should handle tree selection errors", async () => {
        const error = new Error("Tree selection failed");
        mockAgent.askQuestion.mockRejectedValueOnce(error);

        await expect(listCheckpointCommand.execute({ agent: mockAgent })).rejects.toThrow("Error during checkpoint selection: Error: Tree selection failed");
      });
    });

    describe("Error Handling", () => {
      it("should handle list errors", async () => {
        const error = new Error("List failed");
        mockCheckpointService.listAgentCheckpoints.mockRejectedValueOnce(error);

        await expect(listCheckpointCommand.execute({ agent: mockAgent })).rejects.toThrow("List failed");
      });
    });
  });

  describe("Help Documentation", () => {
    it("create command should provide comprehensive help", () => {
      const help = createCheckpointCommand.help;

      expect(help).toContain("Create a checkpoint of the current conversation state");
      expect(help).toContain("/agent checkpoint create");
      expect(help).toContain("/agent checkpoint create My Fix");
    });

    it("restore command should provide comprehensive help", () => {
      const help = restoreCheckpointCommand.help;

      expect(help).toContain("Restore a specific checkpoint by its ID");
      expect(help).toContain("/agent checkpoint restore abc123");
    });

    it("list command should provide comprehensive help", () => {
      const help = listCheckpointCommand.help;

      expect(help).toContain("Open an interactive tree browser to select and restore a checkpoint");
      expect(help).toContain("/agent checkpoint list");
    });
  });
});
