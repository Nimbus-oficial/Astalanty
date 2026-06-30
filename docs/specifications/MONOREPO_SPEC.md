# Monorepo Specification

## Objective

Define the official repository structure used to implement Astalanty.

## Scope

This specification covers source organization, package boundaries, shared code, configuration, scripts and quality gates.

## Responsibilities

The monorepo must:

- separate applications, services, packages and infrastructure;
- keep contracts, SDKs and services independently testable;
- avoid hidden dependencies between modules;
- keep documentation and code aligned.

## Module Boundaries

`apps/` contains user-facing applications.

`services/` contains backend and operational services.

`packages/` contains reusable code and smart contracts.

`infra/` contains deployment and infrastructure definitions.

`docs/` contains implementation specifications and operational runbooks.

## Public Contracts

Public interfaces must be specified before implementation:

- REST API through OpenAPI;
- GraphQL through schema files;
- WebSocket through event contracts;
- SDK through typed interfaces;
- smart contracts through Solidity interfaces and events.

## Quality Gates

Every package must eventually expose:

- `build`;
- `test`;
- `lint`;
- `check`.

## Acceptance Criteria

This specification is satisfied when:

- repository structure exists;
- package boundaries are clear;
- root scripts exist;
- documentation validation exists;
- no module requires private knowledge of another module internals.
