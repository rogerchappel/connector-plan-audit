# Connector Plan Audit PRD

Status: in-progress
Owner: Roger Chappell
Date: 2026-07-10

## Summary
Audit connector action plans for dry-run coverage, approvals, credentials, rollback, and evidence.

## Problem
Agent skills and connector action plans are often reviewed by reading prose manually. Missing trigger rules, approval gates, examples, or evidence requirements cause agents to overreach or stop late in the workflow.

## V1 Scope
- Local-first Node.js CLI with no hidden network calls.
- Fixture-backed tests for passing and failing examples.
- Markdown and JSON audit output.
- Reusable SKILL.md instructions for agents.
- Release-candidate checklist and smoke command.

## Non-goals
- No external account writes.
- No package publishing.
- No hosted service.
- No LLM dependency for V1 scoring.

## Users
- Agent builders preparing reusable skills.
- Maintainers reviewing connector-heavy workflows.
- Release agents checking docs before public sharing.

## Acceptance Criteria
- npm test passes.
- npm run check passes.
- npm run smoke passes against included fixtures.
- README documents quickstart, examples, limitations, and safety notes.
- docs/ORCHESTRATION.md explains agent handoff and verification.
