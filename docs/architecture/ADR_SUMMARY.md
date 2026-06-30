# ADR Summary

This public summary records the architectural decisions that guide the current MVP without publishing the internal Obsidian vault.

## ADR-0001: Arbitrum Orbit Direction

Astalanty is designed with an Arbitrum Orbit-oriented long-term architecture. The current MVP does not deploy a production Orbit chain.

## ADR-0002: AnyTrust Direction

The broader architecture considers AnyTrust for future Layer 3 operation. This is not part of the current MVP implementation.

## ADR-0003: Modular Architecture

The system is organized around modular components: Smart Account, Paymaster, Fee Manager, settlement token, SDK and Demo App.

## ADR-0004: TypeScript SDK As Canonical Client

Applications should use the official TypeScript SDK instead of manually orchestrating Solidity contracts. The Demo App follows this rule.

## ADR-0005: Self-Custody

The Smart Account model is self-custodial. The MVP includes a minimal Smart Account and recovery guardian flow.

## ADR-0006: APIs As Future Service Boundary

Public APIs are part of the broader roadmap but are not implemented in the MVP.

## ADR-0007: AI-Assisted Implementation Under Documentation Constraints

The MVP was implemented under frozen specifications, explicit scope boundaries and review checkpoints.
