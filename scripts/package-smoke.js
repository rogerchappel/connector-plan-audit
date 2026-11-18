#!/usr/bin/env node
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

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

const example = readFileSync("examples/ci-gate.md", "utf8");
const match = example.match(/```sh\n([\s\S]*?)\n```/);
if (!match) throw new Error("examples/ci-gate.md has no shell command block");

const commands = match[1].split("\n").filter(Boolean);
const expected = [
  "npm install --ignore-scripts --no-audit --no-fund",
  "npm test",
  "node bin/cli.js fixtures/connector-plan.md --json"
];
if (JSON.stringify(commands) !== JSON.stringify(expected)) {
  throw new Error("CI gate commands no longer match the executable smoke contract");
}

const checkout = mkdtempSync(join(tmpdir(), "connector-plan-audit-example-"));
try {
  const archive = join(checkout, "source.tar");
  execFileSync("git", ["archive", "HEAD", `--output=${archive}`]);
  execFileSync("tar", ["-xf", "source.tar"], { cwd: checkout });

  let auditOutput = "";
  for (const command of commands) {
    const commandResult = spawnSync(command, { cwd: checkout, encoding: "utf8", shell: true });
    if (commandResult.status !== 0) {
      process.stderr.write(commandResult.stderr);
      throw new Error(`documented command failed: ${command}`);
    }
    auditOutput = commandResult.stdout;
  }

  const report = JSON.parse(auditOutput);
  if (report.status !== "pass") throw new Error(`expected pass status, received ${report.status}`);
  console.log("CI gate example smoke ok");
} finally {
  rmSync(checkout, { recursive: true, force: true });
}
