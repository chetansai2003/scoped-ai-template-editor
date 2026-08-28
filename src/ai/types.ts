import type {
  JsonValue,
  PropertyChange,
  StructureOperation,
  TemplateCommand,
} from "../commands/commandTypes";
import type { ViewportScope } from "../store/editorUISlice";
import type {
  EditScope,
  ElementId,
  RevisionToken,
  TemplateDocument,
} from "../template/templateTypes";

export type ProposalStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "invalid"
  | "stale";

export interface ProposalItem {
  id: string;
  kind: "property" | "structure";
  elementId: ElementId;
  propertyScope: EditScope;
  viewportScope: ViewportScope;
  before: JsonValue;
  after: JsonValue;
  changes: PropertyChange[];
  structureOperation?: StructureOperation;
  revisionToken: RevisionToken;
  structureRevisionTokens?: Record<ElementId, RevisionToken>;
  status: ProposalStatus;
  error?: string;
}

export interface ProposalBatch {
  id: string;
  instruction: string;
  normalizedInstruction: string;
  selectedIdsSnapshot: ElementId[];
  viewportScope: ViewportScope;
  items: ProposalItem[];
  message?: string;
}

export interface GenerateProposalInput {
  instruction: string;
  selectedIds: ElementId[];
  viewportScope: ViewportScope;
  template: TemplateDocument;
}

export type ProposalCommandResult =
  | { ok: true; command: TemplateCommand }
  | { ok: false; status: "invalid" | "stale"; error: string };
