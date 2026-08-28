import { buildValidatedCommitPayload, createRevisionToken, getScopedValueForCommand } from "../commands/commandExecutor";
import { isEditablePath } from "../commands/editableFields";
import type {
  EditCommand,
  JsonValue,
  PropertyChange,
  StructureCommand,
  StructureOperation,
} from "../commands/commandTypes";
import type {
  EditScope,
  ElementId,
  TemplateDocument,
  TemplateElement,
} from "../template/templateTypes";
import { proposalBatchSchema } from "./schemas";
import type {
  GenerateProposalInput,
  ProposalBatch,
  ProposalItem,
} from "./types";

type ScenarioBuilder = (
  input: NormalizedProposalInput,
) => Omit<ProposalBatch, "id" | "normalizedInstruction">;

interface NormalizedProposalInput extends GenerateProposalInput {
  normalizedInstruction: string;
}

const aliases: Record<string, string> = {
  "make selected text concise": "make this text more concise",
  "make text concise": "make this text more concise",
  "make it dark blue": "make the selected element dark blue",
  "make selected element dark blue": "make the selected element dark blue",
  "make card wider and first": "make this card wider and move it first",
  "stack vertically": "stack selected items vertically",
  "compact cards": "make the selected cards compact",
};

const scenarios: Record<string, ScenarioBuilder> = {
  "make this text more concise": buildConciseTextScenario,
  "make the selected element dark blue": buildDarkBlueScenario,
  "make this card wider and move it first": buildCardWiderFirstScenario,
  "stack selected items vertically": buildVerticalStackScenario,
  "make the selected cards compact": buildCompactCardsScenario,
  "add a payment system": buildUnsupportedPaymentScenario,
};

export function generateProposals(input: GenerateProposalInput): ProposalBatch {
  const normalizedInstruction = normalizeInstruction(input.instruction);
  const canonicalInstruction = aliases[normalizedInstruction] ?? normalizedInstruction;
  const builder = scenarios[canonicalInstruction] ?? buildUnknownScenario;
  const batchSeed = JSON.stringify({
    instruction: canonicalInstruction,
    selectedIds: input.selectedIds,
    viewportScope: input.viewportScope,
    revisions: input.selectedIds.map((id) => input.template.elements[id]?.revisions),
  });
  const batchCore = builder({
    ...input,
    normalizedInstruction: canonicalInstruction,
  });
  const batch: ProposalBatch = {
    ...batchCore,
    id: `batch-${stableHash(batchSeed)}`,
    normalizedInstruction: canonicalInstruction,
  };
  const parsedBatch = proposalBatchSchema.safeParse(prevalidateBatch(batch, input.template));

  if (!parsedBatch.success) {
    return {
      ...batch,
      items: batch.items.map((item) => ({
        ...item,
        status: "invalid",
        error: "Generated proposal did not match the proposal schema.",
      })),
    };
  }

  return parsedBatch.data as ProposalBatch;
}

function buildConciseTextScenario(
  input: NormalizedProposalInput,
): Omit<ProposalBatch, "id" | "normalizedInstruction"> {
  const items = input.selectedIds.flatMap((elementId) => {
    const element = input.template.elements[elementId];

    if (!element || !isEditablePath(element.type, "content.text")) {
      return invalidItem(input, elementId, "content", "Selected element does not have editable text.");
    }

    const before = getScopedValueForCommand(
      element,
      input.viewportScope,
      "content",
      "text",
    );

    if (typeof before !== "string") {
      return invalidItem(input, elementId, "content", "Selected text value is unavailable.");
    }

    return [
      propertyItem(
        input,
        element,
        "content",
        "content.text",
        before,
        conciseText(before),
      ),
    ];
  });

  return batchBase(input, items);
}

function buildDarkBlueScenario(
  input: NormalizedProposalInput,
): Omit<ProposalBatch, "id" | "normalizedInstruction"> {
  const items = input.selectedIds.flatMap((elementId) => {
    const element = input.template.elements[elementId];

    if (!element) {
      return invalidItem(input, elementId, "style", "Selected element is missing.");
    }

    const path = isEditablePath(element.type, "style.background")
      ? "style.background"
      : "style.color";

    if (!isEditablePath(element.type, path)) {
      return invalidItem(input, elementId, "style", "Selected element cannot receive dark blue styling.");
    }

    const fieldName = path.split(".")[1];
    const before = getScopedValueForCommand(
      element,
      input.viewportScope,
      "style",
      fieldName,
    );

    return [
      propertyItem(input, element, "style", path, before, "#0f2a44"),
    ];
  });

  return batchBase(input, items);
}

function buildCardWiderFirstScenario(
  input: NormalizedProposalInput,
): Omit<ProposalBatch, "id" | "normalizedInstruction"> {
  if (input.viewportScope !== "all") {
    return batchBase(input, [], "Card reorder proposals require All views scope.");
  }

  const selectedCards = input.selectedIds
    .map((id) => input.template.elements[id])
    .filter((element): element is TemplateElement => element?.type === "card");

  if (selectedCards.length !== 1) {
    return batchBase(input, [], "Select exactly one card for the wider and first scenario.");
  }

  const card = selectedCards[0];
  const widthBefore = getScopedValueForCommand(card, "all", "layout", "width");
  const widthAfter =
    typeof widthBefore === "number" ? Math.min(widthBefore + 120, 900) : 520;
  const items: ProposalItem[] = [
    propertyItem(input, card, "layout", "layout.width", widthBefore, widthAfter),
  ];

  if (card.parentId) {
    const parent = input.template.elements[card.parentId];
    const fromIndex = parent?.children.indexOf(card.id) ?? -1;

    if (parent && fromIndex > 0) {
      const operation: StructureOperation = {
        type: "reorder",
        parentId: parent.id,
        elementId: card.id,
        fromIndex,
        toIndex: 0,
      };

      items.push(structureItem(input, card, operation, [parent.id]));
    }
  }

  return batchBase(input, items);
}

function buildVerticalStackScenario(
  input: NormalizedProposalInput,
): Omit<ProposalBatch, "id" | "normalizedInstruction"> {
  if (input.viewportScope === "all") {
    return batchBase(input, [], "Stacking selected items vertically requires a desktop, tablet, or mobile-only scope.");
  }

  const items = input.selectedIds.flatMap((elementId) => {
    const element = input.template.elements[elementId];

    if (!element || !isEditablePath(element.type, "layout.columns")) {
      return invalidItem(input, elementId, "layout", "Selected element cannot stack by columns.");
    }

    const before = getScopedValueForCommand(
      element,
      input.viewportScope,
      "layout",
      "columns",
    );

    return [
      propertyItem(input, element, "layout", "layout.columns", before, 1),
    ];
  });

  return batchBase(input, items);
}

function buildCompactCardsScenario(
  input: NormalizedProposalInput,
): Omit<ProposalBatch, "id" | "normalizedInstruction"> {
  const items = input.selectedIds.flatMap((elementId) => {
    const element = input.template.elements[elementId];

    if (!element || element.type !== "card") {
      return invalidItem(input, elementId, "layout", "Selected element is not a card.");
    }

    const before = getScopedValueForCommand(
      element,
      input.viewportScope,
      "layout",
      "padding",
    );

    return [
      propertyItem(input, element, "layout", "layout.padding", before, "16px"),
    ];
  });

  return batchBase(input, items);
}

function buildUnsupportedPaymentScenario(
  input: NormalizedProposalInput,
): Omit<ProposalBatch, "id" | "normalizedInstruction"> {
  return batchBase(input, [], "Payment systems require backend and integration work outside Step 5.");
}

function buildUnknownScenario(
  input: NormalizedProposalInput,
): Omit<ProposalBatch, "id" | "normalizedInstruction"> {
  return batchBase(input, [], "This deterministic scenario is not supported in Step 5.");
}

function propertyItem(
  input: NormalizedProposalInput,
  element: TemplateElement,
  propertyScope: EditScope,
  path: string,
  before: JsonValue,
  after: JsonValue,
): ProposalItem {
  const change: PropertyChange = { path, oldValue: before, newValue: after };

  return {
    id: proposalItemId(input, element.id, path),
    kind: "property",
    elementId: element.id,
    propertyScope,
    viewportScope: input.viewportScope,
    before,
    after,
    changes: [change],
    revisionToken: createRevisionToken(element, input.viewportScope),
    status: areJsonValuesEqual(before, after) ? "invalid" : "pending",
    error: areJsonValuesEqual(before, after) ? "No change proposed." : undefined,
  };
}

function structureItem(
  input: NormalizedProposalInput,
  element: TemplateElement,
  operation: StructureOperation,
  revisionElementIds: ElementId[],
): ProposalItem {
  const structureRevisionTokens = Object.fromEntries(
    revisionElementIds
      .map((elementId) => input.template.elements[elementId])
      .filter((target): target is TemplateElement => Boolean(target))
      .map((target) => [target.id, createRevisionToken(target, "all")]),
  );

  return {
    id: proposalItemId(input, element.id, operation.type),
    kind: "structure",
    elementId: element.id,
    propertyScope: "layout",
    viewportScope: "all",
    before: operation.type,
    after: JSON.stringify(operation),
    changes: [],
    structureOperation: operation,
    revisionToken: createRevisionToken(element, "all"),
    structureRevisionTokens,
    status: "pending",
  };
}

function invalidItem(
  input: NormalizedProposalInput,
  elementId: ElementId,
  propertyScope: EditScope,
  error: string,
): ProposalItem[] {
  const element = input.template.elements[elementId];

  if (!element) {
    return [];
  }

  return [
    {
      id: proposalItemId(input, elementId, error),
      kind: "property",
      elementId,
      propertyScope,
      viewportScope: input.viewportScope,
      before: null,
      after: null,
      changes: [],
      revisionToken: createRevisionToken(element, input.viewportScope),
      status: "invalid",
      error,
    },
  ];
}

function prevalidateBatch(
  batch: ProposalBatch,
  template: TemplateDocument,
): ProposalBatch {
  return {
    ...batch,
    items: batch.items.map((item) => {
      if (item.status !== "pending") {
        return item;
      }

      const command = buildCommandForPrevalidation(batch, item);
      const result = buildValidatedCommitPayload(
        command,
        template,
        batch.selectedIdsSnapshot,
      );

      if (result.ok) {
        return item;
      }

      return {
        ...item,
        status: "invalid",
        error: result.error.message,
      };
    }),
  };
}

function buildCommandForPrevalidation(
  batch: ProposalBatch,
  item: ProposalItem,
): EditCommand | StructureCommand {
  if (item.kind === "structure" && item.structureOperation) {
    return {
      kind: "structure",
      id: `${item.id}-preflight`,
      source: "ai",
      viewportScope: "all",
      selectedIdsSnapshot: batch.selectedIdsSnapshot,
      revisionTokens: item.structureRevisionTokens ?? {},
      operation: item.structureOperation,
      description: `Preflight ${item.id}`,
      timestamp: "2026-08-28T00:00:00.000Z",
    };
  }

  return {
    id: `${item.id}-preflight`,
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
    description: `Preflight ${item.id}`,
    timestamp: "2026-08-28T00:00:00.000Z",
  };
}

function batchBase(
  input: NormalizedProposalInput,
  items: ProposalItem[],
  message?: string,
): Omit<ProposalBatch, "id" | "normalizedInstruction"> {
  return {
    instruction: input.instruction,
    selectedIdsSnapshot: [...input.selectedIds],
    viewportScope: input.viewportScope,
    items,
    message,
  };
}

function normalizeInstruction(instruction: string): string {
  return instruction.trim().toLowerCase().replace(/\s+/g, " ");
}

function conciseText(text: string): string {
  const firstSentence = text.split(/[.!?]/)[0]?.trim() ?? text.trim();
  const clipped =
    firstSentence.length > 72 ? `${firstSentence.slice(0, 69).trim()}...` : firstSentence;

  return clipped.length > 0 ? clipped : text;
}

function proposalItemId(
  input: NormalizedProposalInput,
  elementId: ElementId,
  seed: string,
): string {
  return `proposal-${stableHash(
    JSON.stringify({
      instruction: input.normalizedInstruction,
      selectedIds: input.selectedIds,
      viewportScope: input.viewportScope,
      elementId,
      seed,
    }),
  )}`;
}

function stableHash(value: string): string {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}

function areJsonValuesEqual(left: JsonValue, right: JsonValue): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
