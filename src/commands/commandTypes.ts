import type { ViewportScope } from "../store/editorUISlice";
import type {
  EditScope,
  ElementContent,
  ElementId,
  ElementLayout,
  ElementStyle,
  RevisionToken,
  TemplateElement,
} from "../template/templateTypes";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type EditSource = "canvas" | "code" | "ai" | "restore";

export interface PropertyChange {
  path: string;
  oldValue: JsonValue;
  newValue: JsonValue;
}

export interface TargetEdit {
  elementId: ElementId;
  revisionToken: RevisionToken;
  changes: PropertyChange[];
}

export interface EditCommand {
  id: string;
  source: EditSource;
  propertyScope: EditScope;
  viewportScope: ViewportScope;
  selectedIdsSnapshot?: ElementId[];
  targets: TargetEdit[];
  description: string;
  timestamp: string;
}

export interface StructureReorderOperation {
  type: "reorder";
  parentId: ElementId;
  elementId: ElementId;
  fromIndex: number;
  toIndex: number;
}

export interface StructureMoveOperation {
  type: "move";
  elementId: ElementId;
  fromParentId: ElementId;
  toParentId: ElementId;
  fromIndex: number;
  toIndex: number;
}

export interface StructureAddOperation {
  type: "add";
  parentId: ElementId;
  index: number;
  element: TemplateElement;
}

export interface StructureDuplicateOperation {
  type: "duplicate";
  sourceElementId: ElementId;
  parentId: ElementId;
  index: number;
  clonedRootId: ElementId;
  clonedElements: Record<ElementId, TemplateElement>;
}

export interface StructureRestoreOperation {
  type: "restoreStructure";
  beforeElements: Record<ElementId, TemplateElement | null>;
}

export type StructureOperation =
  | StructureReorderOperation
  | StructureMoveOperation
  | StructureAddOperation
  | StructureDuplicateOperation
  | StructureRestoreOperation;

export interface StructureCommand {
  kind: "structure";
  id: string;
  source: EditSource;
  viewportScope: ViewportScope;
  selectedIdsSnapshot?: ElementId[];
  revisionTokens: Record<ElementId, RevisionToken>;
  operation: StructureOperation;
  description: string;
  timestamp: string;
}

export type TemplateCommand = EditCommand | StructureCommand;

export interface CommandError {
  code: string;
  message: string;
  elementId?: ElementId;
  path?: string;
}

export type CommandExecutionResult =
  | { ok: true; commandId: string; affectedElementIds: ElementId[] }
  | { ok: false; error: CommandError };

export interface ElementValues {
  content: ElementContent;
  style: ElementStyle;
  layout: ElementLayout;
}

export type ElementValueSnapshot = Partial<{
  content: Partial<ElementContent>;
  style: Partial<ElementStyle>;
  layout: Partial<ElementLayout>;
}>;

export interface HistoryEntry {
  id: string;
  commandId: string;
  elementId: ElementId;
  operationType: "property" | "structure";
  propertyScope: EditScope;
  viewportScope: ViewportScope;
  source: EditSource;
  description: string;
  before: ElementValueSnapshot;
  after: ElementValueSnapshot;
  structure?: {
    operation: StructureOperation["type"];
    beforeElements: Record<ElementId, TemplateElement | null>;
    afterElements: Record<ElementId, TemplateElement | null>;
  };
  previousRevision: number;
  resultingRevision: number;
  timestamp: string;
}

export interface HistoryState {
  byElement: Record<ElementId, Partial<Record<ViewportScope, HistoryEntry[]>>>;
}

export interface ValidatedTargetCommit {
  elementId: ElementId;
  beforeElement?: TemplateElement;
  afterElement: TemplateElement;
  before: ElementValueSnapshot;
  after: ElementValueSnapshot;
  previousRevision: number;
  resultingRevision: number;
  historyEntry: HistoryEntry;
}

export interface ValidatedCommitPayload {
  commandId: string;
  source: EditSource;
  propertyScope: EditScope;
  viewportScope: ViewportScope;
  description: string;
  timestamp: string;
  targets: ValidatedTargetCommit[];
  removedElementIds?: ElementId[];
}
