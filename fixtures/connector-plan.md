# Slack Follow-up Draft Plan

## Action
Draft a Slack message for U123 but do not send it.

## Connector
Slack connector, read profile and draft message only.

## Dry run
Preview the exact recipient, channel, payload, and rendered text before send.

## Approval
Require explicit user approval before any send or external write.

## Credentials
Use the existing Slack connector token; never print token values.

## Rollback
If sent to the wrong target, post a correction and record the incident.

## Evidence
Save the dry-run payload, approval text, command result, and target id.
