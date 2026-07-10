#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const required = ["README.md", "SKILL.md", "docs/PRD.md", "docs/TASKS.md", "docs/ORCHESTRATION.md", "src/index.js", "bin/cli.js"];
const missing = required.filter((file) => !existsSync(file));
if (missing.length) {
  console.error("Missing required files: " + missing.join(", "));
  process.exit(1);
}

const readme = readFileSync("README.md", "utf8");
for (const term of ["Quickstart", "Examples", "Limitations", "Safety"]) {
  if (!readme.includes(term)) {
    console.error("README missing " + term);
    process.exit(1);
  }
}
console.log("check ok");
