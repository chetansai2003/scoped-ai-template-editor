import { z } from "zod";

const jsonValueSchema = z.json();
const templateElementSchema = z.custom(
  (value) => value !== null && typeof value === "object",
);

export const revisionTokenSchema = z
  .object({
    base: z.number().int().min(0),
    viewport: z.number().int().min(0).optional(),
  })
  .strict();

export const propertyChangeSchema = z
  .object({
    path: z.string().min(1),
    oldValue: jsonValueSchema,
    newValue: jsonValueSchema,
  })
  .strict();

export const targetEditSchema = z
  .object({
    elementId: z.string().min(1),
    revisionToken: revisionTokenSchema,
    changes: z.array(propertyChangeSchema).min(1),
  })
  .strict();

const valueSnapshotSchema = z
  .object({
    content: z.record(z.string(), jsonValueSchema).optional(),
    style: z.record(z.string(), jsonValueSchema).optional(),
    layout: z.record(z.string(), jsonValueSchema).optional(),
  })
  .strict();

export const editCommandSchema = z
  .object({
    id: z.string().min(1),
    source: z.enum(["canvas", "code", "ai", "restore"]),
    propertyScope: z.enum(["content", "style", "layout"]),
    viewportScope: z.enum(["all", "desktop", "tablet", "mobile"]),
    selectedIdsSnapshot: z.array(z.string().min(1)).optional(),
    targets: z.array(targetEditSchema).min(1),
    description: z.string().min(1).max(240),
    timestamp: z.string().datetime({ offset: true }),
  })
  .strict();

const structureReorderOperationSchema = z
  .object({
    type: z.literal("reorder"),
    parentId: z.string().min(1),
    elementId: z.string().min(1),
    fromIndex: z.number().int().min(0),
    toIndex: z.number().int().min(0),
  })
  .strict();

const structureMoveOperationSchema = z
  .object({
    type: z.literal("move"),
    elementId: z.string().min(1),
    fromParentId: z.string().min(1),
    toParentId: z.string().min(1),
    fromIndex: z.number().int().min(0),
    toIndex: z.number().int().min(0),
  })
  .strict();

const structureAddOperationSchema = z
  .object({
    type: z.literal("add"),
    parentId: z.string().min(1),
    index: z.number().int().min(0),
    element: templateElementSchema,
  })
  .strict();

const structureDuplicateOperationSchema = z
  .object({
    type: z.literal("duplicate"),
    sourceElementId: z.string().min(1),
    parentId: z.string().min(1),
    index: z.number().int().min(0),
    clonedRootId: z.string().min(1),
    clonedElements: z.record(z.string(), templateElementSchema),
  })
  .strict();

const structureRestoreOperationSchema = z
  .object({
    type: z.literal("restoreStructure"),
    beforeElements: z.record(z.string(), templateElementSchema.nullable()),
  })
  .strict();

export const structureOperationSchema = z.discriminatedUnion("type", [
  structureReorderOperationSchema,
  structureMoveOperationSchema,
  structureAddOperationSchema,
  structureDuplicateOperationSchema,
  structureRestoreOperationSchema,
]);

export const structureCommandSchema = z
  .object({
    kind: z.literal("structure"),
    id: z.string().min(1),
    source: z.enum(["canvas", "code", "ai", "restore"]),
    viewportScope: z.enum(["all", "desktop", "tablet", "mobile"]),
    revisionTokens: z.record(z.string(), revisionTokenSchema),
    operation: structureOperationSchema,
    description: z.string().min(1).max(240),
    timestamp: z.string().datetime({ offset: true }),
  })
  .strict();

export const templateCommandSchema = z.union([
  editCommandSchema,
  structureCommandSchema,
]);

export const historyEntrySchema = z
  .object({
    id: z.string().min(1),
    commandId: z.string().min(1),
    elementId: z.string().min(1),
    operationType: z.enum(["property", "structure"]),
    propertyScope: z.enum(["content", "style", "layout"]),
    viewportScope: z.enum(["all", "desktop", "tablet", "mobile"]),
    source: z.enum(["canvas", "code", "ai", "restore"]),
    description: z.string().min(1).max(240),
    before: valueSnapshotSchema,
    after: valueSnapshotSchema,
    structure: z
      .object({
        operation: z.enum([
          "reorder",
          "move",
          "add",
          "duplicate",
          "restoreStructure",
        ]),
        beforeElements: z.record(z.string(), templateElementSchema.nullable()),
        afterElements: z.record(z.string(), templateElementSchema.nullable()),
      })
      .strict()
      .optional(),
    previousRevision: z.number().int().min(0),
    resultingRevision: z.number().int().min(0),
    timestamp: z.string().datetime({ offset: true }),
  })
  .strict();

const validatedTargetCommitSchema = z
  .object({
    elementId: z.string().min(1),
    beforeElement: templateElementSchema.optional(),
    afterElement: templateElementSchema,
    before: valueSnapshotSchema,
    after: valueSnapshotSchema,
    previousRevision: z.number().int().min(0),
    resultingRevision: z.number().int().min(0),
    historyEntry: historyEntrySchema,
  })
  .strict();

export const validatedCommitPayloadSchema = z
  .object({
    commandId: z.string().min(1),
    source: z.enum(["canvas", "code", "ai", "restore"]),
    propertyScope: z.enum(["content", "style", "layout"]),
    viewportScope: z.enum(["all", "desktop", "tablet", "mobile"]),
    description: z.string().min(1).max(240),
    timestamp: z.string().datetime({ offset: true }),
    targets: z.array(validatedTargetCommitSchema).min(1),
    removedElementIds: z.array(z.string().min(1)).optional(),
  })
  .strict();
