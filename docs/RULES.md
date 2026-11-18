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

Terms are matched as complete, case-insensitive words or phrases, never as
incidental substrings. Thus `auth` matches `auth` but not `author`, and `log`
matches `log` but not `catalog`. Supported inflections are listed explicitly in
the rule vocabulary, including common pairs such as `credential`/`credentials`,
`receipt`/`receipts`, `log`/`logs`, `simulate`/`simulation`, and
`retry`/`retries`.

Keyword mentions do not satisfy a rule when the same statement explicitly
negates the signal. For action and target checks, supported forms include
`no action`, `without an action`, `action is not specified`, `no target`,
`no recipient`, `without a target`, `recipient is not defined`, and a target or
recipient described as `unspecified`. The advertised action verbs also fail
when directly negated: `do not send`, `do not create`, `do not update`, `do not
delete`, and `do not draft`.

Approval and confirmation are treated as the same readiness signal. Direct
forms such as `approval is not required`, `confirmation is unnecessary`, `no
explicit confirmation`, `do not approve`, and `do not confirm` fail the
approval finding. These checks intentionally recognize this listed English
grammar rather than attempting to infer intent from indirect or highly
contextual prose.

Likewise, a mention is not affirmative evidence when its statement says the
signal is pending, undecided, unknown, not described, merely considered, or
only a possibility (for example, `evidence may be recorded`). Direct negative
states using `is` or `are` also fail the mentioned rule when the signal is
`prohibited`, `forbidden`, `denied`, or `missing` (for example, `preview is
forbidden` or `credentials are missing`). The rules also reject a readiness
operation that `cannot be performed`, one that `is never performed` or `will
never be recorded`, and a signal described as disabled (for example, `retries
are disabled`). Affirmative counterparts such as `preview is performed`,
`rollback can be performed`, and `evidence will be recorded` remain readiness
evidence. This deterministic boundary is statement-local: it recognizes these
direct English qualifiers only in the clause that contains the readiness term.
Sentence punctuation, commas, the coordinating conjunctions `and` and `or`, and
the contrast words `although`, `but`, `however`, `whereas`, and `while` delimit
clauses. Thus `target is unknown and approval is required` fails `target` while
preserving `approval`. The checker does not attempt semantic inference across
clauses, sentences, or more varied grammar.
