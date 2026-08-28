import {
  PERSISTENCE_KEY,
  persistedEditorStateSchema,
  type PersistedEditorState,
} from "./persistedStateSchema";

export type LoadPersistedStateResult =
  | { ok: true; state: PersistedEditorState }
  | { ok: false; error: string; needsRecovery: boolean };

export function loadPersistedState(): LoadPersistedStateResult {
  try {
    const rawData = localStorage.getItem(PERSISTENCE_KEY);
    if (!rawData) {
      return { ok: false, error: "No persisted state found.", needsRecovery: false };
    }

    const parsedJson = JSON.parse(rawData);
    const validationResult = persistedEditorStateSchema.safeParse(parsedJson);

    if (!validationResult.success) {
      return {
        ok: false,
        error: "Persisted state failed schema validation.",
        needsRecovery: true,
      };
    }

    return { ok: true, state: validationResult.data };
  } catch {
    return {
      ok: false,
      error: "Unknown error parsing persisted state.",
      needsRecovery: true,
    };
  }
}

export function savePersistedState(state: PersistedEditorState): Error | null {
  try {
    const serialized = JSON.stringify(state);
    localStorage.setItem(PERSISTENCE_KEY, serialized);
    return null;
  } catch (e) {
    if (e instanceof Error) {
      return e;
    }
    return new Error("Unknown error saving persisted state.");
  }
}

export function clearPersistedState(): void {
  try {
    localStorage.removeItem(PERSISTENCE_KEY);
  } catch {
    // Ignore errors when clearing
  }
}
