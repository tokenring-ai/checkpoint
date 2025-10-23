# Checkpoint Package

## Overview

The `@tokenring-ai/checkpoint` package provides persistent state management for agents within the Token Ring Agent framework. It enables agents to save snapshots of their current state and restore them later, supporting workflow interruption, experimentation, and session recovery.

**Key Features:**
- **State Snapshots**: Save complete agent state including chat history, tools, hooks, and custom state
- **Multi-Provider Support**: Pluggable storage backends for checkpoint persistence
- **Interactive Browsing**: Tree-based UI for exploring and restoring checkpoints
- **Auto-Checkpointing**: Automatic checkpoint creation after agent input processing
- **Session History**: Browse checkpoints grouped by agent session
- **Named Checkpoints**: Label checkpoints for easy identification

## Installation

Part of the Token Ring monorepo. Install dependencies and build:

```bash
bun install
bun run build
```

## Configuration

Configure the checkpoint package in your `.tokenring/coder-config.mjs`:

```javascript
export default {
  checkpoint: {
    defaultProvider: "memory",  // or other provider name
    providers: {
      "memory": {
        // In-memory storage provider
      },
      "database": {
        // Database storage provider
        connectionString: "sqlite://./checkpoints.db"
      }
    }
  }
};
```

## Core Components

### AgentCheckpointService

Main service for checkpoint operations. Automatically installed when the package is registered.

**Key Methods:**
- `registerProvider(name, provider)` - Register a checkpoint storage provider
- `getActiveProvider()` - Get the currently active storage provider
- `getActiveProviderName()` - Get the name of the active provider
- `setActiveProviderName(name)` - Switch to a different provider
- `getAvailableProviders()` - List all registered provider names
- `saveAgentCheckpoint(name, agent)` - Save agent state to a checkpoint
- `restoreAgentCheckpoint(id, agent)` - Restore agent from checkpoint
- `listCheckpoints()` - List all available checkpoints

**Example:**
```typescript
import { AgentCheckpointService } from '@tokenring-ai/checkpoint';

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
interface AgentCheckpointProvider {
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
type AgentCheckpointListItem = Omit<StoredAgentCheckpoint, "state">;
```

**Checkpoint State Contains:**
- `toolsEnabled` - Currently enabled tools
- `hooksEnabled` - Currently enabled hooks
- `agentState` - Custom agent state
- `chatMessages` - Conversation history
- `responseId` - Last response ID
- `agentId` - Agent identifier
- `createdAt` - Checkpoint creation timestamp

### Checkpoint Storage Interface

Extending the provider pattern for custom implementations:

```typescript
export interface AgentCheckpointProvider {
  storeCheckpoint(data: NamedAgentCheckpoint): Promise<string>;
  retrieveCheckpoint(id: string): Promise<StoredAgentCheckpoint | null>;
  listCheckpoints(): Promise<AgentCheckpointListItem[]>;
}
```

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
- Enabled tools and hooks
- Custom state keys
- Full checkpoint details (when retrievable)

## Hooks

### `autoCheckpoint`

Automatically creates a checkpoint after each agent input is processed. Enabled by default when the package is installed.

**Hook Point:** `afterAgentInputComplete`

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

## Usage Examples

### Basic Checkpoint Workflow

```typescript
import { AgentCheckpointService } from '@tokenring-ai/checkpoint';

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
import type { AgentCheckpointProvider, NamedAgentCheckpoint, StoredAgentCheckpoint, AgentCheckpointListItem } from '@tokenring-ai/checkpoint/AgentCheckpointProvider';

class CustomProvider implements AgentCheckpointProvider {
  private checkpoints = new Map<string, StoredAgentCheckpoint>();

  async storeCheckpoint(data: NamedAgentCheckpoint): Promise<string> {
    const id = crypto.randomUUID();
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

// Register provider
const checkpointService = agent.requireServiceByType(AgentCheckpointService);
checkpointService.registerProvider('custom', new CustomProvider());
checkpointService.setActiveProviderName('custom');
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

## Package Integration

### Installation with AgentTeam

The checkpoint package is automatically installed when registered with an AgentTeam:

```typescript
import { packageInfo } from '@tokenring-ai/checkpoint';

agentTeam.registerPackages([packageInfo]);
```

**Automatically Provides:**
- Chat commands (`/checkpoint`, `/history`)
- Auto-checkpoint hook
- `AgentCheckpointService` service instance
- Configuration schema validation

### Configuration Schema

```typescript
interface CheckpointConfig {
  defaultProvider: string;      // Active storage provider name
  providers: Record<string, any>; // Provider configurations
}
```

## Storage Provider Implementations

The package defines the interface; storage providers are implemented separately:

- **Memory Provider**: In-memory checkpoint storage (for testing/demo)
- **Database Provider**: Persistent storage in database
- **File Provider**: Checkpoint files in filesystem
- **Custom Providers**: Implement `AgentCheckpointProvider` interface

## Best Practices

1. **Regular Checkpoints**: Use auto-checkpointing for frequent automatic saves
2. **Named Checkpoints**: Create named checkpoints at logical decision points
3. **Storage Selection**: Choose appropriate provider for your use case:
   - Memory for testing/experimentation
   - Database for production deployments
4. **Cleanup**: Periodically list and remove old checkpoints to manage storage
5. **Error Handling**: Always catch restore errors for graceful degradation

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
bun test                  # Run tests
bun run test:watch        # Watch mode
bun run test:coverage     # Coverage report
```

## License

MIT License - see LICENSE file for details.