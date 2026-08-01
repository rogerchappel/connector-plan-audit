# Audit Rules

`connector-plan-audit` checks for eight connector-readiness signals:

- action: the intended connector operation
- target: recipient, channel, account, or workspace scope
- dry-run: preview or simulation before a live write
- approval: explicit confirmation before external side effects
- credentials: token and secret handling boundaries
- rollback: correction or recovery path
- evidence: receipts or logs to retain after execution
- idempotency: duplicate-send, dedupe, or retry controls for repeated runs

The rules are deterministic keyword checks in V1 so action-plan review is
repeatable before a human approves any connector write.

Keyword mentions do not satisfy a rule when the same statement explicitly
negates the signal. For action and target checks, supported forms include
`no action`, `without an action`, `action is not specified`, `no target`,
`no recipient`, `without a target`, and `recipient is not defined`. These
checks intentionally recognize direct English negation rather than attempting
to infer intent from indirect or highly contextual prose.

Likewise, a mention is not affirmative evidence when its statement says the
signal is pending, undecided, unknown, not described, merely considered, or
only a possibility (for example, `evidence may be recorded`). Direct negative
states using `is` or `are` also fail the mentioned rule when the signal is
`prohibited`, `forbidden`, `denied`, or `missing` (for example, `preview is
forbidden` or `credentials are missing`). This deterministic boundary is
statement-local: it recognizes these direct English qualifiers but does not
attempt semantic inference across sentences or more varied grammar.
