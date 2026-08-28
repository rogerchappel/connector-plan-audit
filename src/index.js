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
      "simulate",
      "simulation"
    ]
  ],
  [
    "approval",
    "Require explicit approval before writes",
    [
      "approval",
      "approve",
      "confirm",
      "confirmation",
      "ask before"
    ]
  ],
  [
    "credentials",
    "Describe credential handling boundaries",
    [
      "credential",
      "credentials",
      "token",
      "tokens",
      "secret",
      "secrets",
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
      "recover",
      "recovery"
    ]
  ],
  [
    "evidence",
    "Record evidence for audit",
    [
      "evidence",
      "receipt",
      "receipts",
      "log",
      "logs",
      "record",
      "records"
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
      "retry",
      "retries"
    ]
  ]
];

const unsafePatterns = {
  action: [
    /\b(?:no|without)\s+(?:an?\s+)?(?:intended\s+)?action\b/,
    /\baction\b[^.!?\n]{0,40}\bnot\s+(?:defined|specified|identified|provided|named)\b/,
    /\bdo\s+not\s+(?:send|create|update|delete|draft)\b/,
    /\bnever\s+(?:send|create|update|delete|draft)\b/,
  ],
  target: [
    /\b(?:no|without)\s+(?:an?\s+)?(?:intended\s+)?(?:target|recipient)\b/,
    /\b(?:target|recipient)\b[^.!?\n]{0,40}\b(?:not\s+(?:defined|specified|identified|provided|named)|unspecified)\b/,
  ],
  "dry-run": [
    /\b(?:no|without)\s+(?:a\s+)?(?:dry[- ]run|preview|simulation)\b/,
    /\b(?:dry[- ]run|preview|simulation)\b[^.!?\n]{0,40}\b(?:disabled|omitted|skipped|not\s+(?:required|available|performed))\b/,
  ],
  approval: [
    /\b(?:approval|confirmation)\b[^.!?\n]{0,40}\b(?:not\s+(?:required|needed)|unnecessary|(?<!not\s)optional|waived|bypassed|skipped)\b/,
    /\b(?:without|no)\s+(?:explicit\s+)?(?:approval|confirmation)\b/,
    /\bdo\s+not\s+(?:approve|confirm|ask\s+before)\b/,
  ],
  credentials: [
    /\b(?:credentials?|tokens?|secrets?|auth)\b[^.!?\n]{0,80}\b(?:logged?|recorded?|exposed?|published?|shared?)\b[^.!?\n]{0,40}\b(?:publicly|in\s+public|plain\s*text)\b/,
  ],
  rollback: [
    /\b(?:rollback|undo|correction|recovery)\b[^.!?\n]{0,40}\b(?:(?<!not\s)disabled|impossible|unavailable|unsupported|not\s+(?:possible|available|supported))\b/,
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

const affirmativeExceptionPatterns = {
  credentials: [
    /\b(?:credentials?|tokens?|secrets?|auth)\b[^.!?\n]{0,80}\b(?:are|is|were|was)?\s*(?:not|never)\s+(?:logged?|recorded?|exposed?|published?|shared?)\b[^.!?\n]{0,40}\b(?:publicly|in\s+public|plain\s*text)\b/,
  ],
};

const unsupportedSignalPatterns = [
  /\b(?:pending|undecided|unknown)\b/,
  /\b(?:is|are)\s+(?:prohibited|forbidden|denied|missing)\b/,
  /\bnot\s+(?:described|decided|documented|defined|specified|known)\b/,
  /\b(?:will\s+be|being|only\s+being)\s+considered\b/,
  /\b(?:may|might|could)\s+be\b/,
  /\bpossibly\s+(?:planned|recorded|implemented|added|available|supported)\b/,
  /\b(?:(?:is|are)\s+never|will\s+never\s+be)\s+(?:performed|required|recorded)\b/,
  /\bcannot\s+be\s+performed\b/,
  /\b(?:is|are)\s+disabled\b/,
];

function termPattern(term) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![a-z0-9_])${escaped}(?![a-z0-9_])`);
}

function hasTerm(text, terms) {
  return terms.some((term) => termPattern(term).test(text));
}

function clauses(normalized) {
  const boundary = /[.!?;,\n]+|\b(?:although|and|but|however|or|whereas|while)\b/g;
  const parts = [];
  let start = 0;
  for (const match of normalized.matchAll(boundary)) {
    parts.push({ text: normalized.slice(start, match.index), separator: match[0].trim() });
    start = match.index + match[0].length;
  }
  parts.push({ text: normalized.slice(start), separator: "" });
  return parts;
}

function hasAffirmativeSignal(normalized, id, terms) {
  const parts = clauses(normalized);
  return parts.some(({ text: clause, separator }, index) => {
    if (!hasTerm(clause, terms)) return false;
    const isQualified = (candidate) =>
      ((unsafePatterns[id] || []).some((pattern) => pattern.test(candidate)) &&
        !(affirmativeExceptionPatterns[id] || []).some((pattern) => pattern.test(candidate))) ||
      unsupportedSignalPatterns.some((pattern) => pattern.test(candidate));
    if (isQualified(clause)) return false;

    // Preserve a qualifier across `and`/`or` when it introduces a list of
    // synonyms for this same rule (for example, "no target or recipient").
    const previous = parts[index - 1]?.text || "";
    const isBareContinuation = clause.trim().split(/\s+/).length <= 2;
    if (isBareContinuation && hasTerm(previous, terms) && isQualified(previous)) return false;

    // A trailing predicate can govern multiple coordinated readiness subjects,
    // including subjects from different rules: "approval and rollback are not
    // required". Only carry it back across and/or from a bare subject, leaving
    // complete affirmative clauses such as "create a draft, but do not send it"
    // independent.
    const next = parts[index + 1]?.text || "";
    const isBareSubject = clause.trim().split(/\s+/).length <= 2;
    const coordinated = `${clause} ${separator} ${next}`;
    if (isBareSubject && /^(?:and|or)$/.test(separator) && isQualified(coordinated)) {
      return false;
    }
    return true;
  });
}

export function auditText(text, options = {}) {
  const normalized = String(text || "").toLowerCase();
  const findings = rules.map(([id, message, terms]) => {
    const matched = hasAffirmativeSignal(normalized, id, terms);
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
