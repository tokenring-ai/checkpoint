import {RPCSchema} from "@tokenring-ai/rpc/types";
import {z} from "zod";

export default {
  name: "Checkpoint RPC",
  path: "/rpc/checkpoint",
  methods: {
    listCheckpoints: {
      type: "query",
      input: z.object({}),
      result: z.array(z.object({
        id: z.string(),
        name: z.string(),
        agentId: z.string(),
        createdAt: z.number(),
      }))
    },
    getCheckpoint: {
      type: "query",
      input: z.object({
        id: z.string()
      }),
      result: z.object({
        id: z.string(),
        name: z.string(),
        agentId: z.string(),
        createdAt: z.number(),
        state: z.any(),
      }).nullable()
    },
    launchAgentFromCheckpoint: {
      type: "mutation",
      input: z.object({
        checkpointId: z.string(),
        headless: z.boolean().default(false),
      }),
      result: z.object({
        agentId: z.string(),
        agentName: z.string(),
        agentType: z.string().optional(),
      })
    }
  }
} satisfies RPCSchema;
