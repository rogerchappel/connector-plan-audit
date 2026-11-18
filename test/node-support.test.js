import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const workflow = readFileSync(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8");
const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");

test("Node.js engine support is documented and covered by CI endpoints", () => {
  const match = manifest.engines?.node?.match(/^>=?(\d+)(?:\.\d+\.\d+)?$/);
  assert.ok(match, "package.json must declare a simple minimum Node.js major version");
  const minimum = Number(match[1]);
  assert.match(readme, new RegExp(`Node\\.js ${minimum} and the latest even-numbered LTS`));

  const matrix = workflow.match(/node-version:\s*\[([^\]]+)\]/);
  assert.ok(matrix, "CI must declare a Node.js version matrix");
  const versions = [...matrix[1].matchAll(/(?:^|,)\s*(\d+)(?=\s*(?:,|$))/g)].map(([, value]) => Number(value));
  assert.ok(versions.includes(minimum), `CI matrix must include engine minimum ${minimum}`);
  assert.ok(versions.includes(Math.max(...versions)), "CI matrix must include its latest supported endpoint");
});
