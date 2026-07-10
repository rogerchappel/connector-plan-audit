#!/usr/bin/env node
import { auditFile, formatMarkdown } from "../src/index.js";

const args = process.argv.slice(2);
if (args.includes("--help") || args.length === 0) {
  console.log("Usage: connector-plan-audit <plan.md> [--json]\\n\\nChecks whether a connector action plan is safe to rehearse before live execution.");
  process.exit(args.length === 0 ? 1 : 0);
}

const json = args.includes("--json");
const file = args.find((arg) => !arg.startsWith("--"));

try {
  const result = auditFile(file);
  console.log(json ? JSON.stringify(result, null, 2) : formatMarkdown(result));
  process.exit(result.status === "pass" ? 0 : 2);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
