import { createRevisionToken } from "../commands/commandExecutor";
import type {
  EditCommand,
  StructureCommand,
  TemplateCommand,
} from "../commands/commandTypes";
import type {
  ElementId,
  RevisionToken,
  TemplateDocument,
} from "../template/templateTypes";
import type { ProposalBatch, ProposalCommandResult, ProposalItem } from "./types";

export function buildProposalAcceptanceCommand(
  batch: ProposalBatch,
  item: ProposalItem,
  template: TemplateDocument,
  currentSelectedIds: ElementId[],
): ProposalCommandResult {
  if (
    !batch.selectedIdsSnapshot.includes(item.elementId) ||
    !currentSelectedIds.includes(item.elementId)
  ) {
    return {
      ok: false,
      status: "invalid",
      error: "Target is outside proposal-time or current selection.",
    };
  }

  const staleError = getProposalStaleError(item, template);

  if (staleError) {
    return { ok: false, status: "stale", error: staleError };
  }

  const command = createCommand(batch, item);

  if (!command) {
    return {
      ok: false,
      status: "invalid",
      error: "Proposal item is missing executable changes.",
    };
  }

  return { ok: true, command };
}

function createCommand(
  batch: ProposalBatch,
  item: ProposalItem,
): TemplateCommand | null {
  if (item.kind === "structure" && item.structureOperation) {
    const structureCommand: StructureCommand = {
      kind: "structure",
      id: `${item.id}-accept`,
      source: "ai",
      viewportScope: "all",
      selectedIdsSnapshot: batch.selectedIdsSnapshot,
      revisionTokens: item.structureRevisionTokens ?? {},
      operation: item.structureOperation,
      description: `Accept AI proposal ${item.id}`,
      timestamp: new Date().toISOString(),
    };

    return structureCommand;
  }

  if (item.kind !== "property" || item.changes.length === 0) {
    return null;
  }

  const editCommand: EditCommand = {
    id: `${item.id}-accept`,
    source: "ai",
    propertyScope: item.propertyScope,
    viewportScope: item.viewportScope,
    selectedIdsSnapshot: batch.selectedIdsSnapshot,
    targets: [
      {
        elementId: item.elementId,
        revisionToken: item.revisionToken,
        changes: item.changes,
      },
    ],
    description: `Accept AI proposal ${item.id}`,
    timestamp: new Date().toISOString(),
  };

  return editCommand;
}

function getProposalStaleError(
  item: ProposalItem,
  template: TemplateDocument,
): string | null {
  if (item.kind === "structure") {
    const revisionEntries = Object.entries(item.structureRevisionTokens ?? {});

    for (const [elementId, token] of revisionEntries) {
      const element = template.elements[elementId];

      if (!element || !tokensMatch(createRevisionToken(element, "all"), token)) {
        return "Target changed after proposal generation.";
      }
    }

    return null;
  }

  const element = template.elements[item.elementId];

  if (!element) {
    return "Target element is no longer available.";
  }

  const currentToken = createRevisionToken(element, item.viewportScope);

  return tokensMatch(currentToken, item.revisionToken)
    ? null
    : "Target changed after proposal generation.";
}

function tokensMatch(left: RevisionToken, right: RevisionToken): boolean {
  return left.base === right.base && left.viewport === right.viewport;
}
