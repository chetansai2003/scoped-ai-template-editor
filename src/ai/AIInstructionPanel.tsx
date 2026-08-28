import { useState } from "react";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { generateProposals } from "./scenarioEngine";
import { storeProposalBatch } from "../store/proposalSlice";
import { selectEditScope, selectSelectedIds } from "../store/selectors";
import { selectTemplateDocument } from "../template/templateSelectors";

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
  const [instruction, setInstruction] = useState(examples[0]);
  const [message, setMessage] = useState<string | null>(null);

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
        `${batch.items.length} proposal item${batch.items.length === 1 ? "" : "s"} generated.`,
    );
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
    </div>
  );
}
