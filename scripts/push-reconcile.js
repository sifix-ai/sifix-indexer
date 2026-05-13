import 'dotenv/config';
const PONDER_API = process.env.PONDER_API_URL || 'http://localhost:42069/sql';
const DAPP_RECONCILE_URL = process.env.DAPP_RECONCILE_URL || 'http://localhost:3000/api/v1/sync/reconcile-batch';
const CRON_SECRET = process.env.CRON_SECRET || '';
const CHAIN_ID = Number(process.env.CHAIN_ID || 16602);
async function main() {
    if (!CRON_SECRET)
        throw new Error('Missing CRON_SECRET');
    const query = {
        query: `
      select
        tx_hash as "txHash",
        log_index as "logIndex",
        block_number as "blockNumber",
        reason_hash as "reasonHash",
        reporter as "reporter",
        is_scam as "isScam",
        target_id as "targetId",
        target_type as "targetType"
      from scam_vote_events
      order by block_number desc, log_index desc
      limit 200
    `,
    };
    const eventsRes = await fetch(PONDER_API, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(query),
    });
    if (!eventsRes.ok)
        throw new Error(`Ponder query failed: ${eventsRes.status}`);
    const eventsPayload = (await eventsRes.json());
    const rows = eventsPayload?.rows || eventsPayload?.data || [];
    const votes = rows.map((r) => ({
        txHash: r.txHash,
        logIndex: Number(r.logIndex),
        blockNumber: Number(r.blockNumber),
        reasonHash: r.reasonHash,
        reporter: r.reporter,
        isScam: Boolean(r.isScam),
        targetId: r.targetId,
        targetType: r.targetType,
    }));
    const lastBlock = votes.length ? Math.max(...votes.map((v) => v.blockNumber)) : null;
    const syncRes = await fetch(DAPP_RECONCILE_URL, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${CRON_SECRET}`,
        },
        body: JSON.stringify({ votes, lastBlock, chainId: CHAIN_ID }),
    });
    const data = await syncRes.text();
    console.log(data);
}
main().catch((e) => {
    console.error(e);
    process.exit(1);
});
