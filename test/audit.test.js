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

test("directly negated action vocabulary and unspecified targets do not pass", () => {
  const cases = [
    ["action", "Do not send the message."],
    ["action", "Do not create the record."],
    ["action", "Do not update the account."],
    ["action", "Do not delete the draft."],
    ["action", "Do not draft a reply."],
    ["target", "Target is unspecified."],
    ["target", "Recipient is unspecified."],
  ];

  for (const [id, statement] of cases) {
    const finding = auditText(statement).findings.find((candidate) => candidate.id === id);
    assert.equal(finding.passed, false, `${id} should reject: ${statement}`);
  }
});

test("directly negated approval vocabulary does not pass", () => {
  const cases = [
    "Confirmation is not required.",
    "Confirmation is unnecessary.",
    "No explicit confirmation is needed.",
    "Do not approve the write.",
    "Do not confirm the write.",
  ];

  for (const statement of cases) {
    const finding = auditText(statement).findings.find((candidate) => candidate.id === "approval");
    assert.equal(finding.passed, false, `approval should reject: ${statement}`);
  }
});

test("affirmative action, target, and approval synonyms remain supported", () => {
  const cases = [
    ["action", "Update the account record."],
    ["target", "Recipient: the incident channel."],
    ["approval", "Confirmation is required before the write."],
    ["approval", "Ask before creating the record."],
  ];

  for (const [id, statement] of cases) {
    const finding = auditText(statement).findings.find((candidate) => candidate.id === id);
    assert.equal(finding.passed, true, `${id} should accept: ${statement}`);
  }
});

test("direct negative readiness forms fail without rejecting affirmative counterparts", () => {
  const cases = [
    ["action", "Never send the message.", "Send the message after approval."],
    ["action", "Never create the record.", "Create the record after approval."],
    ["action", "Never update the account.", "Update the account after approval."],
    ["action", "Never delete the draft.", "Delete the draft after approval."],
    ["action", "Never draft a reply.", "Draft a reply after approval."],
    ["approval", "Approval is optional.", "Approval is required."],
    ["approval", "Confirmation is optional.", "Confirmation is required."],
    ["rollback", "Rollback is disabled.", "Rollback is enabled."],
    ["rollback", "Recovery is disabled.", "Recovery is enabled."],
  ];

  for (const [id, negative, affirmative] of cases) {
    const negativeFinding = auditText(negative).findings.find((finding) => finding.id === id);
    const affirmativeFinding = auditText(affirmative).findings.find((finding) => finding.id === id);
    assert.equal(negativeFinding.passed, false, `${id} should reject: ${negative}`);
    assert.equal(affirmativeFinding.passed, true, `${id} should accept: ${affirmative}`);
  }
});

test("negated unsafe safeguard states count as affirmative readiness evidence", () => {
  const cases = [
    ["approval", "Approval is not optional."],
    ["approval", "Confirmation is not optional before the write."],
    ["rollback", "Rollback is not disabled."],
    ["rollback", "Recovery is not disabled after a failed write."],
  ];

  for (const [id, statement] of cases) {
    const finding = auditText(statement).findings.find((candidate) => candidate.id === id);
    assert.equal(finding.passed, true, `${id} should accept: ${statement}`);
  }
});

test("unsafe safeguard states remain rejected when they are not negated", () => {
  const cases = [
    ["approval", "Approval is optional."],
    ["approval", "Confirmation is optional before the write."],
    ["rollback", "Rollback is disabled."],
    ["rollback", "Recovery is disabled after a failed write."],
  ];

  for (const [id, statement] of cases) {
    const finding = auditText(statement).findings.find((candidate) => candidate.id === id);
    assert.equal(finding.passed, false, `${id} should reject: ${statement}`);
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

test("never, cannot, and disabled readiness signals do not count", () => {
  const cases = [
    ["dry-run", "Preview is never performed.", "Preview is performed before execution."],
    ["approval", "Approval is never required.", "Approval is required before writes."],
    ["rollback", "Rollback cannot be performed.", "Rollback can be performed after a failed write."],
    ["evidence", "Evidence will never be recorded.", "Evidence will be recorded for audit."],
    ["idempotency", "Retries are disabled.", "Retries are enabled with a dedupe key."],
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

test("cli rejects never, cannot, and disabled readiness states", () => {
  const result = spawnSync(
    process.execPath,
    ["bin/cli.js", "fixtures/negative-readiness-states.md", "--json"],
    { encoding: "utf8" },
  );
  const report = JSON.parse(result.stdout);

  assert.equal(result.status, 2);
  assert.equal(report.status, "needs-work");
  assert.deepEqual(
    report.findings.filter((finding) => !finding.passed).map((finding) => finding.id),
    ["dry-run", "approval", "rollback", "evidence", "idempotency"],
  );
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

test("cli rejects a combined plan with direct action, target, and confirmation negation", () => {
  const directory = mkdtempSync(join(tmpdir(), "connector-plan-audit-"));
  const plan = join(directory, "direct-negation.md");
  writeFileSync(plan, `
    Action: do not send the message.
    Target: recipient is unspecified.
    Preview runs before execution.
    Confirmation is not required.
    Credentials remain inside the runner.
    Rollback uses the correction procedure.
    Evidence is retained in logs.
    Retries use a dedupe key.
  `);

  try {
    const result = spawnSync(process.execPath, ["bin/cli.js", plan, "--json"], {
      encoding: "utf8",
    });
    const report = JSON.parse(result.stdout);
    assert.equal(result.status, 2);
    assert.equal(report.status, "needs-work");
    assert.equal(report.score, 63);
    assert.deepEqual(
      report.findings.filter((finding) => !finding.passed).map((finding) => finding.id),
      ["action", "target", "approval"],
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
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

test("unsupported qualifiers apply only to their readiness clause", () => {
  const result = auditText(`
    Action: send the update.
    Target is unknown, but approval is required before writes.
    Credentials stay within the token boundary.
    A preview runs first.
    Rollback uses correction.
    Evidence is logged.
    Retries use dedupe.
  `);

  assert.equal(result.status, "pass");
  assert.equal(result.score, 88);
  assert.deepEqual(
    result.findings.filter((finding) => !finding.passed).map((finding) => finding.id),
    ["target"],
  );
});

test("contrast clauses isolate unsupported qualifiers in either order", () => {
  const cases = [
    ["target", "Target is unknown but approval is required before writes.", "approval"],
    ["approval", "Approval is required before writes, while target is unknown.", "target"],
    ["dry-run", "Preview is pending, whereas rollback uses correction.", "rollback"],
    ["evidence", "Evidence is retained, although retry behavior is unknown.", "idempotency"],
  ];

  for (const [unsupportedId, statement, affirmativeId] of cases) {
    const result = auditText(statement);
    assert.equal(
      result.findings.find((finding) => finding.id === unsupportedId).passed,
      false,
      `${unsupportedId} should reject: ${statement}`,
    );
    assert.equal(
      result.findings.find((finding) => finding.id === affirmativeId).passed,
      true,
      `${affirmativeId} should accept: ${statement}`,
    );
  }
});

test("cli preserves affirmative signals beside an unsupported clause", () => {
  const directory = mkdtempSync(join(tmpdir(), "connector-plan-audit-"));
  const plan = join(directory, "mixed-qualifiers.md");
  writeFileSync(plan, `
    Action: send the update.
    Target is unknown, but approval is required before writes.
    Credentials stay within the token boundary.
    A preview runs first.
    Rollback uses correction.
    Evidence is logged.
    Retries use dedupe.
  `);

  try {
    const result = spawnSync(process.execPath, ["bin/cli.js", plan, "--json"], {
      encoding: "utf8",
    });
    const report = JSON.parse(result.stdout);
    assert.equal(result.status, 0);
    assert.equal(report.status, "pass");
    assert.equal(report.score, 88);
    assert.deepEqual(
      report.findings.filter((finding) => !finding.passed).map((finding) => finding.id),
      ["target"],
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
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
