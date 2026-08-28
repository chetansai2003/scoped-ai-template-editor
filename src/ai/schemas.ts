import { z } from "zod";
import { propertyChangeSchema, revisionTokenSchema, structureOperationSchema } from "../commands/commandSchemas";

const jsonValueSchema = z.json();

export const proposalStatusSchema = z.enum([
  "pending",
  "accepted",
  "rejected",
  "invalid",
  "stale",
]);

export const proposalItemSchema = z
  .object({
    id: z.string().min(1),
    kind: z.enum(["property", "structure"]),
    elementId: z.string().min(1),
    propertyScope: z.enum(["content", "style", "layout"]),
    viewportScope: z.enum(["all", "desktop", "tablet", "mobile"]),
    before: jsonValueSchema,
    after: jsonValueSchema,
    changes: z.array(propertyChangeSchema),
    structureOperation: structureOperationSchema.optional(),
    revisionToken: revisionTokenSchema,
    structureRevisionTokens: z.record(z.string(), revisionTokenSchema).optional(),
    status: proposalStatusSchema,
    error: z.string().optional(),
  })
  .strict();

export const proposalBatchSchema = z
  .object({
    id: z.string().min(1),
    instruction: z.string(),
    normalizedInstruction: z.string(),
    selectedIdsSnapshot: z.array(z.string().min(1)),
    viewportScope: z.enum(["all", "desktop", "tablet", "mobile"]),
    items: z.array(proposalItemSchema),
    message: z.string().optional(),
  })
  .strict();
