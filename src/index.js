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

export function auditText(text, options = {}) {
  const normalized = String(text || "").toLowerCase();
  const findings = rules.map(([id, message, terms]) => {
    const matched = terms.some((term) => normalized.includes(term));
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
