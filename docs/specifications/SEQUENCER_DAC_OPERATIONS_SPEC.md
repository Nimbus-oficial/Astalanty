# Sequencer and DAC Operations Specification

## Objective

Define the operational contract for Sequencer and Data Availability Committee.

## Scope

Applies to production and pre-production operation of block production and data availability services.

## Sequencer Requirements

The Sequencer service must define:

- primary instance;
- standby instance;
- health checks;
- failover rules;
- operator permissions;
- monitoring;
- audit events.

## DAC Requirements

The DAC must define:

- initial member count;
- quorum;
- key management;
- physical and logical segregation;
- member rotation;
- data retention;
- certificate monitoring.

## Monitoring

Required metrics:

- block production latency;
- transaction queue depth;
- sequencer health;
- DAC member availability;
- certificate production;
- synchronization status;
- failover events.

## Acceptance Criteria

This specification is complete when Sequencer and DAC can be operated from documented manifests and runbooks without relying on undocumented manual knowledge.
