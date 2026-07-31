import test from "node:test";
import assert from "node:assert/strict";
import { auditText, formatMarkdown } from "../src/index.js";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

test("passing fixture clears the release threshold", () => {
  const text = readFileSync(new URL("../fixtures/connector-plan.md", import.meta.url), "utf8");
  const result = auditText(text);
  assert.equal(result.status, "pass");
  assert.equal(result.score, 100);
});

test("thin fixture reports actionable gaps", () => {
  const text = readFileSync(new URL("../fixtures/thin.md", import.meta.url), "utf8");
  const result = auditText(text);
  assert.equal(result.status, "needs-work");
  assert.ok(result.findings.some((finding) => !finding.passed));
});

test("idempotency controls are reported for retry-safe release plans", () => {
  const result = auditText(`
    action post a message
    target channel
    dry-run preview
    approval required
    credentials token boundary
    rollback correction
    evidence receipt
  `);

  assert.equal(result.score, 88);
  assert.equal(result.findings.find((finding) => finding.id === "idempotency").passed, false);
});

test("explicitly unsafe safeguards do not pass on keyword mentions", () => {
  const cases = [
    ["dry-run", "There will be no dry run."],
    ["approval", "Approval is not required."],
    ["credentials", "Credentials are logged publicly."],
    ["rollback", "Rollback is impossible."],
    ["evidence", "No evidence will be recorded."],
    ["idempotency", "Retries have no idempotency or dedupe."],
  ];

  for (const [id, statement] of cases) {
    const finding = auditText(statement).findings.find((candidate) => candidate.id === id);
    assert.equal(finding.passed, false, `${id} should reject: ${statement}`);
  }
});

test("pending and uncertain safeguard mentions do not count as readiness evidence", () => {
  const cases = [
    ["dry-run", "Dry run is pending."],
    ["dry-run", "A preview may be added later."],
    ["approval", "Approval is undecided."],
    ["approval", "Explicit confirmation is only being considered."],
    ["credentials", "Credential handling is not described."],
    ["credentials", "The token boundary is unknown."],
    ["rollback", "Rollback will be considered."],
    ["rollback", "A correction path is possibly planned."],
    ["evidence", "Evidence may be recorded."],
    ["evidence", "Receipt retention is pending."],
    ["idempotency", "Retry behavior is unknown."],
    ["idempotency", "Dedupe may be implemented later."],
  ];

  for (const [id, statement] of cases) {
    const finding = auditText(statement).findings.find((candidate) => candidate.id === id);
    assert.equal(finding.passed, false, `${id} should reject: ${statement}`);
  }
});

test("affirmative safeguard language still passes", () => {
  const cases = [
    ["dry-run", "A dry run produces a preview before execution."],
    ["approval", "Explicit approval is required before writes."],
    ["credentials", "Credentials remain within the runner's token boundary."],
    ["rollback", "Rollback uses the documented correction procedure."],
    ["evidence", "Evidence is recorded in the retained audit log."],
    ["idempotency", "Retries use a dedupe key for idempotency."],
  ];

  for (const [id, statement] of cases) {
    const finding = auditText(statement).findings.find((candidate) => candidate.id === id);
    assert.equal(finding.passed, true, `${id} should accept: ${statement}`);
  }
});

test("explicitly absent actions and targets do not pass on keyword mentions", () => {
  const cases = [
    ["action", "No action is defined."],
    ["action", "There is no intended action."],
    ["action", "The action is not specified."],
    ["action", "Without an action, this plan cannot proceed."],
    ["target", "No target is defined."],
    ["target", "There is no target or recipient."],
    ["target", "The recipient is not specified."],
    ["target", "Without a target account, this plan cannot proceed."],
  ];

  for (const [id, statement] of cases) {
    const finding = auditText(statement).findings.find((candidate) => candidate.id === id);
    assert.equal(finding.passed, false, `${id} should reject: ${statement}`);
  }
});

test("affirmative action and target language still passes", () => {
  const cases = [
    ["action", "Action: create a draft message."],
    ["action", "Send a status update."],
    ["target", "Target: the release workspace."],
    ["target", "Recipient: the incident channel."],
  ];

  for (const [id, statement] of cases) {
    const finding = auditText(statement).findings.find((candidate) => candidate.id === id);
    assert.equal(finding.passed, true, `${id} should accept: ${statement}`);
  }
});

test("negated action and target mentions cannot clear the default threshold", () => {
  const result = auditText(`
    No action is defined.
    There is no target or recipient.
    dry-run approval credential rollback evidence idempotency
  `);

  assert.equal(result.status, "needs-work");
  assert.equal(result.score, 75);
  assert.deepEqual(
    result.findings.filter((finding) => !finding.passed).map((finding) => finding.id),
    ["action", "target"],
  );
});

test("combined unsafe plan needs work and identifies failed safeguards", () => {
  const result = auditText(`
    Action: send funds.
    Target: external account.
    There will be no dry run.
    Approval is not required.
    Credentials are logged publicly.
    Rollback is impossible.
    No evidence will be recorded.
    Retries have no idempotency or dedupe.
  `);

  assert.equal(result.status, "needs-work");
  assert.deepEqual(
    result.findings.filter((finding) => !finding.passed).map((finding) => finding.id),
    ["dry-run", "approval", "credentials", "rollback", "evidence", "idempotency"],
  );
});

test("uncertain plan needs work and identifies unsupported safeguards", () => {
  const result = auditText(`
    Action: send.
    Target: account.
    Dry run is pending.
    Approval undecided.
    Credential handling is not described.
    Rollback will be considered.
    Evidence may be recorded.
    Retry behavior is unknown.
  `);

  assert.equal(result.status, "needs-work");
  assert.deepEqual(
    result.findings.filter((finding) => !finding.passed).map((finding) => finding.id),
    ["dry-run", "approval", "credentials", "rollback", "evidence", "idempotency"],
  );
});

test("markdown formatter includes score and findings", () => {
  const report = formatMarkdown(auditText("example approval verification input side effect use when"));
  assert.match(report, /Score:/);
  assert.match(report, /Findings/);
});

test("cli prints package version", () => {
  const output = execFileSync(process.execPath, ["bin/cli.js", "--version"], { encoding: "utf8" });
  assert.match(output, /^0\.1\.0\n$/);
});
