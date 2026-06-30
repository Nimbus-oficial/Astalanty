# AUSD and Gas Model Specification

## Objective

Define the technical contract for using AUSD as the operational fee settlement asset.

## Scope

This specification governs chain configuration, Fee Manager, Treasury, Smart Accounts, Gas Sponsorship, Bridge, RPC and SDK behavior.

## Architectural Decision

Astalanty does not use a speculative native token.

AUSD is the official technical asset used for operational fee settlement.

## Required Technical Decision

Before contract implementation, the engineering team must confirm whether AUSD is:

- the native gas token configured at the Orbit chain level;
- an ERC-20 settlement token used by Fee Manager;
- both.

This decision must be recorded before Fee Manager, Gas Sponsorship or transaction submission logic is implemented.

## Settlement Flow

The standard settlement flow is:

```text
Operation
-> cost calculation
-> payer selection
-> AUSD settlement
-> Treasury receipt
-> audit event
```

## Events

Minimum event categories:

- fee calculated;
- payer selected;
- sponsor accepted;
- sponsor rejected;
- payment settled;
- payment failed;
- treasury credited.

## Failure Policy

Failures must be explicit and auditable:

- insufficient balance;
- invalid sponsor;
- exceeded sponsor limit;
- duplicate settlement;
- invalid fee policy.

## Acceptance Criteria

This specification is complete when the native gas and ERC-20 settlement relationship is formally decided and all affected components are mapped.
