import { z } from "zod";
import type { CodeDraftResult, CodeScope } from "./codeTypes";

const scopedValuesSchema = z.record(z.string(), z.json());

export function parseCodeDraft(
  draftText: string,
  expectedScope: CodeScope,
): CodeDraftResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(draftText);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof SyntaxError ? error.message : "JSON could not be parsed.",
    };
  }

  if (!isPlainObject(parsed)) {
    return { ok: false, error: "Draft must be a JSON object." };
  }

  const topLevelKeys = Object.keys(parsed);

  if (topLevelKeys.length !== 1 || topLevelKeys[0] !== expectedScope) {
    return {
      ok: false,
      error: `Draft must contain only the top-level "${expectedScope}" object.`,
    };
  }

  const scopedValue = parsed[expectedScope];

  if (!isPlainObject(scopedValue)) {
    return {
      ok: false,
      error: `"${expectedScope}" must be a JSON object.`,
    };
  }

  const parsedValues = scopedValuesSchema.safeParse(scopedValue);

  if (!parsedValues.success) {
    return {
      ok: false,
      error: `"${expectedScope}" contains values that are not JSON-safe.`,
    };
  }

  return {
    ok: true,
    draft: {
      scope: expectedScope,
      values: parsedValues.data,
    },
  };
}

export function formatCodeDraft(
  scope: CodeScope,
  values: Record<string, unknown>,
): string {
  return JSON.stringify({ [scope]: values }, null, 2);
}

function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
