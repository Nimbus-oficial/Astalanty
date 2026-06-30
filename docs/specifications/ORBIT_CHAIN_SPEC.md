# Orbit Chain Specification

## Objective

Define the implementation contract for Astalanty as an Arbitrum Orbit AnyTrust Layer 3.

## Scope

Covers chain identity, parent chain, environment configuration, chain parameters, deployment flow and operational constraints.

## Chain Identity

- Name: Astalanty
- Type: Layer 3
- Technology: Arbitrum Orbit
- Model: AnyTrust
- Parent Chain: Arbitrum One
- EVM compatibility: required

## Environments

Deployment promotion order:

```text
Development -> Homologation -> Testnet -> Mainnet
```

Direct deployment to Mainnet is prohibited.

## Parameters

Initial documented parameters:

- block time target: 500 milliseconds;
- initial gas limit: 32 million gas per block;
- initial throughput target: 128 million gas per second;
- Chain ID: to be assigned during infrastructure deployment.

## Required Implementation Artifacts

- environment configuration;
- chain deployment manifest;
- chain parameter file;
- upgrade policy;
- emergency procedure;
- monitoring requirements.

## Acceptance Criteria

This specification is complete when each environment can be described by a versioned manifest and every chain parameter has an owner, source and change process.
