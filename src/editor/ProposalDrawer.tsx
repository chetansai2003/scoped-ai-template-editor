export function ProposalDrawer() {
  return (
    <aside className="proposal-drawer" aria-label="AI proposal drawer">
      <strong>AI proposal</strong>
      <p>
        AI proposals will appear here in Step 5. Proposals will never modify the
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
