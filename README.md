# @tokenring-ai/checkpoint

## Overview

The `@tokenring-ai/checkpoint` package provides persistent state management for agents within the Token Ring Agent framework. It enables agents to save snapshots of their current state and restore them later, supporting workflow interruption, experimentation, and session recovery.

**Key Features:**

- **State Snapshots**: Save complete agent state including chat history, tools, hooks, and custom state
- **Single Provider**: Direct storage backend for checkpoint persistence via `setCheckpointProvider`
- **Interactive Browsing**: Tree-based UI for exploring and restoring checkpoints
- **Auto-Checkpointing**: Automatic checkpoint creation after agent input processing
- **Session History**: Browse checkpoints grouped by agent session
- **Named Checkpoints**: Label checkpoints for easy identification
- **RPC API**: JSON-RPC endpoints for remote checkpoint operations
- **Plugin Architecture**: Automatic integration with TokenRing applications

## Installation

Part of the Token Ring monorepo. Install dependencies and build:

```bash
bun install
bun run build
```

## Configuration

Configure the checkpoint package using the plugin configuration:

```typescript
import checkpointPlugin from '@tokenring-ai/checkpoint';

export default {
  plugins: [checkpointPlugin],
  checkpoint: {
    provider: {
      type: "memory"  // or your custom provider type
    }
  }
} satisfies TokenRingConfig;
```

## Core Components

### AgentCheckpointService

Main service for checkpoint operations. Automatically installed when the package is registered.

**Key Methods:**

- `setCheckpointProvider(provider)` - Set the checkpoint storage provider
- `saveAgentCheckpoint(name, agent)` - Save agent state to a checkpoint
- `restoreAgentCheckpoint(id, agent)` - Restore agent from checkpoint
- `listCheckpoints(agent)` - List all available checkpoints

**Example:**

```typescript
import AgentCheckpointService from '@tokenring-ai/checkpoint/AgentCheckpointService.ts';

const checkpointService = agent.requireServiceByType(AgentCheckpointService);

// Save checkpoint
const checkpointId = await checkpointService.saveAgentCheckpoint(
  'My Checkpoint',
  agent
);

// Restore checkpoint
await checkpointService.restoreAgentCheckpoint(checkpointId, agent);

// List all checkpoints
const checkpoints = await checkpointService.listCheckpoints(agent);
```

### AgentCheckpointProvider

Interface for implementing custom checkpoint storage backends.

```typescript
interface AgentCheckpointProvider {
  // Optional startup method
  start?(): Promise<void>;
  
  // Save checkpoint and return its ID
  storeCheckpoint(data: NamedAgentCheckpoint): Promise<string>;
  
  // Retrieve checkpoint by ID
  retrieveCheckpoint(id: string): Promise<StoredAgentCheckpoint | null>;
  
  // List all stored checkpoints (without state data)
  listCheckpoints(): Promise<AgentCheckpointListItem[]>;
}
```

**Data Structures:**

```typescript
// Checkpoint with name
interface NamedAgentCheckpoint extends AgentCheckpointData {
  name: string;
}

// Checkpoint with storage ID
interface StoredAgentCheckpoint extends NamedAgentCheckpoint {
  id: string;
}

// Checkpoint listing item (minimal info)
type AgentCheckpointListItem = Omit<StoredAgentCheckpoint, "state" | "config">;
```

**Checkpoint State Contains:**

- `agentState` - Custom agent state
- `chatMessages` - Conversation history
- `CommandHistoryState` - Command history
- `HooksState` - Enabled hooks
- `AgentEventState` - Agent event state
- `CostTrackingState` - Cost tracking information

## Commands

### `/checkpoint`

Manage agent checkpoints - create, restore, or browse with interactive tree selection.

**Syntax:**

```
/checkpoint [action] [args...]
```

**Actions:**

#### `create [label]`

Create a checkpoint of the current agent state with an optional label.

```
/checkpoint create
/checkpoint create "My Important Fix"
```

#### `restore <id>`

Restore agent state from a specific checkpoint by ID.

```
/checkpoint restore abc123def456
```

#### `list` (default)

Show interactive tree selection of all checkpoints, grouped by date. Select one to restore.

```
/checkpoint list
/checkpoint              # Same as list
```

**Examples:**

```
/checkpoint create              # Create with default label
/checkpoint create "Bug Fix"    # Create with custom label
/checkpoint restore xyz789      # Restore by ID
/checkpoint list                # Browse and restore interactively
```

**Output:**

- Shows checkpoint ID when created
- Displays grouped checkpoints by date with timestamps
- Indicates most recent checkpoints first

### `/history`

Browse and view checkpoint history grouped by agent session.

**Syntax:**

```
/history
```

Shows an interactive tree selection where checkpoints are grouped by:

1. Agent ID (session)
2. Individual checkpoints within each agent (sorted by creation time, newest first)

**Display Information:**

For each selected checkpoint:
- Name and creation timestamp
- Agent ID
- Full checkpoint details including state data (when retrievable)

## Hooks

### `autoCheckpoint`

Automatically creates a checkpoint after each agent input is processed. Enabled by default when the package is installed.

**Hook Points:**
- `afterAgentInputComplete`
- `beforeChatCompletion`

**Behavior:**

- Triggered after agent successfully processes input
- Uses the input message as the checkpoint label
- Runs silently without interrupting workflow
- Can be disabled via agent hook management

**Configuration:**

```typescript
// Disable auto-checkpointing
agent.hooks.disableItems("@tokenring-ai/checkpoint/autoCheckpoint");

// Re-enable auto-checkpointing
agent.hooks.enableItems("@tokenring-ai/checkpoint/autoCheckpoint");
```

## RPC API

The package provides JSON-RPC endpoints for remote checkpoint operations.

**Endpoint:** `/rpc/checkpoint`

### `listCheckpoints`

Query all available checkpoints without state data.

**Request:**
```json
{
  "method": "listCheckpoints",
  "params": {}
}
```

**Response:**
```json
{
  "result": [
    {
      "id": "checkpoint-123",
      "name": "Before Feature Implementation",
      "agentId": "agent-456",
      "createdAt": 1640995200000
    }
  ]
}
```

### `getCheckpoint`

Retrieve a specific checkpoint with full state data.

**Request:**
```json
{
  "method": "getCheckpoint",
  "params": {
    "id": "checkpoint-123"
  }
}
```

**Response:**
```json
{
  "result": {
    "id": "checkpoint-123",
    "name": "Before Feature Implementation",
    "agentId": "agent-456",
    "createdAt": 1640995200000,
    "state": {
      "agentState": {...},
      "chatMessages": [...],
      "CommandHistoryState": {...},
      "HooksState": {...},
      "AgentEventState": {...},
      "CostTrackingState": {...}
    }
  }
}
```

### `launchAgentFromCheckpoint`

Create a new agent from a checkpoint.

**Request:**
```json
{
  "method": "launchAgentFromCheckpoint",
  "params": {
    "checkpointId": "checkpoint-123",
    "headless": false
  }
}
```

**Response:**
```json
{
  "result": {
    "agentId": "agent-789",
    "agentName": "Restored Agent",
    "agentType": "default"
  }
}
```

## Usage Examples

### Basic Checkpoint Workflow

```typescript
import AgentCheckpointService from '@tokenring-ai/checkpoint/AgentCheckpointService.ts';

const service = agent.requireServiceByType(AgentCheckpointService);

// Save checkpoint
const id1 = await service.saveAgentCheckpoint('Before Changes', agent);

// Make changes to agent state
// ... agent does work ...

// Save another checkpoint
const id2 = await service.saveAgentCheckpoint('After Changes', agent);

// List all checkpoints
const all = await service.listCheckpoints(agent);
console.log(`Total checkpoints: ${all.length}`);

// Restore from earlier checkpoint
await service.restoreAgentCheckpoint(id1, agent);
```

### Custom Storage Provider

```typescript
import type { AgentCheckpointProvider, NamedAgentCheckpoint, StoredAgentCheckpoint, AgentCheckpointListItem } from '@tokenring-ai/checkpoint/AgentCheckpointProvider.ts';

class CustomProvider implements AgentCheckpointProvider {
  private checkpoints = new Map<string, StoredAgentCheckpoint>();

  async storeCheckpoint(data: NamedAgentCheckpoint): Promise<string> {
    const id = `checkpoint-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.checkpoints.set(id, {
      ...data,
      id,
    });
    return id;
  }

  async retrieveCheckpoint(id: string): Promise<StoredAgentCheckpoint | null> {
    return this.checkpoints.get(id) || null;
  }

  async listCheckpoints(): Promise<AgentCheckpointListItem[]> {
    return Array.from(this.checkpoints.values()).map(cp => ({
      id: cp.id,
      name: cp.name,
      agentId: cp.agentId,
      createdAt: cp.createdAt
    }));
  }
}

// Set provider
const checkpointService = agent.requireServiceByType(AgentCheckpointService);
checkpointService.setCheckpointProvider(new CustomProvider());
```

### Conditional Checkpointing

```typescript
// Disable auto-checkpointing for certain operations
agent.hooks.disableItems("@tokenring-ai/checkpoint/autoCheckpoint");

// Do work without automatic checkpoints
// ...

// Re-enable auto-checkpointing
agent.hooks.enableItems("@tokenring-ai/checkpoint/autoCheckpoint");

// Save a specific checkpoint manually
const id = await service.saveAgentCheckpoint('Critical State', agent);
```

### RPC Usage

```typescript
// Using the RPC endpoint directly
const response = await fetch('/rpc/checkpoint', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    method: 'listCheckpoints',
    params: {}
  })
});

const checkpoints = await response.json();
```

## Package Integration

### Installation with TokenRingApp

The checkpoint package is automatically installed when registered:

```typescript
import checkpointPlugin from '@tokenring-ai/checkpoint';

export default {
  plugins: [checkpointPlugin]
} satisfies TokenRingPlugin;
```

**Automatically Provides:**

- Chat commands (`/checkpoint`, `/history`)
- Auto-checkpoint hook
- `AgentCheckpointService` service instance
- RPC endpoints for remote operations
- Configuration schema validation

### Configuration Schema

```typescript
import { z } from 'zod';

const CheckpointConfigSchema = z.object({
  provider: z.looseObject({
    type: z.string(),
  })
});
```

## Storage Provider Implementations

The package defines the interface; storage providers are implemented by:

- Setting the provider directly via `setCheckpointProvider(provider)`
- Implementing the `AgentCheckpointProvider` interface

**Example Provider:**

```typescript
import type { AgentCheckpointProvider } from '@tokenring-ai/checkpoint/AgentCheckpointProvider.ts';

class MemoryCheckpointProvider implements AgentCheckpointProvider {
  private checkpoints = new Map<string, any>();

  async storeCheckpoint(data: any): Promise<string> {
    const id = crypto.randomUUID();
    this.checkpoints.set(id, { ...data, id, createdAt: Date.now() });
    return id;
  }

  async retrieveCheckpoint(id: string) {
    return this.checkpoints.get(id) || null;
  }

  async listCheckpoints() {
    return Array.from(this.checkpoints.values()).map(cp => ({
      id: cp.id,
      name: cp.name,
      agentId: cp.agentId,
      createdAt: cp.createdAt
    }));
  }
}
```

## Best Practices

1. **Regular Checkpoints**: Use auto-checkpointing for frequent automatic saves
2. **Named Checkpoints**: Create named checkpoints at logical decision points
3. **Provider Selection**: Set an appropriate provider for your use case:
   - Memory provider for testing/experimentation
   - Custom persistent provider for production
4. **Cleanup**: Periodically list and manage checkpoints to manage storage
5. **Error Handling**: Always catch restore errors for graceful degradation
6. **RPC Usage**: Use RPC endpoints for remote checkpoint management and agent spawning

## Error Handling

```typescript
try {
  await checkpointService.restoreAgentCheckpoint(id, agent);
  agent.infoLine(`Checkpoint ${id} restored`);
} catch (error) {
  agent.errorLine(`Failed to restore checkpoint: ${error}`);
  // Agent state remains unchanged
}
```

## Testing

```bash
bun run test                  # Run tests
bun run test:watch        # Watch mode
bun run test:coverage     # Coverage report
```

## Plugin Architecture

The package uses a plugin architecture for automatic integration:

```typescript
import { AgentCommandService, AgentLifecycleService } from "@tokenring-ai/agent";
import { TokenRingPlugin } from "@tokenring-ai/app";
import { WebHostService } from "@tokenring-ai/web-host";
import JsonRpcResource from "@tokenring-ai/web-host/JsonRpcResource";
import { z } from "zod";
import AgentCheckpointService from "./AgentCheckpointService.ts";
import chatCommands from "./chatCommands.ts";
import hooks from "./hooks.ts";
import { CheckpointConfigSchema } from "./schema.ts";
import packageJSON from "./package.json" with { type: "json" };
import checkpointRPC from "./rpc/checkpoint.ts";

const packageConfigSchema = z.object({
  checkpoint: CheckpointConfigSchema
});

export default {
  name: packageJSON.name,
  version: packageJSON.version,
  description: packageJSON.description,
  install(app, config) {
    const checkpointService = new AgentCheckpointService(config.checkpoint);
    app.addServices(checkpointService);

    app.waitForService(AgentCommandService, agentCommandService =>
      agentCommandService.addAgentCommands(chatCommands)
    );
    app.waitForService(AgentLifecycleService, lifecycleService =>
      lifecycleService.addHooks(packageJSON.name, hooks)
    );
    app.waitForService(WebHostService, webHostService => {
      webHostService.registerResource("Checkpoint RPC endpoint", new JsonRpcResource(app, checkpointRPC));
    });
  },
  config: packageConfigSchema
} satisfies TokenRingPlugin<typeof packageConfigSchema>;
```

## License

MIT License - see [LICENSE](./LICENSE) file for details.
