# @tokenring-ai/checkpoint

## Overview

The `@tokenring-ai/checkpoint` package provides persistent state management for both agents and applications within the Token Ring framework. It enables saving snapshots of current state and restoring them later, supporting workflow interruption, experimentation, and session recovery.

**Key Features:**

- **Dual Checkpoint System**: Supports both agent-level and app-level checkpointing
- **Storage Provider Architecture**: Configurable checkpoint storage providers via `setCheckpointProvider`
- **Interactive Browsing**: Tree-based UI for exploring and restoring checkpoints
- **Auto-Checkpointing**: Automatic checkpoint creation after agent input processing
- **Session History**: Browse checkpoints grouped by agent ID or date
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
    app: {
      restorePreviousState: false  // Restore latest app checkpoint on startup
    },
    agent: {}  // Agent checkpoint configuration (currently empty)
  }
} satisfies TokenRingConfig;
```

### Configuration Schema

The package uses the `CheckpointConfigSchema` which defines configuration for both app and agent checkpointing:

```typescript
import {CheckpointConfigSchema} from '@tokenring-ai/checkpoint';

// Schema structure:
// {
//   app: {
//     restorePreviousState: boolean  // Default: false
//   },
//   agent: {}  // Currently empty configuration
// }

// Schema validation example
const validConfig = CheckpointConfigSchema.parse({
  app: {
    restorePreviousState: true
  },
  agent: {}
});
```

## Core Components

### AgentCheckpointService

Main service for agent checkpoint operations. Automatically installed when the package is registered.

**Properties:**

- `name`: "AgentCheckpointService"
- `description`: "Persists agent state to a storage provider"
- `checkpointProvider`: The registered storage provider (nullable)

**Key Methods:**

- `setCheckpointProvider(provider)` - Set the checkpoint storage provider
- `saveAgentCheckpoint(name, agent)` - Save agent state to a checkpoint
- `restoreAgentCheckpoint(id, agent)` - Restore agent from checkpoint
- `listAgentCheckpoints()` - List all available checkpoints
- `retrieveAgentCheckpoint(id)` - Retrieve a specific checkpoint with full state
- `attach(agent, creationContext)` - Attach service to an agent and enable auto-checkpoint hook
- `start()` - Initialize and validate checkpoint provider

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
const checkpoints = await checkpointService.listAgentCheckpoints();

// Retrieve full checkpoint
const fullCheckpoint = await checkpointService.retrieveAgentCheckpoint(checkpointId);
```

### AppCheckpointService

Service for application-level checkpoint operations. Manages app state persistence and restoration.

**Properties:**

- `name`: "AppCheckpointService"
- `description`: "Persists app state to a storage provider"
- `checkpointProvider`: The registered storage provider (nullable)

**Key Methods:**

- `setCheckpointProvider(provider)` - Set the app checkpoint storage provider
- `saveAppCheckpoint()` - Save current app state to a checkpoint
- `restoreAppCheckpoint(id)` - Restore app from checkpoint
- `listAppCheckpoints()` - List all available app checkpoints
- `retrieveAppCheckpoint(id)` - Retrieve a specific app checkpoint
- `retrieveLatestAppCheckpoint()` - Retrieve the most recent checkpoint
- `start()` - Initialize and restore previous state if configured
- `stop()` - Save checkpoint before shutdown

**Example:**

```typescript
import AppCheckpointService from '@tokenring-ai/checkpoint/AppCheckpointService';

const appCheckpointService = app.requireServiceByType(AppCheckpointService);

// Save app checkpoint
const checkpointId = await appCheckpointService.saveAppCheckpoint();

// Restore app checkpoint
await appCheckpointService.restoreAppCheckpoint(checkpointId);

// List all app checkpoints
const checkpoints = await appCheckpointService.listAppCheckpoints();
```

### AgentCheckpointStorage

Interface for implementing custom agent checkpoint storage backends.

```typescript
import type {AgentCheckpointStorage} from '@tokenring-ai/checkpoint/AgentCheckpointStorage';

interface AgentCheckpointStorage {
  // Display name for the provider
  displayName: string;

  // Save checkpoint and return its ID
  storeAgentCheckpoint(data: NamedAgentCheckpoint): Promise<string>;

  // Retrieve checkpoint by ID
  retrieveAgentCheckpoint(id: string): Promise<StoredAgentCheckpoint | null>;

  // List all stored checkpoints (without state data)
  listAgentCheckpoints(): Promise<AgentCheckpointListItem[]>;
}
```

### AppCheckpointStorage

Interface for implementing custom app checkpoint storage backends.

```typescript
import type {AppCheckpointStorage} from '@tokenring-ai/checkpoint/AppCheckpointStorage';

interface AppCheckpointStorage {
  // Display name for the provider
  displayName: string;

  // Save checkpoint and return its ID
  storeAppCheckpoint(data: AppSessionCheckpoint): Promise<string>;

  // Retrieve checkpoint by ID
  retrieveAppCheckpoint(id: string): Promise<StoredAppCheckpoint | null>;

  // List all stored checkpoints (without state data)
  listAppCheckpoints(): Promise<AppSessionListItem[]>;

  // Retrieve the latest checkpoint
  retrieveLatestAppCheckpoint(): Promise<StoredAppCheckpoint | null>;
}
```

**Data Structures:**

```typescript
import type {
  NamedAgentCheckpoint,
  StoredAgentCheckpoint,
  AgentCheckpointListItem
} from '@tokenring-ai/checkpoint/AgentCheckpointStorage';

import type {
  StoredAppCheckpoint,
  AppSessionListItem
} from '@tokenring-ai/checkpoint/AppCheckpointStorage';

// Checkpoint with name (extends AgentCheckpointData from agent package)
interface NamedAgentCheckpoint extends AgentCheckpointData {
  name: string;
}

// Checkpoint with storage ID
interface StoredAgentCheckpoint extends NamedAgentCheckpoint {
  id: string;
}

// Checkpoint listing item (minimal info, no state)
type AgentCheckpointListItem = Omit<StoredAgentCheckpoint, "state">;

// App checkpoint with storage ID
interface StoredAppCheckpoint extends AppSessionCheckpoint {
  id: string;
}

// App checkpoint listing item
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

## Commands

### Agent Checkpoint Commands

#### `/agent checkpoint create [label]`

Create a checkpoint of the current agent state with an optional label.

**Syntax:**

```
/agent checkpoint create [label]
```

**Examples:**

```bash
/agent checkpoint create              # Create with default label "New Checkpoint"
/agent checkpoint create "Bug Fix"    # Create with custom label
```

**Output:**

```
Checkpoint created: abc123def456: Bug Fix
```

#### `/agent checkpoint restore <id>`

Restore agent state from a specific checkpoint by ID.

**Syntax:**

```
/agent checkpoint restore <id>
```

**Examples:**

```bash
/agent checkpoint restore abc123def456
```

**Output:**

```
Checkpoint abc123def456 loaded
```

#### `/agent checkpoint list`

Open an interactive tree browser to select and restore a checkpoint. Checkpoints are grouped by date, newest first.

**Syntax:**

```
/agent checkpoint list
```

**Display Information:**

- Grouped by date (📅 YYYY-MM-DD)
- Each date shows checkpoint count
- Sorted by creation time, newest first
- Shows time and label for each checkpoint

**Example Output:**

```
📅 2024-01-15 (3 checkpoints)
  ⏰ 14:30:45 - Bug Fix
  ⏰ 14:25:30 - Before Refactor
  ⏰ 14:20:15 - New Checkpoint
📅 2024-01-14 (2 checkpoints)
  ⏰ 09:15:22 - Morning Session
  ⏰ 09:10:10 - Initial State
```

#### `/agent checkpoint history`

Browse checkpoint history grouped by agent ID. Select a checkpoint to view its full details.

**Syntax:**

```
/agent checkpoint history
```

**Display Information:**

- Grouped by Agent ID
- Shows checkpoint count per agent
- Sorted by creation time, newest first
- Displays full checkpoint state when selected

### App Checkpoint Commands

#### `/app checkpoint create`

Create a checkpoint of the current app state.

**Syntax:**

```
/app checkpoint create
```

**Output:**

```
Checkpoint created: abc123def456
```

#### `/app checkpoint list`

Open an interactive tree browser to select and restore an app checkpoint. Checkpoints are grouped by date, newest first.

**Syntax:**

```
/app checkpoint list
```

**Display Information:**

- Grouped by date (📅 YYYY-MM-DD)
- Shows session ID, hostname, and working directory
- Sorted by creation time, newest first

#### `/app checkpoint history`

Browse app checkpoint history grouped by date. Select a checkpoint to view its full details.

**Syntax:**

```
/app checkpoint history
```

**Display Information:**

- Grouped by date
- Shows session details and state
- Sorted by creation time, newest first

## Services

### AgentCheckpointService

Service implementation that manages agent checkpoint operations.

**Properties:**

- `name`: "AgentCheckpointService"
- `description`: "Persists agent state to a storage provider"
- `options`: Configuration options from schema

**Methods:**

#### `setCheckpointProvider(provider: AgentCheckpointStorage)`

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

#### `listAgentCheckpoints(): Promise<AgentCheckpointListItem[]>`

Lists all available checkpoints (without state data).

```typescript
const checkpoints = await service.listAgentCheckpoints();
// Returns: Array of checkpoint list items
```

#### `retrieveAgentCheckpoint(id: string): Promise<StoredAgentCheckpoint | null>`

Retrieves a specific checkpoint with full state data.

```typescript
const checkpoint = await service.retrieveAgentCheckpoint(checkpointId);
// Returns: Full checkpoint or null
```

#### `start(): Promise<void>`

Initializes the checkpoint provider and validates it's registered.

```typescript
await service.start();
// Throws error if no provider is registered
```

#### `attach(agent: Agent, creationContext: AgentCreationContext): Promise<void>`

Attaches the service to an agent and adds checkpoint provider info to creation context.

```typescript
await service.attach(agent, creationContext);
// Adds checkpoint provider info to creation context
```

### AppCheckpointService

Service implementation that manages app checkpoint operations.

**Properties:**

- `name`: "AppCheckpointService"
- `description`: "Persists app state to a storage provider"
- `options`: Configuration options from schema

**Methods:**

#### `setCheckpointProvider(provider: AppCheckpointStorage)`

Sets the app checkpoint storage provider.

```typescript
const service = app.requireServiceByType(AppCheckpointService);
service.setCheckpointProvider(myProvider);
```

#### `saveAppCheckpoint(): Promise<string>`

Saves the current state of the app to a checkpoint.

```typescript
const id = await service.saveAppCheckpoint();
// Returns: checkpoint ID
```

#### `restoreAppCheckpoint(id: string): Promise<void>`

Restores the app's state from a checkpoint.

```typescript
await service.restoreAppCheckpoint(checkpointId);
```

#### `listAppCheckpoints(): Promise<AppSessionListItem[]>`

Lists all available app checkpoints (without state data).

```typescript
const checkpoints = await service.listAppCheckpoints();
// Returns: Array of app checkpoint list items
```

#### `retrieveAppCheckpoint(id: string): Promise<StoredAppCheckpoint | null>`

Retrieves a specific app checkpoint with full state data.

```typescript
const checkpoint = await service.retrieveAppCheckpoint(checkpointId);
// Returns: Full checkpoint or null
```

#### `retrieveLatestAppCheckpoint(): Promise<StoredAppCheckpoint | null>`

Retrieves the most recent app checkpoint.

```typescript
const latest = await service.retrieveLatestAppCheckpoint();
// Returns: Latest checkpoint or null
```

#### `start(): Promise<void>`

Initializes the checkpoint provider and restores previous state if configured.

```typescript
await service.start();
// Restores latest checkpoint if restorePreviousState is true
// Throws error if no provider is registered
```

#### `stop(): Promise<void>`

Saves a checkpoint before shutdown.

```typescript
await service.stop();
// Automatically saves checkpoint
```

## Providers

### AgentCheckpointStorage Interface

Interface for implementing custom agent checkpoint storage backends.

**Required Properties:**

#### `displayName: string`

Display name for the storage provider.

```typescript
class MyProvider implements AgentCheckpointStorage {
  displayName = "My Custom Provider";
  // ... other methods
}
```

**Required Methods:**

#### `storeAgentCheckpoint(data: NamedAgentCheckpoint): Promise<string>`

Stores a checkpoint and returns its ID.

```typescript
async storeAgentCheckpoint(data: NamedAgentCheckpoint): Promise<string> {
  const id = `checkpoint-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  // Store data with id and createdAt...
  return id;
}
```

#### `retrieveAgentCheckpoint(id: string): Promise<StoredAgentCheckpoint | null>`

Retrieves a checkpoint by ID.

```typescript
async retrieveAgentCheckpoint(id: string): Promise<StoredAgentCheckpoint | null> {
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

#### `displayName: string`

Display name for the storage provider.

```typescript
class MyProvider implements AppCheckpointStorage {
  displayName = "My Custom Provider";
  // ... other methods
}
```

**Required Methods:**

#### `storeAppCheckpoint(data: AppSessionCheckpoint): Promise<string>`

Stores a checkpoint and returns its ID.

```typescript
async storeAppCheckpoint(data: AppSessionCheckpoint): Promise<string> {
  const id = `app-checkpoint-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  // Store data with id and createdAt...
  return id;
}
```

#### `retrieveAppCheckpoint(id: string): Promise<StoredAppCheckpoint | null>`

Retrieves a checkpoint by ID.

```typescript
async retrieveAppCheckpoint(id: string): Promise<StoredAppCheckpoint | null> {
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
import type {AgentCheckpointStorage} from '@tokenring-ai/checkpoint/AgentCheckpointStorage';

class MyProvider implements AgentCheckpointStorage {
  displayName = "My Provider";

  async storeAgentCheckpoint(data: NamedAgentCheckpoint): Promise<string> {
    const id = crypto.randomUUID();
    // Store data...
    return id;
  }

  async retrieveAgentCheckpoint(id: string): Promise<StoredAgentCheckpoint | null> {
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
      "CostTrackingState": {},
      "TodoState": {},
      "AgentExecutionState": {},
      "config": {},
      "previousResponseId": "resp-789"
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
- **AppCheckpointState**: Manages app-level checkpoint state with agent checkpoints

### AppCheckpointState

State slice for managing app-level checkpoint data across multiple agents.

**Features:**

- Serializes all agent checkpoints from the agent manager
- Deserializes and restores agents from checkpoints
- Integrates with app state management system

**Example:**

```typescript
import {AppCheckpointState} from '@tokenring-ai/checkpoint/state/appCheckpointState';

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
import type {AgentCheckpointStorage} from '@tokenring-ai/checkpoint/AgentCheckpointStorage';

class CustomProvider implements AgentCheckpointStorage {
  displayName = "Custom Memory Provider";
  private checkpoints = new Map<string, any>();

  async storeAgentCheckpoint(data: any): Promise<string> {
    const id = crypto.randomUUID();
    const stored = {
      ...data,
      id,
      createdAt: Date.now(),
    };
    this.checkpoints.set(id, stored);
    return id;
  }

  async retrieveAgentCheckpoint(id: string): Promise<any | null> {
    return this.checkpoints.get(id) || null;
  }

  async listAgentCheckpoints(): Promise<any[]> {
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

### Launch Agent from Checkpoint via RPC

```typescript
// Launch a new agent from a checkpoint
const response = await fetch('/rpc/checkpoint', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    method: 'launchAgentFromCheckpoint',
    params: {
      checkpointId: 'checkpoint-123',
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
import {AgentCommandService} from "@tokenring-ai/agent";
import {TokenRingPlugin} from "@tokenring-ai/app";
import {AgentLifecycleService} from "@tokenring-ai/lifecycle";
import {RpcService} from "@tokenring-ai/rpc";

import {z} from "zod";
import AgentCheckpointService from "./AgentCheckpointService.ts";
import AppCheckpointService from "./AppCheckpointService.ts";
import agentCommands from "./commands.ts";
import hooks from "./hooks.ts";
import packageJSON from "./package.json" with { type: "json" };
import checkpointRPC from "./rpc/checkpoint.ts";
import {CheckpointConfigSchema} from "./schema.ts";

const packageConfigSchema = z.object({
  checkpoint: CheckpointConfigSchema
});

export default {
  name: packageJSON.name,
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
      lifecycleService.addHooks(hooks)
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
import type {AgentCheckpointStorage} from '@tokenring-ai/checkpoint/AgentCheckpointStorage';

class MemoryCheckpointProvider implements AgentCheckpointStorage {
  displayName = "Memory Provider";
  private checkpoints = new Map<string, any>();

  async storeAgentCheckpoint(data: any): Promise<string> {
    const id = crypto.randomUUID();
    this.checkpoints.set(id, { ...data, id, createdAt: Date.now() });
    return id;
  }

  async retrieveAgentCheckpoint(id: string) {
    return this.checkpoints.get(id) || null;
  }

  async listAgentCheckpoints() {
    return Array.from(this.checkpoints.values()).map(cp => ({
      id: cp.id,
      name: cp.name,
      agentId: cp.agentId,
      createdAt: cp.createdAt
    }));
  }
}
```

**Example App Provider:**

```typescript
import type {AppCheckpointStorage} from '@tokenring-ai/checkpoint/AppCheckpointStorage';

class MemoryAppCheckpointProvider implements AppCheckpointStorage {
  displayName = "Memory App Provider";
  private checkpoints = new Map<string, any>();

  async storeAppCheckpoint(data: any): Promise<string> {
    const id = crypto.randomUUID();
    this.checkpoints.set(id, { ...data, id, createdAt: Date.now() });
    return id;
  }

  async retrieveAppCheckpoint(id: string) {
    return this.checkpoints.get(id) || null;
  }

  async listAppCheckpoints() {
    return Array.from(this.checkpoints.values()).map(cp => ({
      id: cp.id,
      sessionId: cp.sessionId,
      hostname: cp.hostname,
      workingDirectory: cp.workingDirectory,
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

```
pkg/checkpoint/
├── AgentCheckpointStorage.ts      # Agent storage interface and data types
├── AgentCheckpointService.ts      # Agent service implementation
├── AppCheckpointStorage.ts        # App storage interface and data types
├── AppCheckpointService.ts        # App service implementation
├── schema.ts                      # Configuration schema definitions
├── plugin.ts                      # Plugin registration
├── index.ts                       # Package exports
├── commands.ts                    # Command definitions
├── hooks.ts                       # Hook definitions
├── hooks/
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
// Main services
import AgentCheckpointService from '@tokenring-ai/checkpoint/AgentCheckpointService';
import AppCheckpointService from '@tokenring-ai/checkpoint/AppCheckpointService';

// Agent storage interface and types
import type {AgentCheckpointStorage} from '@tokenring-ai/checkpoint/AgentCheckpointStorage';
import type {
  NamedAgentCheckpoint,
  StoredAgentCheckpoint,
  AgentCheckpointListItem
} from '@tokenring-ai/checkpoint/AgentCheckpointStorage';

// App storage interface and types
import type {AppCheckpointStorage} from '@tokenring-ai/checkpoint/AppCheckpointStorage';
import type {
  StoredAppCheckpoint,
  AppSessionListItem
} from '@tokenring-ai/checkpoint/AppCheckpointStorage';

// Configuration schema
import {CheckpointConfigSchema} from '@tokenring-ai/checkpoint';

// Plugin
import checkpointPlugin from '@tokenring-ai/checkpoint';

// State management
import {AppCheckpointState} from '@tokenring-ai/checkpoint/state/appCheckpointState';
```

## License

MIT License - see [LICENSE](./LICENSE) file for details.
