import test from "node:test";
import assert from "node:assert/strict";
import { auditText, formatMarkdown } from "../src/index.js";
import { readFileSync } from "node:fs";

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

test("markdown formatter includes score and findings", () => {
  const report = formatMarkdown(auditText("example approval verification input side effect use when"));
  assert.match(report, /Score:/);
  assert.match(report, /Findings/);
});
