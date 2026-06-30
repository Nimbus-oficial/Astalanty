# Astalanty Executive Summary

Astalanty is building developer infrastructure for payment abstraction in an Arbitrum-aligned modular chain environment.

The current MVP focuses on proving one core idea: applications should be able to offer a sponsored Smart Account transaction flow without forcing developers to manually coordinate payment tokens, Paymaster calls, fee conversion and settlement contracts.

## What Exists Today

The project currently includes:

- ERC-20 Mock USDC for testnet user payment;
- ERC-20 AUSD for internal settlement;
- Fee Manager for deterministic fee calculation;
- Paymaster for Mock USDC collection and settlement;
- Smart Account and Factory;
- complete Hardhat test coverage for the MVP flow;
- deploy and seed scripts;
- canonical TypeScript SDK;
- official Demo App using only the SDK.

## Why It Matters

For the Arbitrum ecosystem, Astalanty explores developer experience around app-specific infrastructure, Account Abstraction and modular fee/payment flows. A polished version of this primitive can help future Orbit-based applications reduce onboarding friction while preserving self-custody and transparent settlement logic.

## Current Status

The MVP is ready for public testnet deployment once Arbitrum Sepolia ETH is available. After deployment, the next public technical evidence package should include verified contracts, explorer links, a short demo walkthrough and a milestone plan for ERC-4337-compatible expansion.

The MVP is locally validated and testnet-deploy-ready. It is not yet a production financial system, does not claim mainnet readiness, does not include a complete ERC-4337 EntryPoint/Bundler flow, and has no published external audit.
