# SIFIX Indexer

Ponder-based onchain indexer for SIFIX threat intelligence pipeline.

Indexes `ScamVoteSubmitted` events from **0G Galileo Testnet (Chain ID: 16602)** and pushes normalized event batches to SIFIX dApp reconcile endpoint.

## Scope

- Chain: 0G Galileo (`16602`)
- Contract: `ScamReporter` (`0x544a39149d5169E4e1bDf7F8492804224CB70152`)
- Event: `ScamVoteSubmitted(address reporter, bytes32 targetId, uint8 targetType, bytes32 reasonHash, bool isScam)`

## Architecture

- `ponder.config.ts` — chain + contract source config
- `ponder.schema.ts` — `scam_vote_events` table definition
- `src/index.ts` — event handler writes normalized records
- `scripts/push-reconcile.ts` — pushes indexed events to dApp `POST /api/internal/reconcile/onchain`

## Data Model (indexed)

- `txHash`
- `logIndex`
- `blockNumber`
- `blockTimestamp`
- `reporter`
- `targetId`
- `targetType`
- `reasonHash`
- `isScam`

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

# Reconcile bridge
PONDER_API_URL=http://localhost:42069/sql
DAPP_RECONCILE_URL=http://localhost:3000/api/internal/reconcile/onchain
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
    { "txHash": "0x...", "blockNumber": 12345, "reasonHash": "0x..." }
  ]
}
```

to:

`POST /api/internal/reconcile/onchain` with `Authorization: Bearer <CRON_SECRET>`.

## Integration Contract with dApp

- `reasonHash` from onchain event maps to dApp `reportHash`.
- dApp updates:
  - `localStatus` => `SYNCED`
  - `onchainStatus` => `SUBMITTED`
  - `onchainTxHash`, `blockNumber`, metadata

## Current Status (May 2026)

- Scaffold complete
- Config wired to Galileo + ScamReporter
- Event indexing handler implemented
- Reconcile push script implemented
- Reconcile payload now includes `targetId` and `targetType` for richer dApp resolution context
- Recommended deployment shape now uses dedicated PostgreSQL database `sifix_indexer` separate from dApp business DB `sifix`
- Typecheck/codegen passing

## Next

- Add cursor-based incremental push (`lastPushedBlock`)
- Add retry/backoff + dead-letter queue
- Add health/metrics endpoint
