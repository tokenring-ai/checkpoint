import { SuccessSchema } from "@tokenring-ai/rpc/types";
import type { RPCSchema } from "@tokenring-ai/rpc/types";
import { z } from "zod";
import { NamedAgentCheckpointSchema } from "../AgentCheckpointStorage.ts";
import { AgentCheckpointListItemSchema } from "../AgentCheckpointStorage.ts";

export const CheckpointNotFoundSchema = z.object({
  status: z.literal("checkpointNotFound"),
});

export default {
  name: "Checkpoint RPC",
  path: "/rpc/checkpoint",
  methods: {
    listCheckpoints: {
      type: "query",
      input: z.object({}),
      result: z.array(AgentCheckpointListItemSchema),
    },
    streamCheckpoints: {
      type: "stream",
      input: z.object({}),
      result: z.array(AgentCheckpointListItemSchema),
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
