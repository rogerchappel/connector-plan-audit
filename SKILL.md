# Connector Plan Audit

Use this skill when an agent proposes a connector-backed action that could read from or write to an external account.

## Required Inputs
- A local markdown file to audit.
- Permission to read that file.

## Side-effect Boundaries
The skill reads local files and prints a report. It must not push, publish, send messages, open pull requests, or change external systems.

## Approval Requirements
Ask before editing the audited file. Ask before running any command that installs packages, contacts a network service, or writes outside the current project.

## Workflow
1. Run `connector-plan-audit <file>`.
2. Review warning findings.
3. Recommend the smallest useful documentation changes.
4. Re-run the audit after edits.

## Examples
```sh
npm run smoke
connector-plan-audit fixtures/connector-plan.md --json
```

## Verification
Run `npm test`, `npm run check`, and `npm run smoke`. Include exact results in the handoff.
