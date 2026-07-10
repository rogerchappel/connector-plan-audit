#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const required = [
  "bin/cli.js",
  "src/index.js",
  "fixtures/connector-plan.md",
  "fixtures/thin.md",
  "examples/ci-gate.md",
  "docs/RELEASE.md",
  "docs/RELEASE_CANDIDATE.md",
  "docs/RULES.md",
  "SKILL.md",
  "README.md",
  "CHANGELOG.md",
  "LICENSE",
  "package.json"
];

const result = spawnSync("npm", ["pack", "--dry-run", "--json"], { encoding: "utf8" });
if (result.status !== 0) {
  process.stderr.write(result.stderr);
  process.exit(result.status ?? 1);
}

const [pack] = JSON.parse(result.stdout);
const packed = new Set(pack.files.map((file) => file.path));
const missing = required.filter((file) => !packed.has(file));

if (missing.length) {
  throw new Error(`package smoke missing required files: ${missing.join(", ")}`);
}

console.log(`package smoke ok: ${pack.filename} (${pack.files.length} files)`);
