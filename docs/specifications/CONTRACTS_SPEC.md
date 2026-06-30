# Smart Contracts Specification

## Objective

Define the initial implementation contract for official Astalanty smart contracts.

## Official Contracts

- Astalanty Registry
- Astalanty Access Manager
- Astalanty Treasury
- Astalanty Fee Manager
- Astalanty Upgrade Manager
- Astalanty Emergency Pause
- Astalanty Token Factory
- Astalanty NFT Factory
- Astalanty Smart Account Factory

## Shared Requirements

Every official contract must define:

- responsibility;
- owner/admin model;
- public interface;
- events;
- errors;
- access control;
- upgrade behavior where applicable;
- pause behavior where applicable;
- tests.

## Dependency Rule

Contracts must avoid circular dependencies.

Registry may provide discovery, but must not contain business logic.

Access Manager centralizes administrative permissions.

Treasury receives funds, but does not calculate fees.

Fee Manager calculates and settles fees, but does not permanently custody funds.

## Acceptance Criteria

This specification is complete when each official contract has a dedicated interface, event list, access matrix and test plan.
