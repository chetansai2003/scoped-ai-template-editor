import type { EditCommand, JsonValue } from "../commands/commandTypes";
import type { EditScope } from "../template/templateTypes";

export type CodeScope = EditScope;

export interface ParsedCodeDraft {
  scope: CodeScope;
  values: Record<string, JsonValue>;
}

export type CodeDraftResult =
  | { ok: true; draft: ParsedCodeDraft }
  | { ok: false; error: string };

export type CodeCommandResult =
  | { ok: true; command: EditCommand | null }
  | { ok: false; error: string };
