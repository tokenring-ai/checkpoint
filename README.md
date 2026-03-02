# @tokenring-ai/checkpoint

## Overview

The `@tokenring-ai/checkpoint` package provides persistent state management for agents within the Token Ring Agent framework. It enables agents to save snapshots of their current state and restore them later, supporting workflow interruption, experimentation, and session recovery.

**Key Features:**

- **State Snapshots**: Save complete agent state including chat history, tools, hooks, and custom state
- **Provider Architecture**: Configurable checkpoint storage providers via `setCheckpointProvider`
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

### Configuration Schema

The package uses the `CheckpointConfigSchema` which defines:

- `checkpoint.provider`: Configuration object for the checkpoint provider
  - `type`: String identifier for the provider type

```typescript
import {CheckpointConfigSchema} from '@tokenring-ai/checkpoint';

// Schema validation example
const validConfig = CheckpointConfigSchema.parse({
  provider: {
    type: "memory"
  }
});
```

## Core Components

### AgentCheckpointService

Main service for checkpoint operations. Automatically installed when the package is registered.

**Key Methods:**

- `setCheckpointProvider(provider)` - Set the checkpoint storage provider
- `saveAgentCheckpoint(name, agent)` - Save agent state to a checkpoint
- `restoreAgentCheckpoint(id, agent)` - Restore agent from checkpoint
- `listCheckpoints()` - List all available checkpoints
- `attach(agent)` - Attach service to an agent and enable auto-checkpoint hook
- `start()` - Initialize the checkpoint provider

**Example:**

```typescript
import AgentCheckpointService from '@tokenring-ai/checkpoint/AgentCheckpointService';

const checkpointService = agent.requireServiceByType(AgentCheckpointService);

// Save checkpoint
const checkpointId = await checkpointService.saveAgentCheckpoint(
  'My Checkpoint',
  agent
);

// Restore checkpoint
await checkpointService.restoreAgentCheckpoint(checkpointId, agent);

// List all checkpoints
const checkpoints = await checkpointService.listCheckpoints();
```

### AgentCheckpointProvider

Interface for implementing custom checkpoint storage backends.

```typescript
import type {AgentCheckpointProvider} from '@tokenring-ai/checkpoint/AgentCheckpointProvider';

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
import type {
  NamedAgentCheckpoint,
  StoredAgentCheckpoint,
  AgentCheckpointListItem
} from '@tokenring-ai/checkpoint/AgentCheckpointProvider';

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
- `TodoState` - Todo list state
- `AgentExecutionState` - Agent execution state
- `config` - Agent configuration
- `previousResponseId` - ID of the previous response

## Commands

### `/checkpoint`

Manage agent checkpoints - create, restore, list, or browse with interactive tree selection.

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

#### `history`

Browse checkpoint history grouped by agent ID with detailed information.

```
/checkpoint history
```

**Examples:**

```
/checkpoint create              # Create with default label
/checkpoint create "Bug Fix"    # Create with custom label
/checkpoint restore xyz789      # Restore by ID
/checkpoint list                # Browse and restore interactively
/checkpoint history             # Browse checkpoint history
```

**Output:**

- Shows checkpoint ID when created
- Displays grouped checkpoints by date with timestamps
- Indicates most recent checkpoints first
- Shows full checkpoint details in history view

### `/checkpoint history`

Browse and view checkpoint history grouped by agent ID.

**Syntax:**

```
/checkpoint history
```

Shows an interactive tree selection where checkpoints are grouped by:

1. Agent ID
2. Individual checkpoints within each agent (sorted by creation time, newest first)

**Display Information:**

For each selected checkpoint:
- Name and creation timestamp
- Agent ID
- Full checkpoint details including state data (when retrievable)

## Services

### AgentCheckpointService

Service implementation that manages checkpoint operations.

**Properties:**

- `name`: "AgentCheckpointService"
- `description`: "Persists agent state to a storage provider"
- `options`: Configuration options from schema

**Methods:**

#### `setCheckpointProvider(provider: AgentCheckpointProvider)`

Sets the checkpoint storage provider.

```typescript
const service = agent.requireServiceByType(AgentCheckpointService);
service.setCheckpointProvider(myProvider);
```

#### `saveAgentCheckpoint(name: string, agent: Agent): Promise<string>`

Saves the current state of an agent to a checkpoint.

```typescript
const id = await service.saveAgentCheckpoint('My Checkpoint', agent);
// Returns: checkpoint ID
```

#### `restoreAgentCheckpoint(id: string, agent: Agent): Promise<void>`

Restores an agent's state from a checkpoint.

```typescript
await service.restoreAgentCheckpoint(checkpointId, agent);
```

#### `listCheckpoints(): Promise<AgentCheckpointListItem[]>`

Lists all available checkpoints.

```typescript
const checkpoints = await service.listCheckpoints();
// Returns: Array of checkpoint list items
```

#### `start(): Promise<void>`

Initializes the checkpoint provider.

```typescript
await service.start();
```

#### `attach(agent: Agent): Promise<void>`

Attaches the service to an agent and enables auto-checkpointing.

```typescript
await service.attach(agent);
```

## Providers

### AgentCheckpointProvider Interface

Interface for implementing custom checkpoint storage backends.

**Required Methods:**

#### `storeCheckpoint(data: NamedAgentCheckpoint): Promise<string>`

Stores a checkpoint and returns its ID.

```typescript
async storeCheckpoint(data: NamedAgentCheckpoint): Promise<string> {
  const id = `checkpoint-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  // Store data...
  return id;
}
```

#### `retrieveCheckpoint(id: string): Promise<StoredAgentCheckpoint | null>`

Retrieves a checkpoint by ID.

```typescript
async retrieveCheckpoint(id: string): Promise<StoredAgentCheckpoint | null> {
  // Retrieve and return checkpoint or null
}
```

#### `listCheckpoints(): Promise<AgentCheckpointListItem[]>`

Lists all stored checkpoints.

```typescript
async listCheckpoints(): Promise<AgentCheckpointListItem[]> {
  // Return array of checkpoint list items
}
```

**Optional Methods:**

#### `start?(): Promise<void>`

Optional startup method for provider initialization.

### Provider Registration

Set the checkpoint provider using `setCheckpointProvider`:

```typescript
import type {AgentCheckpointProvider} from '@tokenring-ai/checkpoint/AgentCheckpointProvider';

class MyProvider implements AgentCheckpointProvider {
  async storeCheckpoint(data: NamedAgentCheckpoint): Promise<string> {
    // Implementation
  }

  async retrieveCheckpoint(id: string): Promise<StoredAgentCheckpoint | null> {
    // Implementation
  }

  async listCheckpoints(): Promise<AgentCheckpointListItem[]> {
    // Implementation
  }
}

// Set provider
const service = agent.requireServiceByType(AgentCheckpointService);
service.setCheckpointProvider(new MyProvider());
```

## RPC Endpoints

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
      "agentState": {},
      "chatMessages": [],
      "CommandHistoryState": {},
      "HooksState": {},
      "AgentEventState": {},
      "CostTrackingState": {}
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

## Hooks

### `autoCheckpoint`

Automatically creates a checkpoint after each agent input is processed. Enabled by default when the package is attached to an agent.

**Hook Points:**

- `afterAgentInputComplete` - Triggered after agent successfully processes input
- `beforeChatCompletion` - Triggered before chat response is generated

**Behavior:**

- Triggered after agent successfully processes input or before chat completion
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

## State Management

The checkpoint service provides state management through:

- **Checkpoint Persistence**: Store and retrieve agent states
- **Provider Registration**: Configure storage backends
- **State Restoration**: Restore complete agent state from checkpoints

State slices are managed by the agent's checkpoint mechanism, including:
- Agent execution state
- Command history state
- Hooks state
- Agent event state
- Cost tracking state
- Todo state
- Chat messages

## Usage Examples

### Basic Checkpoint Workflow

```typescript
import AgentCheckpointService from '@tokenring-ai/checkpoint/AgentCheckpointService';

const service = agent.requireServiceByType(AgentCheckpointService);

// Save checkpoint
const id1 = await service.saveAgentCheckpoint('Before Changes', agent);

// Make changes to agent state
// ... agent does work ...

// Save another checkpoint
const id2 = await service.saveAgentCheckpoint('After Changes', agent);

// List all checkpoints
const all = await service.listCheckpoints();
console.log(`Total checkpoints: ${all.length}`);

// Restore from earlier checkpoint
await service.restoreAgentCheckpoint(id1, agent);
```

### Custom Storage Provider

```typescript
import type {AgentCheckpointProvider} from '@tokenring-ai/checkpoint/AgentCheckpointProvider';

class CustomProvider implements AgentCheckpointProvider {
  private checkpoints = new Map<string, any>();

  async storeCheckpoint(data: any): Promise<string> {
    const id = `checkpoint-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.checkpoints.set(id, {
      ...data,
      id,
    });
    return id;
  }

  async retrieveCheckpoint(id: string): Promise<any | null> {
    return this.checkpoints.get(id) || null;
  }

  async listCheckpoints(): Promise<any[]> {
    return Array.from(this.checkpoints.values()).map(cp => ({
      id: cp.id,
      name: cp.name,
      agentId: cp.agentId,
      createdAt: cp.createdAt
    }));
  }
}

// Set provider
const service = agent.requireServiceByType(AgentCheckpointService);
service.setCheckpointProvider(new CustomProvider());
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

- Chat commands (`/checkpoint`, `/checkpoint history`)
- Auto-checkpoint hook
- `AgentCheckpointService` service instance
- RPC endpoints for remote operations
- Configuration schema validation

### Plugin Implementation

```typescript
import {AgentCommandService, AgentLifecycleService} from "@tokenring-ai/agent";
import {TokenRingPlugin} from "@tokenring-ai/app";
import {RpcService} from "@tokenring-ai/rpc";

import {z} from "zod";
import AgentCheckpointService from "./AgentCheckpointService.js";
import agentCommands from "./commands.js";
import hooks from "./hooks.js";
import packageJSON from "./package.json" with { type: "json" };
import checkpointRPC from "./rpc/checkpoint.js";
import {CheckpointConfigSchema} from "./schema.js";

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
      agentCommandService.addAgentCommands(agentCommands)
    );
    app.waitForService(AgentLifecycleService, lifecycleService =>
      lifecycleService.addHooks(packageJSON.name, hooks)
    );
    app.waitForService(RpcService, rpcService => {
      rpcService.registerEndpoint(checkpointRPC);
    });
  },
  config: packageConfigSchema
} satisfies TokenRingPlugin<typeof packageConfigSchema>;
```

## Storage Provider Implementations

The package defines the interface; storage providers are implemented by:

- Setting the provider directly via `setCheckpointProvider(provider)`
- Implementing the `AgentCheckpointProvider` interface

**Example Provider:**

```typescript
import type {AgentCheckpointProvider} from '@tokenring-ai/checkpoint/AgentCheckpointProvider';

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
  agent.infoMessage(`Checkpoint ${id} restored`);
} catch (error) {
  agent.errorMessage(`Failed to restore checkpoint: ${error}`);
  // Agent state remains unchanged
}
```

## Testing

```bash
bun run test                  # Run tests
bun run test:watch            # Watch mode
bun run test:coverage         # Coverage report
```

## Package Structure

```
pkg/checkpoint/
├── AgentCheckpointProvider.ts      # Provider interface and data types
├── AgentCheckpointService.ts       # Main service implementation
├── schema.ts                       # Configuration schema definition
├── plugin.ts                       # Plugin registration
├── index.ts                        # Package exports
├── commands.ts                     # Command definitions
├── hooks.ts                        # Hook definitions
├── hooks/
│   └── autoCheckpoint.ts          # Auto-checkpointing hook
├── commands/
│   └── checkpoint/
│       ├── create.ts               # Create checkpoint command
│       ├── restore.ts              # Restore checkpoint command
│       ├── list.ts                 # List checkpoints command
│       └── history.ts              # History browsing command
├── rpc/
│   ├── checkpoint.ts               # RPC endpoint implementation
│   └── schema.ts                   # RPC schema definition
├── README.md                       # This file
└── package.json
```

## Exports

The package exports the following:

```typescript
// Main service
import AgentCheckpointService from '@tokenring-ai/checkpoint/AgentCheckpointService';

// Provider interface
import type {AgentCheckpointProvider} from '@tokenring-ai/checkpoint/AgentCheckpointProvider';

// Configuration schema
import {CheckpointConfigSchema} from '@tokenring-ai/checkpoint';

// Plugin
import checkpointPlugin from '@tokenring-ai/checkpoint';
```

## License

MIT License - see [LICENSE](./LICENSE) file for details.
