import test from "node:test";
import assert from "node:assert/strict";
import { auditText, formatMarkdown, rules } from "../src/index.js";
import { readFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

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

test("readiness terms match words and phrases rather than incidental substrings", () => {
  const result = auditText(`
    The author prepares the plan.
    The catalog entry is retained.
  `);

  assert.equal(result.findings.find((finding) => finding.id === "credentials").passed, false);
  assert.equal(result.findings.find((finding) => finding.id === "evidence").passed, false);
});

test("documented inflected readiness terms still pass", () => {
  const cases = [
    ["dry-run", "A simulation runs before execution."],
    ["approval", "Confirmation is required before writes."],
    ["credentials", "Credentials and tokens remain in the runner."],
    ["rollback", "The recovery procedure restores the prior state."],
    ["evidence", "Receipts and logs are retained."],
    ["idempotency", "Retries use a dedupe key."],
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

test("prohibited, denied, and missing readiness signals do not count", () => {
  const cases = [
    ["action", "Action is prohibited.", "Action: create a draft message."],
    ["target", "Target is forbidden.", "Target: the release workspace."],
    ["dry-run", "Preview is forbidden.", "Preview is required before execution."],
    ["approval", "Approval is denied.", "Approval is granted before writes."],
    ["credentials", "Credentials are missing.", "Credentials remain in the runner."],
    ["rollback", "Rollback is missing.", "Rollback uses the correction procedure."],
    ["evidence", "Evidence is missing.", "Evidence is retained for audit."],
    ["idempotency", "Idempotency is missing.", "Idempotency uses a dedupe key."],
  ];

  for (const [id, negative, affirmative] of cases) {
    const negativeFinding = auditText(negative).findings.find((finding) => finding.id === id);
    const affirmativeFinding = auditText(affirmative).findings.find((finding) => finding.id === id);
    assert.equal(negativeFinding.passed, false, `${id} should reject: ${negative}`);
    assert.equal(affirmativeFinding.passed, true, `${id} should accept: ${affirmative}`);
  }
});

test("cli rejects a plan whose eight readiness signals are negative states", () => {
  const directory = mkdtempSync(join(tmpdir(), "connector-plan-audit-"));
  const plan = join(directory, "negative-states.md");
  writeFileSync(plan, `
    Action is prohibited.
    Target is forbidden.
    Preview is forbidden.
    Approval is denied.
    Credentials are missing.
    Rollback is missing.
    Evidence is missing.
    Idempotency is missing.
  `);

  try {
    const result = spawnSync(process.execPath, ["bin/cli.js", plan, "--json"], {
      encoding: "utf8",
    });
    const report = JSON.parse(result.stdout);
    assert.equal(result.status, 2);
    assert.equal(report.status, "needs-work");
    assert.deepEqual(
      report.findings.filter((finding) => !finding.passed).map((finding) => finding.id),
      rules.map(([id]) => id),
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
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

test("cli rejects unknown flags, extra files, and malformed option combinations", () => {
  const cases = [
    ["fixtures/connector-plan.md", "--bogus"],
    ["fixtures/connector-plan.md", "fixtures/thin.md"],
    ["--json"],
    ["--help", "fixtures/connector-plan.md"],
    ["--version", "--json"],
    ["fixtures/connector-plan.md", "--json", "--json"],
  ];

  for (const args of cases) {
    const result = spawnSync(process.execPath, ["bin/cli.js", ...args], { encoding: "utf8" });
    assert.equal(result.status, 1, `should reject: ${args.join(" ")}`);
    assert.match(result.stderr, /Usage: connector-plan-audit/);
  }
});
