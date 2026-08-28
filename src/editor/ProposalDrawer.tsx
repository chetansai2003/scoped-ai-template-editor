import { useAppDispatch, useAppSelector } from "../app/hooks";
import { buildProposalAcceptanceCommand } from "../ai/proposalCommands";
import { executeCommand } from "../commands/commandExecutor";
import { markProposalItemStatus } from "../store/proposalSlice";
import { selectProposalBoundary, selectSelectedIds } from "../store/selectors";
import { selectTemplateDocument } from "../template/templateSelectors";
import type { ProposalItem } from "../ai/types";

export function ProposalDrawer() {
  const dispatch = useAppDispatch();
  const proposalState = useAppSelector(selectProposalBoundary);
  const selectedIds = useAppSelector(selectSelectedIds);
  const template = useAppSelector(selectTemplateDocument);
  const activeBatch = proposalState.activeBatchId
    ? proposalState.batches[proposalState.activeBatchId]
    : undefined;

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
  };

  const acceptAll = () => {
    activeBatch?.items
      .filter((item) => item.status === "pending")
      .forEach((item) => acceptItem(item));
  };

  if (!activeBatch) {
    return (
      <aside className="proposal-drawer" aria-label="AI proposal drawer">
        <strong>AI proposal</strong>
        <p>
          AI proposals will appear here in Step 5. Proposals never modify the
          template before acceptance.
        </p>
        <div className="proposal-actions" aria-hidden="true">
          <span>Before</span>
          <span>After</span>
          <span>Accept</span>
          <span>Reject</span>
        </div>
      </aside>
    );
  }

  return (
    <aside className="proposal-drawer" aria-label="AI proposal drawer">
      <div className="proposal-summary">
        <strong>AI proposal</strong>
        <p>{activeBatch.message ?? activeBatch.instruction}</p>
      </div>
      <div className="proposal-items">
        {activeBatch.items.length === 0 ? (
          <p>No proposal items were generated.</p>
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
                    <dt>Scope</dt>
                    <dd>{item.viewportScope}</dd>
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
                      Accept
                    </button>
                    <button type="button" onClick={() => rejectItem(item)}>
                      Reject
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </div>
      {activeBatch.items.some((item) => item.status === "pending") ? (
        <button type="button" className="primary-action" onClick={acceptAll}>
          Accept All Pending
        </button>
      ) : null}
    </aside>
  );
}

function formatProposalValue(value: ProposalItem["before"]): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}
