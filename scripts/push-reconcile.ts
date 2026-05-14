import 'dotenv/config';

const PONDER_API = process.env.PONDER_API_URL || 'http://localhost:42069/sql';
const DAPP_RECONCILE_URL =
  process.env.DAPP_RECONCILE_URL || 'http://localhost:3000/api/v1/sync/reconcile-batch';
const CRON_SECRET = process.env.CRON_SECRET || '';
const CHAIN_ID = Number(process.env.CHAIN_ID || 16602);

async function main() {
  if (!CRON_SECRET) throw new Error('Missing CRON_SECRET');

  const query = {
    query: `
      select
        tx_hash as "txHash",
        log_index as "logIndex",
        block_number as "blockNumber",
        report_id as "reportId",
        reporter as "reporter",
        target_id as "targetId",
        target as "target",
        threat_type as "threatType",
        evidence_hash as "evidenceHash",
        severity as "severity",
        event_timestamp as "eventTimestamp"
      from security_report_events
      order by block_number desc, log_index desc
      limit 200
    `,
  };

  const eventsRes = await fetch(PONDER_API, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(query),
  });

  if (!eventsRes.ok) throw new Error(`Ponder query failed: ${eventsRes.status}`);
  const eventsPayload = (await eventsRes.json()) as any;
  const rows = eventsPayload?.rows || eventsPayload?.data || [];

  const events = rows.map((r: any) => ({
    txHash: r.txHash,
    logIndex: Number(r.logIndex),
    blockNumber: Number(r.blockNumber),
    reportId: r.reportId,
    reporter: r.reporter,
    targetId: r.targetId,
    target: r.target,
    threatType: Number(r.threatType),
    evidenceHash: r.evidenceHash,
    severity: Number(r.severity),
    eventTimestamp: r.eventTimestamp,
  }));

  const lastBlock = events.length ? Math.max(...events.map((v: any) => v.blockNumber)) : null;

  const syncRes = await fetch(DAPP_RECONCILE_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${CRON_SECRET}`,
    },
    body: JSON.stringify({ events, lastBlock, chainId: CHAIN_ID }),
  });

  const data = await syncRes.text();
  console.log(data);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
