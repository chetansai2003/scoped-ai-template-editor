import { z } from "zod";
import { validateTemplateStructure } from "../commands/templateStructure";
import { historyEntrySchema } from "../commands/commandSchemas";
import type { TemplateDocument } from "../template/templateTypes";
import type { HistoryState } from "../commands/commandTypes";

// The schema must perfectly match the TemplateDocument type
// without creating a second conflicting type definition.

const viewportSettingSchema = z.object({
  label: z.string(),
  width: z.number().int().positive(),
}).strict();

const elementContentSchema = z.object({
  text: z.string().optional(),
  alt: z.string().optional(),
  href: z.string().optional(),
  role: z.enum(["span", "paragraph", "heading1", "heading2", "heading3"]).optional(),
  label: z.string().optional(),
  src: z.string().optional(),
}).strict();

const elementStyleSchema = z.object({
  background: z.string().optional(),
  borderColor: z.string().optional(),
  color: z.string().optional(),
  fontSize: z.number().optional(),
  fontWeight: z.union([z.literal(400), z.literal(500), z.literal(600), z.literal(700), z.literal(800)]).optional(),
  radius: z.string().optional(),
  shadow: z.string().optional(),
  textAlign: z.enum(["left", "center", "right"]).optional(),
  tone: z.enum(["dark", "light", "muted", "accent"]).optional(),
}).strict();

const elementLayoutSchema = z.object({
  align: z.enum(["start", "center", "end", "stretch"]).optional(),
  columns: z.number().int().optional(),
  gap: z.string().optional(),
  height: z.number().optional(),
  margin: z.string().optional(),
  maxWidth: z.string().optional(),
  minHeight: z.number().optional(),
  minWidth: z.number().optional(),
  offsetX: z.number().optional(),
  offsetY: z.number().optional(),
  padding: z.string().optional(),
  variant: z.string().optional(),
  visible: z.boolean().optional(),
  width: z.number().optional(),
}).strict();

const responsiveElementOverrideSchema = z.object({
  content: elementContentSchema.partial().optional(),
  style: elementStyleSchema.partial().optional(),
  layout: elementLayoutSchema.partial().optional(),
}).strict();

const templateElementSchema = z.object({
  id: z.string(),
  type: z.enum([
    "page",
    "section",
    "container",
    "stack",
    "text",
    "button",
    "image",
    "card",
    "badge",
    "stat",
    "nav",
  ]),
  name: z.string(),
  parentId: z.string().optional(),
  children: z.array(z.string()),
  content: elementContentSchema,
  style: elementStyleSchema,
  layout: elementLayoutSchema,
  overrides: z.object({
    desktop: responsiveElementOverrideSchema.optional(),
    tablet: responsiveElementOverrideSchema.optional(),
    mobile: responsiveElementOverrideSchema.optional(),
  }).strict(),
  revisions: z.object({
    base: z.number().int().min(0),
    desktop: z.number().int().min(0),
    tablet: z.number().int().min(0),
    mobile: z.number().int().min(0),
  }).strict(),
}).strict();

const templateDocumentSchema = z.object({
  metadata: z.object({
    schemaVersion: z.number(),
    templateId: z.string(),
    templateName: z.string(),
    source: z.literal("original"),
    status: z.literal("renderable"),
  }).strict(),
  rootElementId: z.string(),
  elements: z.record(z.string(), templateElementSchema),
  viewportSettings: z.object({
    desktop: viewportSettingSchema,
    tablet: viewportSettingSchema,
    mobile: viewportSettingSchema,
  }).strict(),
}).strict()
.superRefine((val, ctx) => {
  const error = validateTemplateStructure(val as TemplateDocument);
  if (error) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: error.message,
      path: ["elements", error.elementId || ""],
    });
  }
});

const historyStateSchema = z.object({
  byElement: z.record(
    z.string(), // ElementId
    z.object({
      all: z.array(historyEntrySchema).optional(),
      desktop: z.array(historyEntrySchema).optional(),
      tablet: z.array(historyEntrySchema).optional(),
      mobile: z.array(historyEntrySchema).optional(),
    }).strict()
  ),
  undoneCommandIds: z.array(z.string()).default([]),
}).strict();

export const PERSISTENCE_KEY = "scoped-ai-editor:v1";
export const PERSISTENCE_SCHEMA_VERSION = 1;

export const persistedEditorStateSchema = z.object({
  schemaVersion: z.literal(PERSISTENCE_SCHEMA_VERSION),
  template: templateDocumentSchema,
  history: historyStateSchema,
}).strict() as z.ZodType<PersistedEditorState>;

export interface PersistedEditorState {
  schemaVersion: number;
  template: TemplateDocument;
  history: HistoryState;
}
