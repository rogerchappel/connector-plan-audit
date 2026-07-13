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

## Safety

This project reads local markdown and writes only to stdout/stderr. It has no telemetry, no hidden network calls, and no external account actions.

## Limitations

- V1 uses deterministic term checks rather than semantic LLM review.
- It is a release gate and coaching aid, not a guarantee that a workflow is safe.
- Rules are intentionally conservative and may need project-specific tuning.

## Verification

```sh
npm test
npm run check
npm run smoke
```
