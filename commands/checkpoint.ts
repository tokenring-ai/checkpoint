/**
 * /checkpoint create [label] - stores current previous_response_id as a checkpoint.
 * /checkpoint restore <id> - restores previous_response_id from checkpoint
 * /checkpoint list - shows all checkpoints
 */
import {TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import createSubcommandRouter from "@tokenring-ai/agent/util/subcommandRouter";
import {create} from "./checkpoint/create.ts";
import {history} from "./checkpoint/history.ts";
import {list} from "./checkpoint/list.ts";
import {restore} from "./checkpoint/restore.ts";

const description: string =
  "/checkpoint - Create or restore conversation checkpoints to resume chat";

export const execute = createSubcommandRouter({
  create,
  restore,
  list,
  history,
})

const help: string = `# /checkpoint - Create or restore conversation checkpoints

## Actions

- **create [label]** - Create checkpoint with optional label
- **restore <id>** - Restore specific checkpoint by ID
- **list** - Interactive tree selection of checkpoints
- **history** - Browse checkpoint history grouped by agent

## Features

- Persistent checkpoint storage
- Interactive tree browser for easy selection
- Grouped by date for better organization
- Chronological ordering (newest first)
- Optional custom labels for better organization

## Examples

/checkpoint create                    - Create checkpoint with default label
/checkpoint create 'My Fix'           - Create checkpoint with custom label
/checkpoint restore abc123            - Restore specific checkpoint by ID
/checkpoint list                      - Show interactive checkpoint browser
/checkpoint history                   - Browse checkpoint history

## Output

- Confirmation messages for create/restore operations
- Interactive tree selection for list action
- Error handling for invalid checkpoint IDs
- Organized display by date and time

## Tips

- Use descriptive labels to easily identify checkpoints
- Use the list action to browse and restore checkpoints visually
- Checkpoints are automatically organized by date`;

export default {
  name: "checkpoint",
  description,
  execute,
  help,
} satisfies TokenRingAgentCommand