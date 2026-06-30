# Security Baseline Specification

## Objective

Define minimum security requirements for all Astalanty components.

## Scope

Applies to contracts, APIs, SDKs, Wallet, Explorer, Bridge, RPC, NOC, Sequencer, DAC and infrastructure.

## Baseline Controls

All production components must implement:

- least privilege;
- explicit authentication when required;
- explicit authorization for sensitive operations;
- structured audit logs;
- secret management outside source code;
- encrypted transport;
- documented incident response;
- test coverage for sensitive flows.

## Administrative Operations

Critical administrative operations require:

- role-based access;
- multisig or equivalent approval;
- audit event;
- rollback or mitigation procedure where applicable.

## Secrets

Secrets must never be committed.

Production secrets must use a managed secret store, KMS or HSM depending on criticality.

## Smart Contracts

Critical contracts must include:

- access control tests;
- upgrade tests where applicable;
- pause tests where applicable;
- event tests;
- negative tests for unauthorized calls.

## Acceptance Criteria

This specification is satisfied when each component has a security checklist mapped to these controls before production.
