# CI Gate Example

Run this tool before letting an agent execute a connector-backed plan:

```sh
npm install --ignore-scripts --no-audit --no-fund
npm test
node bin/cli.js fixtures/connector-plan.md --json
```

Treat `needs-work` as a stop sign for live writes. The plan should be revised
until target, approval, dry-run, rollback, and evidence fields are explicit.
