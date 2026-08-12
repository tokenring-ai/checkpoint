import type { RPCSchema } from "@tokenring-ai/rpc/types";
import { SuccessSchema } from "@tokenring-ai/rpc/types";
import { z } from "zod";
import { AgentCheckpointListItemSchema, CheckpointListOptionsSchema, NamedAgentCheckpointSchema } from "../AgentCheckpointStorage.ts";

export const CheckpointNotFoundSchema = z.object({
  status: z.literal("checkpointNotFound"),
});

export const PaginatedAgentCheckpointListSchema = z.object({
  items: z.array(AgentCheckpointListItemSchema),
  total: z.number(),
  hasMore: z.boolean(),
  limit: z.number(),
  offset: z.number(),
});

export default {
  name: "Checkpoint RPC",
  path: "/rpc/checkpoint",
  methods: {
    listCheckpoints: {
      type: "query",
      input: CheckpointListOptionsSchema.prefault({}),
      result: PaginatedAgentCheckpointListSchema,
    },
    streamCheckpoints: {
      type: "stream",
      input: CheckpointListOptionsSchema.prefault({}),
      result: PaginatedAgentCheckpointListSchema,
    },
    getCheckpoint: {
      type: "query",
      input: z.object({
        id: z.number(),
      }),
      result: z.discriminatedUnion("status", [
        SuccessSchema.extend({
          checkpoint: NamedAgentCheckpointSchema,
        }),
        CheckpointNotFoundSchema,
      ]),
    },
    launchAgentFromCheckpoint: {
      type: "mutation",
      input: z.object({
        checkpointId: z.number(),
        headless: z.boolean().default(false),
      }),
      result: z.discriminatedUnion("status", [
        SuccessSchema.extend({
          agentId: z.string(),
          agentName: z.string(),
          agentType: z.string().exactOptional(),
        }),
        CheckpointNotFoundSchema,
      ]),
    },
  },
} satisfies RPCSchema;
