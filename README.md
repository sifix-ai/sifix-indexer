# SIFIX Indexer

Ponder-based onchain indexer for SIFIX threat intelligence, reconciliation, and transparent on-chain security events.

Indexes `SecurityReportSubmitted` events from **0G Galileo Testnet (Chain ID: 16602)** and pushes normalized event batches to SIFIX dApp reconcile endpoint.

## Scope

- Chain: 0G Galileo (`16602`)
- Contract: `SifixReputation` (`0xBBa8b030D80113e50271a2bbEeDBE109D9f1C42e`)
- Event: `SecurityReportSubmitted(uint256 reportId, address reporter, bytes32 targetId, string target, uint8 threatType, bytes32 evidenceHash, uint8 severity, uint256 timestamp)`

## Architecture

- `ponder.config.ts` — chain + contract source config
- `ponder.schema.ts` — `security_report_events` table definition
- `src/index.ts` — event handler writes normalized records
- `scripts/push-reconcile.ts` — pushes indexed events to dApp `POST /api/v1/sync/reconcile-batch`

## Data Model (indexed)

- `txHash`
- `logIndex`
- `blockNumber`
- `reportId`
- `reporter`
- `targetId`
- `target`
- `threatType`
- `evidenceHash`
- `severity`
- `eventTimestamp`

Unique event identity: `txHash-logIndex`.

## Requirements

- Node.js >= 18
- npm

## Setup

```bash
npm install
npm run codegen
npm run typecheck
```

## Environment

Create `.env.local` (or export env vars):

```bash
PONDER_RPC_URL_16602=https://evmrpc-testnet.0g.ai
PONDER_START_BLOCK=0

# Dedicated Ponder DB (recommended separate from dApp DB)
DATABASE_URL=postgresql://sifix:CHANGE_ME@10.3.1.114:5432/sifix_indexer?schema=public
PONDER_DATABASE_URL=postgresql://sifix:CHANGE_ME@10.3.1.114:5432/sifix_indexer?schema=public
DATABASE_SCHEMA=sifix_reputation_indexer

# Reconcile bridge
PONDER_API_URL=http://localhost:42069/sql
DAPP_RECONCILE_URL=http://localhost:3000/api/v1/sync/reconcile-batch
CRON_SECRET=your_secret
```

## Run

```bash
npm run dev
```

## Push Reconcile Batch to dApp

```bash
npm run reconcile:push
```

This script queries recent indexed rows and sends:

```json
{
  "events": [
    {
      "txHash": "0x...",
      "logIndex": 0,
      "blockNumber": 12345,
      "reportId": "1",
      "reporter": "0x...",
      "targetId": "0x...",
      "target": "example.com",
      "threatType": 1,
      "evidenceHash": "0x...",
      "severity": 3,
      "eventTimestamp": "1715680000"
    }
  ],
  "lastBlock": 12345,
  "chainId": 16602
}
```

to:

`POST /api/v1/sync/reconcile-batch` with `Authorization: Bearer <CRON_SECRET>`.

## Integration Contract with dApp

- `evidenceHash` from onchain event maps to dApp evidence linkage.
- dApp sync state key: `sifix_reputation_indexer`.
- dApp updates:
  - normalized threat/report records from onchain source
  - `sync_state.lastBlock` for incremental reconcile
  - onchain metadata (`txHash`, `blockNumber`, `reportId`, `severity`)

## Current Status (May 2026)

- Scaffold complete
- Config wired to Galileo + SifixReputation (`0xBBa8b030D80113e50271a2bbEeDBE109D9f1C42e`)
- Event indexing handler implemented for `SecurityReportSubmitted`
- Reconcile push script migrated to `events + lastBlock + chainId` payload
- Reconcile target migrated to `POST /api/v1/sync/reconcile-batch`
- Sync cursor key aligned to `sifix_reputation_indexer`
- Recommended deployment uses dedicated PostgreSQL database `sifix_indexer` separate from dApp business DB `sifix`

## Next

- Add cursor-based incremental push (`lastPushedBlock`)
- Add retry/backoff + dead-letter queue
- Add health/metrics endpoint
