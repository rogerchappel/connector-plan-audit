import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const example = readFileSync(new URL("../examples/ci-gate.md", import.meta.url), "utf8");
const commandBlock = example.match(/```sh\n([\s\S]*?)\n```/);

test("CI gate documents the supported clean-install command", () => {
  assert.ok(commandBlock, "examples/ci-gate.md must contain a shell command block");
  assert.match(commandBlock[1], /^npm install --ignore-scripts --no-audit --no-fund$/m);
  assert.doesNotMatch(commandBlock[1], /^npm ci$/m);
});

test("CI gate audits the bundled passing fixture as JSON", () => {
  assert.ok(commandBlock, "examples/ci-gate.md must contain a shell command block");
  assert.match(commandBlock[1], /^node bin\/cli\.js fixtures\/connector-plan\.md --json$/m);
});
