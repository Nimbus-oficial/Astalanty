# API Contracts Specification

## Objective

Define the public API contract requirements for Astalanty services.

## Scope

Covers REST, GraphQL and WebSocket public interfaces.

## REST

REST APIs must be documented with OpenAPI before implementation.

Minimum requirements:

- versioned paths;
- request schemas;
- response schemas;
- error model;
- authentication;
- pagination;
- rate limiting.

## GraphQL

GraphQL APIs must define:

- schema;
- queries;
- mutations;
- field-level authorization;
- complexity limits;
- error model.

## WebSocket

WebSocket APIs must define:

- channels;
- events;
- payloads;
- authentication;
- authorization;
- reconnection policy;
- deduplication policy.

## Acceptance Criteria

This specification is complete when API consumers can implement against documented contracts without reading service internals.
