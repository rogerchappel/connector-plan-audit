#!/usr/bin/env node
import { createRequire } from "node:module";
import { auditFile, formatMarkdown } from "../src/index.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json");
const args = process.argv.slice(2);

const usage = "Usage: connector-plan-audit <plan.md> [--json]\n       connector-plan-audit --version\n       connector-plan-audit --help\n\nChecks whether a connector action plan is safe to rehearse before live execution.";

function usageError(message) {
  if (message) console.error(`Error: ${message}`);
  console.error(usage);
  process.exit(1);
}

if (args.length === 1 && (args[0] === "--version" || args[0] === "-v")) {
  console.log(version);
  process.exit(0);
}
if (args.length === 1 && args[0] === "--help") {
  console.log(usage);
  process.exit(0);
}
if (args.length === 0) usageError("missing plan file");

const unknownOptions = args.filter((arg) => arg.startsWith("-") && arg !== "--json");
if (unknownOptions.length) usageError(`unknown option: ${unknownOptions[0]}`);

const jsonCount = args.filter((arg) => arg === "--json").length;
if (jsonCount > 1) usageError("--json may be specified only once");

const files = args.filter((arg) => arg !== "--json");
if (files.length === 0) usageError("missing plan file");
if (files.length > 1) usageError("expected exactly one plan file");

const json = jsonCount === 1;
const [file] = files;

try {
  const result = auditFile(file);
  console.log(json ? JSON.stringify(result, null, 2) : formatMarkdown(result));
  process.exit(result.status === "pass" ? 0 : 2);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
