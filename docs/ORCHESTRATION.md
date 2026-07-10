# Orchestration

1. Read the candidate markdown file.
2. Run `npm run smoke` for the bundled fixture or `connector-plan-audit <file>` for a target document.
3. Treat `needs-work` as a review gate, not as permission to rewrite user content automatically.
4. Report gaps with exact check names and ask before making broad edits.

The tool is local-first and reads only the file path supplied by the caller.
