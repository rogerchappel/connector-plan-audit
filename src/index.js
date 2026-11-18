import { readFileSync } from "node:fs";

export const rules = [
  [
    "action",
    "Name the intended connector action",
    [
      "action",
      "send",
      "create",
      "update",
      "delete",
      "draft"
    ]
  ],
  [
    "target",
    "Identify target or recipient scope",
    [
      "target",
      "recipient",
      "channel",
      "account",
      "workspace"
    ]
  ],
  [
    "dry-run",
    "Require dry-run or preview output",
    [
      "dry run",
      "dry-run",
      "preview",
      "simulate"
    ]
  ],
  [
    "approval",
    "Require explicit approval before writes",
    [
      "approval",
      "approve",
      "confirm",
      "ask before"
    ]
  ],
  [
    "credentials",
    "Describe credential handling boundaries",
    [
      "credential",
      "token",
      "secret",
      "auth"
    ]
  ],
  [
    "rollback",
    "Include rollback or correction path",
    [
      "rollback",
      "undo",
      "correction",
      "recover"
    ]
  ],
  [
    "evidence",
    "Record evidence for audit",
    [
      "evidence",
      "receipt",
      "log",
      "record"
    ]
  ],
  [
    "idempotency",
    "Describe idempotency or duplicate-send controls",
    [
      "idempotency",
      "idempotent",
      "duplicate",
      "dedupe",
      "retry"
    ]
  ]
];

const unsafePatterns = {
  action: [
    /\b(?:no|without)\s+(?:an?\s+)?(?:intended\s+)?action\b/,
    /\baction\b[^.!?\n]{0,40}\bnot\s+(?:defined|specified|identified|provided|named)\b/,
  ],
  target: [
    /\b(?:no|without)\s+(?:an?\s+)?(?:intended\s+)?(?:target|recipient)\b/,
    /\b(?:target|recipient)\b[^.!?\n]{0,40}\bnot\s+(?:defined|specified|identified|provided|named)\b/,
  ],
  "dry-run": [
    /\b(?:no|without)\s+(?:a\s+)?(?:dry[- ]run|preview|simulation)\b/,
    /\b(?:dry[- ]run|preview|simulation)\b[^.!?\n]{0,40}\b(?:disabled|omitted|skipped|not\s+(?:required|available|performed))\b/,
  ],
  approval: [
    /\bapproval\b[^.!?\n]{0,40}\b(?:not\s+required|unnecessary|waived|bypassed|skipped)\b/,
    /\b(?:without|no)\s+(?:explicit\s+)?approval\b/,
  ],
  credentials: [
    /\b(?:credentials?|tokens?|secrets?|auth)\b[^.!?\n]{0,80}\b(?:logged?|recorded?|exposed?|published?|shared?)\b[^.!?\n]{0,40}\b(?:publicly|in\s+public|plain\s*text)\b/,
  ],
  rollback: [
    /\b(?:rollback|undo|correction|recovery)\b[^.!?\n]{0,40}\b(?:impossible|unavailable|unsupported|not\s+(?:possible|available|supported))\b/,
    /\b(?:no|without)\s+(?:a\s+)?(?:rollback|undo|correction|recovery)\b/,
  ],
  evidence: [
    /\b(?:no|without)\s+(?:audit\s+)?(?:evidence|receipt|log|record)\b/,
    /\b(?:evidence|receipts?|logs?|records?)\b[^.!?\n]{0,40}\b(?:not\s+(?:recorded|retained|kept)|discarded|omitted)\b/,
  ],
  idempotency: [
    /\b(?:no|without)\s+(?:an?\s+)?(?:idempotency|idempotent|dedupe|duplicate[- ]send)\b/,
    /\b(?:idempotency|dedupe|duplicate[- ]send)\b[^.!?\n]{0,40}\b(?:not\s+(?:supported|implemented|required)|absent|disabled|unavailable)\b/,
  ],
};

const unsupportedSignalPatterns = [
  /\b(?:pending|undecided|unknown)\b/,
  /\bnot\s+(?:described|decided|documented|defined|specified|known)\b/,
  /\b(?:will\s+be|being|only\s+being)\s+considered\b/,
  /\b(?:may|might|could)\s+be\b/,
  /\bpossibly\s+(?:planned|recorded|implemented|added|available|supported)\b/,
];

function hasUnsupportedMention(normalized, terms) {
  const statements = normalized.split(/[.!?;\n]+/);
  return statements.some(
    (statement) =>
      terms.some((term) => statement.includes(term)) &&
      unsupportedSignalPatterns.some((pattern) => pattern.test(statement)),
  );
}

export function auditText(text, options = {}) {
  const normalized = String(text || "").toLowerCase();
  const findings = rules.map(([id, message, terms]) => {
    const explicitlyUnsafe = (unsafePatterns[id] || []).some((pattern) => pattern.test(normalized));
    const unsupported = hasUnsupportedMention(normalized, terms);
    const matched = !explicitlyUnsafe && !unsupported && terms.some((term) => normalized.includes(term));
    return {
      id,
      message,
      passed: matched,
      severity: matched ? "ok" : "warn",
    };
  });
  const passed = findings.filter((finding) => finding.passed).length;
  const score = Math.round((passed / findings.length) * 100);
  return {
    tool: "connector-plan-audit",
    score,
    passed,
    total: findings.length,
    status: score >= (options.threshold ?? 80) ? "pass" : "needs-work",
    findings,
  };
}

export function auditFile(path, options = {}) {
  return auditText(readFileSync(path, "utf8"), options);
}

export function formatMarkdown(result) {
  const lines = [
    "# Connector Plan Audit Report",
    "",
    `Status: ${result.status}`,
    `Score: ${result.score}/100 (${result.passed}/${result.total} checks)`,
    "",
    "## Findings",
  ];
  for (const finding of result.findings) {
    const mark = finding.passed ? "PASS" : "WARN";
    lines.push(`- ${mark} ${finding.id}: ${finding.message}`);
  }
  return lines.join("\n") + "\n";
}
