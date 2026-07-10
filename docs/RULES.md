# Audit Rules

`connector-plan-audit` checks for seven connector-readiness signals:

- action: the intended connector operation
- target: recipient, channel, account, or workspace scope
- dry-run: preview or simulation before a live write
- approval: explicit confirmation before external side effects
- credentials: token and secret handling boundaries
- rollback: correction or recovery path
- evidence: receipts or logs to retain after execution

The rules are deterministic keyword checks in V1 so action-plan review is
repeatable before a human approves any connector write.
