# CI Gate Example

Run this tool before letting an agent execute a connector-backed plan:

```sh
npm ci
npm test
node bin/cli.js ./docs/plan.md --json
```

Treat `needs-work` as a stop sign for live writes. The plan should be revised
until target, approval, dry-run, rollback, and evidence fields are explicit.
