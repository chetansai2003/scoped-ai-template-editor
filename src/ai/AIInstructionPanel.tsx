import { useState } from "react";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { buildProposalAcceptanceCommand } from "./proposalCommands";
import { generateProposals } from "./scenarioEngine";
import { executeCommand } from "../commands/commandExecutor";
import {
  markProposalItemStatus,
  storeProposalBatch,
} from "../store/proposalSlice";
import {
  selectEditScope,
  selectProposalBoundary,
  selectSelectedIds,
} from "../store/selectors";
import { selectTemplateDocument } from "../template/templateSelectors";
import type { ProposalItem } from "./types";

const examples = [
  "Make this text more concise",
  "Make the selected element dark blue",
  "Make this card wider and move it first",
  "Stack selected items vertically",
  "Make the selected cards compact",
  "Add a payment system",
];

export function AIInstructionPanel() {
  const dispatch = useAppDispatch();
  const selectedIds = useAppSelector(selectSelectedIds);
  const viewportScope = useAppSelector(selectEditScope);
  const template = useAppSelector(selectTemplateDocument);
  const proposalState = useAppSelector(selectProposalBoundary);
  const [instruction, setInstruction] = useState(examples[0]);
  const [message, setMessage] = useState<string | null>(null);
  const activeBatch = proposalState.activeBatchId
    ? proposalState.batches[proposalState.activeBatchId]
    : undefined;

  const generate = () => {
    if (selectedIds.length === 0) {
      setMessage("Select at least one element before generating a proposal.");
      return;
    }

    const batch = generateProposals({
      instruction,
      selectedIds,
      viewportScope,
      template,
    });

    dispatch(storeProposalBatch(batch));
    setMessage(
      batch.message ??
        `${batch.items.length} proposal item${batch.items.length === 1 ? "" : "s"} generated. Review and accept below to apply.`,
    );
  };
  const acceptItem = (item: ProposalItem) => {
    if (!activeBatch || item.status !== "pending") {
      return;
    }

    const commandResult = buildProposalAcceptanceCommand(
      activeBatch,
      item,
      template,
      selectedIds,
    );

    if (!commandResult.ok) {
      dispatch(
        markProposalItemStatus({
          batchId: activeBatch.id,
          itemId: item.id,
          status: commandResult.status,
          error: commandResult.error,
        }),
      );
      setMessage(commandResult.error);
      return;
    }

    const executionResult = dispatch(executeCommand(commandResult.command));

    dispatch(
      markProposalItemStatus({
        batchId: activeBatch.id,
        itemId: item.id,
        status: executionResult.ok
          ? "accepted"
          : executionResult.error.code === "STALE_REVISION"
            ? "stale"
            : "invalid",
        error: executionResult.ok ? undefined : executionResult.error.message,
      }),
    );
    setMessage(executionResult.ok ? "Proposal accepted and applied." : executionResult.error.message);
  };
  const rejectItem = (item: ProposalItem) => {
    if (!activeBatch || item.status !== "pending") {
      return;
    }

    dispatch(
      markProposalItemStatus({
        batchId: activeBatch.id,
        itemId: item.id,
        status: "rejected",
      }),
    );
    setMessage("Proposal rejected.");
  };

  return (
    <div className="ai-panel">
      <h2>AI Edit</h2>
      <p>Deterministic local scenarios generate reviewable proposals only.</p>
      <label className="field-control">
        <span>Instruction</span>
        <textarea
          rows={4}
          value={instruction}
          onChange={(event) => setInstruction(event.currentTarget.value)}
        />
      </label>
      <div className="scenario-list" aria-label="Supported AI scenarios">
        {examples.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => setInstruction(example)}
          >
            {example}
          </button>
        ))}
      </div>
      <dl>
        <div>
          <dt>Selected</dt>
          <dd>{selectedIds.length > 0 ? selectedIds.join(", ") : "No selection"}</dd>
        </div>
        <div>
          <dt>Scope</dt>
          <dd>{viewportScope}</dd>
        </div>
      </dl>
      <button
        type="button"
        className="primary-action"
        disabled={selectedIds.length === 0}
        onClick={generate}
      >
        Generate Proposal
      </button>
      {selectedIds.length === 0 ? (
        <p className="field-status">Select an element to enable proposal generation.</p>
      ) : null}
      {message ? (
        <p className="field-status" role="status">
          {message}
        </p>
      ) : null}
      {activeBatch ? (
        <section className="inline-proposal-review" aria-label="Generated proposals">
          <h3>Review proposal</h3>
          {activeBatch.items.length === 0 ? (
            <p className="field-status">No proposal items were generated.</p>
          ) : (
            activeBatch.items.map((item) => {
              const element = template.elements[item.elementId];

              return (
                <article key={item.id} className="proposal-item">
                  <div>
                    <strong>{element?.name ?? item.elementId}</strong>
                    <code>{item.elementId}</code>
                  </div>
                  <dl>
                    <div>
                      <dt>Status</dt>
                      <dd>{item.status}</dd>
                    </div>
                    <div>
                      <dt>Fields</dt>
                      <dd>
                        {item.kind === "structure"
                          ? item.structureOperation?.type
                          : item.changes.map((change) => change.path).join(", ")}
                      </dd>
                    </div>
                  </dl>
                  <div className="proposal-diff">
                    <span>Before: {formatProposalValue(item.before)}</span>
                    <span>After: {formatProposalValue(item.after)}</span>
                  </div>
                  {item.error ? (
                    <p className="field-error" role="status">
                      {item.error}
                    </p>
                  ) : null}
                  {item.status === "pending" ? (
                    <div className="proposal-buttons">
                      <button type="button" onClick={() => acceptItem(item)}>
                        Accept proposal
                      </button>
                      <button type="button" onClick={() => rejectItem(item)}>
                        Reject proposal
                      </button>
                    </div>
                  ) : null}
                </article>
              );
            })
          )}
        </section>
      ) : null}
    </div>
  );
}

function formatProposalValue(value: ProposalItem["before"]): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}
