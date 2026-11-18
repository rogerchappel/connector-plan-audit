# Connector Plan Audit

Audit connector action plans for dry-run coverage, approvals, credentials, rollback, and evidence.

The CLI audits markdown action plans for the safety evidence needed before connector execution.

## Quickstart

```sh
npm install
npm test
npm run smoke
node bin/cli.js fixtures/connector-plan.md --json
```

## Verification

Run the same checks used for release-readiness before publishing or opening a release PR:

```bash
npm run check
npm test
npm run smoke
npm run release:check
npm pack --dry-run
```

The GitHub Actions CI workflow runs `npm run release:check` for every pull request and every push to `main`.

## Examples

Audit a local markdown file:

```sh
npx connector-plan-audit ./SKILL.md
```

Use JSON for another agent or CI harness:

```sh
node bin/cli.js fixtures/connector-plan.md --json
```

## Output

The CLI returns `pass` when the document clears the default threshold and `needs-work` when required release-readiness evidence is missing. Human-readable output is markdown; `--json` returns stable fields for automation.

Readiness terms match complete, case-insensitive words or phrases. Incidental
substrings do not count: for example, `author` does not satisfy `auth`, and
`catalog` does not satisfy `log`. Documented singular, plural, and common
affirmative variants such as `credential`/`credentials`, `log`/`logs`,
`simulate`/`simulation`, and `retry`/`retries` are recognized explicitly.

The CLI accepts exactly one plan file and, optionally, one `--json` flag in
either order. `--help` and `--version` are standalone commands. Unknown flags,
extra files, repeated options, and combinations of standalone commands with
other arguments print usage to stderr and exit with status 1.

Release plans should also name an idempotency, dedupe, or retry guard so a repeated agent run cannot double-send the same connector action. The JSON output exposes this as the `idempotency` finding for stricter CI thresholds.

## Safety

This project reads local markdown and writes only to stdout/stderr. It has no telemetry, no hidden network calls, and no external account actions.

## Limitations

- V1 uses deterministic term checks rather than semantic LLM review.
- Pending, undecided, unknown, undescribed, considered, and merely possible
  signals do not count as affirmative readiness evidence. These qualifiers are
  scoped to clauses separated by sentence punctuation, commas, the coordinating
  conjunctions `and` and `or`, or the contrast words `although`, `but`,
  `however`, `whereas`, and `while`; an unknown target in one clause does not
  invalidate affirmative approval in another.
- Signals described directly as prohibited, forbidden, denied, or missing do
  not count as affirmative readiness evidence.
- Direct negation of advertised action verbs (`do not` or `never`
  `send/create/update/delete/draft`), an `unspecified` target or recipient,
  optional or otherwise negated approval or confirmation requirements, and
  disabled rollback, undo, correction, or recovery paths do not count.
  Action negation is clause-scoped, so `Create a draft. Do not send it.` still
  names `create` as the intended action while retaining the separate safety
  constraint; `Do not create a draft.` does not name an affirmative action.
  Explicitly negating those unsafe states does count: for example, `approval
  is not optional` and `rollback is not disabled` are affirmative readiness
  evidence. The grammar is intentionally finite and does not infer indirect,
  contextual, or cross-sentence negation.
- It is a release gate and coaching aid, not a guarantee that a workflow is safe.
- Rules are intentionally conservative and may need project-specific tuning.

## Release notes

Before tagging a release, confirm the smoke fixture still represents the intended workflow and summarize any changed output, limitations, or operator steps in the PR.
