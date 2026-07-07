# @tokenring-ai/checkpoint

## Overview

The `@tokenring-ai/checkpoint` package provides persistent state management for both agents and applications within the Token Ring framework. It enables saving snapshots of current state and restoring them later, supporting workflow interruption, experimentation, and session recovery.

**Key Features:**

- **Dual Checkpoint System**: Supports both agent-level and app-level checkpointing
- **Storage Provider Architecture**: Configurable checkpoint storage providers via `setCheckpointProvider`
- **Interactive Browsing**: Tree-based UI for exploring and restoring checkpoints
- **Auto-Checkpointing**: Automatic checkpoint creation after agent input processing (via `autoCheckpoint` hook)
- **Session History**: Browse checkpoints grouped by agent ID (agent) or date (app)
- **Named Checkpoints**: Label checkpoints for easy identification
- **RPC API**: JSON-RPC endpoints for remote checkpoint operations and agent spawning
- **Plugin Architecture**: Automatic integration with TokenRing applications
- **State Management**: Integrates with app state management via `AppCheckpointState` for session recovery

## Installation

Part of the Token Ring monorepo. Install dependencies and build:

```bash
bun install
bun run build
```

## Chat Commands

### Agent Checkpoint Commands

| Command                            | Description                                                              |
|------------------------------------|--------------------------------------------------------------------------|
| `/agent checkpoint create [label]` | Create a checkpoint with an optional label (defaults to "New Checkpoint") |
| `/agent checkpoint restore <id>`   | Restore agent state from a specific checkpoint by ID                     |
| `/agent checkpoint list`           | Open an interactive tree browser to select and restore a checkpoint (grouped by date) |
| `/agent checkpoint history`        | Browse checkpoint history grouped by agent ID, view full checkpoint details |

### App Checkpoint Commands

| Command                      | Description                                                              |
|------------------------------|--------------------------------------------------------------------------|
| `/app checkpoint create`     | Create a checkpoint of the current app state                             |
| `/app checkpoint list`       | Open an interactive tree browser to select and restore an app checkpoint (grouped by date) |
| `/app checkpoint history`    | Browse app checkpoint history grouped by date, view full checkpoint details |

## Tools

This package does not define any tools.

## Configuration

Configure the checkpoint package using the plugin configuration:

```typescript
import checkpointPlugin from '@tokenring-ai/checkpoint/plugin';

export default {
  plugins: [checkpointPlugin],
  checkpoint: {
    app: {
      restorePreviousState: false,  // Restore latest app checkpoint on startup
      projectDirectory: '/path/to/project',  // Required: project directory for app state
      hostname: 'localhost'  // Optional, defaults to current hostname
    },
    agent: {}  // Agent checkpoint configuration (currently empty)
  }
} satisfies TokenRingConfig;
```

### Configuration Schema

The package uses the `CheckpointConfigSchema` which defines configuration for both app and agent checkpointing:

```typescript
import { CheckpointConfigSchema } from '@tokenring-ai/checkpoint';

// Schema structure:
// CheckpointConfigSchema = {
//   app: AppCheckpointServiceSchema,
//   agent: AgentCheckpointServiceSchema
// }

// AppCheckpointServiceSchema:
// - restorePreviousState: boolean (default: false)
// - projectDirectory: string (required)
// - hostname: string (default: current hostname from os.hostname())

// AgentCheckpointServiceSchema:
// - Empty configuration (no options currently)

// Type exports
import type {
  ParsedAppCheckpointConfig,
  ParsedAgentCheckpointConfig
} from '@tokenring-ai/checkpoint';

// Schema validation example
const validConfig = CheckpointConfigSchema.parse({
  app: {
    restorePreviousState: true,
    projectDirectory: '/path/to/project',
    hostname: 'localhost'
  },
  agent: {}
});
```

## Core Components

### AgentCheckpointService

Main service for agent checkpoint operations. Automatically installed when the package is registered.

**File:** `AgentCheckpointService.ts`

**Properties:**

- `name`: "AgentCheckpointService"
- `description`: "Persists agent state to a storage provider"
- `checkpointProvider`: The registered storage provider (nullable)
- `options`: Configuration options from `ParsedAgentCheckpointConfig`

**Key Methods:**

- `setCheckpointProvider(provider)` - Set the checkpoint storage provider
- `saveAgentCheckpoint(name, agent)` - Save agent state to a checkpoint, returns checkpoint ID
- `restoreAgentCheckpoint(id, agent)` - Restore agent from checkpoint
- `listAgentCheckpoints()` - List all available checkpoints (without state)
- `retrieveAgentCheckpoint(id)` - Retrieve a specific checkpoint with full state
- `attach(agent, creationContext)` - Attach service to an agent and add checkpoint provider info to creation context
- `start()` - Initialize and validate checkpoint provider is registered

**Example:**

```typescript
import AgentCheckpointService from '@tokenring-ai/checkpoint/AgentCheckpointService';

const checkpointService = agent.requireServiceByType(AgentCheckpointService);

// Set checkpoint provider
checkpointService.setCheckpointProvider(myProvider);

// Save checkpoint
const checkpointId = await checkpointService.saveAgentCheckpoint(
  'My Checkpoint',
  agent
);

// Restore checkpoint
await checkpointService.restoreAgentCheckpoint(checkpointId, agent);

// List all checkpoints
const checkpoints = await checkpointService.listAgentCheckpoints();

// Retrieve full checkpoint
const fullCheckpoint = await checkpointService.retrieveAgentCheckpoint(checkpointId);
```

### AppCheckpointService

Service for application-level checkpoint operations. Manages app state persistence and restoration.

**File:** `AppCheckpointService.ts`

**Properties:**

- `name`: "AppCheckpointService"
- `description`: "Persists app state to a storage provider"
- `checkpointProvider`: The registered storage provider (nullable)
- `options`: Configuration options from `ParsedAppCheckpointConfig`

**Key Methods:**

- `setCheckpointProvider(provider)` - Set the app checkpoint storage provider
- `saveAppCheckpoint()` - Save current app state to a checkpoint, returns checkpoint ID
- `restoreAppCheckpoint(id)` - Restore app from checkpoint
- `listAppCheckpoints()` - List all available app checkpoints (without state)
- `retrieveAppCheckpoint(id)` - Retrieve a specific app checkpoint with full state
- `start()` - Initialize and restore previous state if configured
- `stop()` - Save checkpoint before shutdown

**Example:**

```typescript
import AppCheckpointService from '@tokenring-ai/checkpoint/AppCheckpointService';

const appCheckpointService = app.requireServiceByType(AppCheckpointService);

// Set checkpoint provider
appCheckpointService.setCheckpointProvider(myProvider);

// Save app checkpoint
const checkpointId = await appCheckpointService.saveAppCheckpoint();

// Restore app checkpoint
await appCheckpointService.restoreAppCheckpoint(checkpointId);

// List all app checkpoints
const checkpoints = await appCheckpointService.listAppCheckpoints();
```

### AgentCheckpointStorage

Interface for implementing custom agent checkpoint storage backends.

**File:** `AgentCheckpointStorage.ts`

```typescript
import type { AgentCheckpointStorage } from '@tokenring-ai/checkpoint/AgentCheckpointStorage';

interface AgentCheckpointStorage {
  // Display name for the provider
  displayName: string;

  // Save checkpoint and return its ID (number)
  storeAgentCheckpoint(data: NamedAgentCheckpoint): Promise<number>;

  // Retrieve checkpoint by ID (number)
  retrieveAgentCheckpoint(id: number): Promise<StoredAgentCheckpoint | null>;

  // List all stored checkpoints (without state data)
  listAgentCheckpoints(): Promise<AgentCheckpointListItem[]>;
}
```

### AppCheckpointStorage

Interface for implementing custom app checkpoint storage backends.

**File:** `AppCheckpointStorage.ts`

```typescript
import type { AppCheckpointStorage } from '@tokenring-ai/checkpoint/AppCheckpointStorage';

interface AppCheckpointStorage {
  // Display name for the provider
  displayName: string;

  // Save checkpoint and return its ID (number)
  storeAppCheckpoint(data: AppSessionCheckpoint): Promise<number>;

  // Retrieve checkpoint by ID (number)
  retrieveAppCheckpoint(id: number): Promise<StoredAppCheckpoint | null>;

  // List all stored checkpoints (without state data)
  listAppCheckpoints(): Promise<AppSessionListItem[]>;

  // Retrieve the latest checkpoint
  retrieveLatestAppCheckpoint(): Promise<StoredAppCheckpoint | null>;
}
```

### Data Structures

**Agent Checkpoint Types:**

```typescript
import type {
  NamedAgentCheckpoint,
  StoredAgentCheckpoint,
  AgentCheckpointListItem
} from '@tokenring-ai/checkpoint/AgentCheckpointStorage';

// Checkpoint with name (extends AgentCheckpointData from agent package)
interface NamedAgentCheckpoint extends AgentCheckpointData {
  name: string;
}

// Checkpoint with storage ID (number)
interface StoredAgentCheckpoint extends NamedAgentCheckpoint {
  id: number;
}

// Checkpoint listing item (minimal info, no state)
type AgentCheckpointListItem = Omit<StoredAgentCheckpoint, "state">;
```

**App Checkpoint Types:**

```typescript
import type {
  StoredAppCheckpoint,
  AppSessionListItem
} from '@tokenring-ai/checkpoint/AppCheckpointStorage';

// App checkpoint with storage ID (number)
interface StoredAppCheckpoint extends AppSessionCheckpoint {
  id: number;
}

// App checkpoint listing item (without state)
type AppSessionListItem = Omit<StoredAppCheckpoint, "state">;
```

**Checkpoint State Contains:**

The `AgentCheckpointData` (from `@tokenring-ai/agent/types`) includes:

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



## Providers

### AgentCheckpointStorage Interface

Interface for implementing custom agent checkpoint storage backends.

**Required Properties:**

#### `displayName: string` (Agent Provider)

Display name for the storage provider.

```typescript
class MyProvider implements AgentCheckpointStorage {
  displayName = "My Custom Provider";
  // ... other methods
}
```

**Required Methods:**

#### `storeAgentCheckpoint(data: NamedAgentCheckpoint): Promise<number>`

Stores a checkpoint and returns its numeric ID.

```typescript
async storeAgentCheckpoint(data: NamedAgentCheckpoint): Promise<number> {
  const id = Date.now(); // Use timestamp as numeric ID
  // Store data with id and createdAt...
  return id;
}
```

#### `retrieveAgentCheckpoint(id: number): Promise<StoredAgentCheckpoint | null>`

Retrieves a checkpoint by ID.

```typescript
async retrieveAgentCheckpoint(id: number): Promise<StoredAgentCheckpoint | null> {
  // Retrieve and return checkpoint with full state or null
}
```

#### `listAgentCheckpoints(): Promise<AgentCheckpointListItem[]>`

Lists all stored checkpoints (without state data).

```typescript
async listAgentCheckpoints(): Promise<AgentCheckpointListItem[]> {
  // Return array of checkpoint list items (id, name, agentId, createdAt)
}
```

### AppCheckpointStorage Interface

Interface for implementing custom app checkpoint storage backends.

**Required Properties:**

#### `displayName: string` (App Provider)

Display name for the storage provider.

```typescript
class MyProvider implements AppCheckpointStorage {
  displayName = "My Custom Provider";
  // ... other methods
}
```

**Required Methods:**

#### `storeAppCheckpoint(data: AppSessionCheckpoint): Promise<number>`

Stores a checkpoint and returns its numeric ID.

```typescript
async storeAppCheckpoint(data: AppSessionCheckpoint): Promise<number> {
  const id = Date.now(); // Use timestamp as numeric ID
  // Store data with id and createdAt...
  return id;
}
```

#### `retrieveAppCheckpoint(id: number): Promise<StoredAppCheckpoint | null>`

Retrieves a checkpoint by ID.

```typescript
async retrieveAppCheckpoint(id: number): Promise<StoredAppCheckpoint | null> {
  // Retrieve and return checkpoint with full state or null
}
```

#### `listAppCheckpoints(): Promise<AppSessionListItem[]>`

Lists all stored checkpoints (without state data).

```typescript
async listAppCheckpoints(): Promise<AppSessionListItem[]> {
  // Return array of checkpoint list items
}
```

#### `retrieveLatestAppCheckpoint(): Promise<StoredAppCheckpoint | null>`

Retrieves the most recent checkpoint.

```typescript
async retrieveLatestAppCheckpoint(): Promise<StoredAppCheckpoint | null> {
  // Return the most recent checkpoint or null
}
```

### Provider Registration

Set the checkpoint provider using `setCheckpointProvider`:

```typescript
import type { AgentCheckpointStorage } from '@tokenring-ai/checkpoint/AgentCheckpointStorage';

class MyProvider implements AgentCheckpointStorage {
  displayName = "My Provider";

  async storeAgentCheckpoint(data: NamedAgentCheckpoint): Promise<number> {
    const id = Date.now();
    // Store data...
    return id;
  }

  async retrieveAgentCheckpoint(id: number): Promise<StoredAgentCheckpoint | null> {
    // Retrieve checkpoint
  }

  async listAgentCheckpoints(): Promise<AgentCheckpointListItem[]> {
    // List checkpoints
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

Query all available agent checkpoints without state data.

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
      "id": 1234567890,
      "name": "Before Feature Implementation",
      "agentId": "agent-456",
      "sessionId": "session-789",
      "agentType": "default",
      "createdAt": 1640995200000
    }
  ]
}
```

### `streamCheckpoints`

Stream agent checkpoint updates with polling every 5 seconds.

**Request:**

```json
{
  "method": "streamCheckpoints",
  "params": {}
}
```

**Response:**

```json
{
  "result": [
    {
      "id": 1234567890,
      "name": "Before Feature Implementation",
      "agentId": "agent-456",
      "sessionId": "session-789",
      "agentType": "default",
      "createdAt": 1640995200000
    }
  ]
}
```

### `getCheckpoint`

Retrieve a specific agent checkpoint with full state data.

**Request:**

```json
{
  "method": "getCheckpoint",
  "params": {
    "id": 1234567890
  }
}
```

**Response (Success):**

```json
{
  "status": "success",
  "checkpoint": {
    "id": 1234567890,
    "name": "Before Feature Implementation",
    "agentId": "agent-456",
    "sessionId": "session-789",
    "agentType": "default",
    "createdAt": 1640995200000,
    "state": {
      "agentState": {},
      "chatMessages": [],
      "CommandHistoryState": {},
      "HooksState": {},
      "AgentEventState": {},
      "CostTrackingState": {},
      "TodoState": {},
      "AgentExecutionState": {},
      "config": {},
      "previousResponseId": "resp-789"
    }
  }
}
```

**Response (Not Found):**

```json
{
  "status": "checkpointNotFound"
}
```

### `launchAgentFromCheckpoint`

Create a new agent from a checkpoint.

**Request:**

```json
{
  "method": "launchAgentFromCheckpoint",
  "params": {
    "checkpointId": 1234567890,
    "headless": false
  }
}
```

**Response (Success):**

```json
{
  "status": "success",
  "agentId": "agent-789",
  "agentName": "Restored Agent",
  "agentType": "default"
}
```

**Response (Not Found):**

```json
{
  "status": "checkpointNotFound"
}
```

**Note:** All RPC endpoints operate on agent checkpoints only. App checkpoints are managed through the chat commands and service API.

## Hooks

### `autoCheckpoint`

Automatically creates a checkpoint after each agent input is processed. Enabled by default when the package is attached to an agent.

**Hook Points:**

- `AfterAgentInputHandled` - Triggered after agent successfully processes input

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

## State Management

The checkpoint service provides state management through:

- **Checkpoint Persistence**: Store and retrieve agent and app states
- **Provider Registration**: Configure storage backends
- **State Restoration**: Restore complete state from checkpoints
- **AppCheckpointState**: Manages app-level checkpoint state across agents

### AppCheckpointState

State slice for managing app-level checkpoint data across multiple agents.

**Features:**

- Serializes all agent checkpoints from the agent manager
- Deserializes and restores agents from checkpoints
- Integrates with app state management system

**Example:**

```typescript
import { AppCheckpointState } from '@tokenring-ai/checkpoint/state/appCheckpointState';

// State is automatically initialized by AppCheckpointService
// when the plugin is registered
```

## Usage Examples

### Basic Agent Checkpoint Workflow

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
const all = await service.listAgentCheckpoints();
console.log(`Total checkpoints: ${all.length}`);

// Restore from earlier checkpoint
await service.restoreAgentCheckpoint(id1, agent);
```

### Basic App Checkpoint Workflow

```typescript
import AppCheckpointService from '@tokenring-ai/checkpoint/AppCheckpointService';

const service = app.requireServiceByType(AppCheckpointService);

// Save app checkpoint
const id1 = await service.saveAppCheckpoint();

// Make changes to app state
// ... app does work ...

// Restore from checkpoint
await service.restoreAppCheckpoint(id1);
```

### Custom Storage Provider

```typescript
import type { AgentCheckpointStorage } from '@tokenring-ai/checkpoint/AgentCheckpointStorage';

class CustomProvider implements AgentCheckpointStorage {
  displayName = "Custom Memory Provider";
  private checkpoints = new Map<number, any>();

  async storeAgentCheckpoint(data: any): Promise<number> {
    const id = Date.now();
    const stored = {
      ...data,
      id,
      createdAt: Date.now(),
    };
    this.checkpoints.set(id, stored);
    return id;
  }

  async retrieveAgentCheckpoint(id: number): Promise<any | null> {
    return this.checkpoints.get(id) || null;
  }

  async listAgentCheckpoints(): Promise<any[]> {
    return Array.from(this.checkpoints.values()).map(cp => ({
      id: cp.id,
      name: cp.name,
      agentId: cp.agentId,
      sessionId: cp.sessionId,
      agentType: cp.agentType,
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

### Launch Agent from Checkpoint via RPC

```typescript
// Launch a new agent from a checkpoint
const response = await fetch('/rpc/checkpoint', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    method: 'launchAgentFromCheckpoint',
    params: {
      checkpointId: 1234567890,
      headless: false
    }
  })
});

const result = await response.json();
console.log(`Launched agent: ${result.agentId}`);
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

- Chat commands (`/agent checkpoint`, `/app checkpoint`, and their subcommands)
- Auto-checkpoint hook
- `AgentCheckpointService` service instance
- `AppCheckpointService` service instance
- RPC endpoints for remote operations
- Configuration schema validation

### Plugin Implementation

```typescript
import { AgentCommandService } from "@tokenring-ai/agent";
import { TokenRingPlugin } from "@tokenring-ai/app";
import { AgentLifecycleService } from "@tokenring-ai/lifecycle";
import { RpcService } from "@tokenring-ai/rpc";

import { z } from "zod";
import AgentCheckpointService from "./AgentCheckpointService.ts";
import AppCheckpointService from "./AppCheckpointService.ts";
import agentCommands from "./commands.ts";
import autoCheckpoint from "./hooks/autoCheckpoint.ts";
import packageJSON from "./package.json" with { type: "json" };
import checkpointRPC from "./rpc/checkpoint.ts";
import { CheckpointConfigSchema } from "./schema.ts";

const packageConfigSchema = z.object({
  checkpoint: CheckpointConfigSchema
});

export default {
  name: packageJSON.name,
  displayName: "Checkpoint Service",
  version: packageJSON.version,
  description: packageJSON.description,
  install(app, config) {
    const agentCheckpointService = new AgentCheckpointService(app, config.checkpoint.agent);
    app.addServices(agentCheckpointService);

    const appCheckpointService = new AppCheckpointService(app, config.checkpoint.app);
    app.addServices(appCheckpointService);

    app.waitForService(AgentCommandService, agentCommandService =>
      agentCommandService.addAgentCommands(agentCommands)
    );
    app.waitForService(AgentLifecycleService, lifecycleService =>
      lifecycleService.addHooks(autoCheckpoint)
    );
    app.waitForService(RpcService, rpcService => {
      rpcService.registerEndpoint(checkpointRPC);
    });
  },
  config: packageConfigSchema
} satisfies TokenRingPlugin<typeof packageConfigSchema>;
```

## Storage Provider Implementations

The package defines the interfaces; storage providers are implemented by:

- Setting the provider directly via `setCheckpointProvider(provider)`
- Implementing the `AgentCheckpointStorage` or `AppCheckpointStorage` interface

**Example Agent Provider:**

```typescript
import type { AgentCheckpointStorage } from '@tokenring-ai/checkpoint/AgentCheckpointStorage';

class MemoryCheckpointProvider implements AgentCheckpointStorage {
  displayName = "Memory Provider";
  private checkpoints = new Map<number, any>();

  async storeAgentCheckpoint(data: any): Promise<number> {
    const id = Date.now();
    this.checkpoints.set(id, { ...data, id, createdAt: Date.now() });
    return id;
  }

  async retrieveAgentCheckpoint(id: number) {
    return this.checkpoints.get(id) || null;
  }

  async listAgentCheckpoints() {
    return Array.from(this.checkpoints.values()).map(cp => ({
      id: cp.id,
      name: cp.name,
      agentId: cp.agentId,
      sessionId: cp.sessionId,
      agentType: cp.agentType,
      createdAt: cp.createdAt
    }));
  }
}
```

**Example App Provider:**

```typescript
import type { AppCheckpointStorage } from '@tokenring-ai/checkpoint/AppCheckpointStorage';

class MemoryAppCheckpointProvider implements AppCheckpointStorage {
  displayName = "Memory App Provider";
  private checkpoints = new Map<number, any>();

  async storeAppCheckpoint(data: any): Promise<number> {
    const id = Date.now();
    this.checkpoints.set(id, { ...data, id, createdAt: Date.now() });
    return id;
  }

  async retrieveAppCheckpoint(id: number) {
    return this.checkpoints.get(id) || null;
  }

  async listAppCheckpoints() {
    return Array.from(this.checkpoints.values()).map(cp => ({
      id: cp.id,
      sessionId: cp.sessionId,
      hostname: cp.hostname,
      projectDirectory: cp.projectDirectory,
      createdAt: cp.createdAt
    }));
  }

  async retrieveLatestAppCheckpoint() {
    const checkpoints = Array.from(this.checkpoints.values());
    if (checkpoints.length === 0) return null;
    return checkpoints.reduce((latest, cp) =>
      cp.createdAt > latest.createdAt ? cp : latest
    );
  }
}
```

## Best Practices

1. **Register a Provider**: Always register a checkpoint provider before using checkpoint features
2. **Named Checkpoints**: Create named checkpoints at logical decision points
3. **Provider Selection**: Set an appropriate provider for your use case:
   - Memory provider for testing/experimentation
   - Persistent provider (file system, database) for production
4. **Cleanup**: Periodically list and manage checkpoints to manage storage
5. **Error Handling**: Always catch restore errors for graceful degradation
6. **RPC Usage**: Use RPC endpoints for remote checkpoint management and agent spawning
7. **Auto-Checkpointing**: Enable auto-checkpointing for frequent automatic saves during development
8. **App Checkpoints**: Use app checkpoints for session recovery across multiple agents

## Error Handling

```typescript
// Agent checkpoint error handling
try {
  await checkpointService.restoreAgentCheckpoint(id, agent);
  agent.infoMessage(`Checkpoint ${id} restored`);
} catch (error) {
  agent.errorMessage(`Failed to restore checkpoint: ${error}`);
  // Agent state remains unchanged
}

// Check if provider is registered
if (!checkpointService.checkpointProvider) {
  agent.warningMessage("No checkpoint provider registered");
}

// App checkpoint error handling
try {
  await appCheckpointService.restoreAppCheckpoint(id);
  console.log(`App checkpoint ${id} restored`);
} catch (error) {
  console.error(`Failed to restore app checkpoint: ${error}`);
}
```

## Testing

```bash
bun run test                  # Run tests
bun run test:watch            # Watch mode
bun run test:coverage         # Coverage report
```

## Package Structure

```text
pkg/checkpoint/
├── AgentCheckpointStorage.ts      # Agent storage interface and data types
├── AgentCheckpointService.ts      # Agent service implementation
├── AppCheckpointStorage.ts        # App storage interface and data types
├── AppCheckpointService.ts        # App service implementation
├── schema.ts                      # Configuration schema definitions
├── plugin.ts                      # Plugin registration
├── index.ts                       # Package exports
├── commands.ts                    # Command definitions
├── hooks/                         # Hook implementations
│   └── autoCheckpoint.ts         # Auto-checkpointing hook
├── commands/
│   ├── agent-checkpoint/
│   │   ├── create.ts              # Create agent checkpoint command
│   │   ├── restore.ts             # Restore agent checkpoint command
│   │   ├── list.ts                # List agent checkpoints command
│   │   └── history.ts             # Agent history browsing command
│   └── app-checkpoint/
│       ├── create.ts              # Create app checkpoint command
│       ├── list.ts                # List app checkpoints command
│       └── history.ts             # App history browsing command
├── rpc/
│   ├── checkpoint.ts              # RPC endpoint implementation
│   └── schema.ts                  # RPC schema definition
├── state/
│   └── appCheckpointState.ts     # App checkpoint state management
├── README.md                      # This file
└── package.json
```

## Exports

The package exports the following:

```typescript
// Main services (exported via index.ts)
import AgentCheckpointService from '@tokenring-ai/checkpoint/AgentCheckpointService';
import AgentStateStorage from '@tokenring-ai/checkpoint/AgentCheckpointService'; // Alias

// App storage interface and types (exported via index.ts)
import type {
  AppCheckpointStorage,
  AppSessionListItem,
  StoredAppCheckpoint
} from '@tokenring-ai/checkpoint';

// Configuration schema (exported via index.ts)
import { CheckpointConfigSchema } from '@tokenring-ai/checkpoint';

// Type exports (exported via index.ts)
import type {
  ParsedAgentCheckpointConfig,
  ParsedAppCheckpointConfig
} from '@tokenring-ai/checkpoint';

// Plugin (import from plugin.ts)
import checkpointPlugin from '@tokenring-ai/checkpoint/plugin';

// State management
import { AppCheckpointState } from '@tokenring-ai/checkpoint/state/appCheckpointState';

// Additional types (import directly from storage files)
import type { AgentCheckpointStorage } from '@tokenring-ai/checkpoint/AgentCheckpointStorage';
import type {
  NamedAgentCheckpoint,
  StoredAgentCheckpoint,
  AgentCheckpointListItem
} from '@tokenring-ai/checkpoint/AgentCheckpointStorage';
```

## License

MIT License - see [LICENSE](./LICENSE) file for details.
