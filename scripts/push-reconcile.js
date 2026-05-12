import 'dotenv/config';
const PONDER_API = process.env.PONDER_API_URL || 'http://localhost:42069/sql';
const DAPP_RECONCILE_URL = process.env.DAPP_RECONCILE_URL || 'http://localhost:3000/api/internal/reconcile/onchain';
const CRON_SECRET = process.env.CRON_SECRET || '';
async function main() {
    if (!CRON_SECRET)
        throw new Error('Missing CRON_SECRET');
    const query = {
        query: `
      select tx_hash as "txHash", block_number as "blockNumber", reason_hash as "reasonHash"
      from scam_vote_events
      order by block_number desc
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
    const eventsPayload = await eventsRes.json();
    const events = eventsPayload?.rows || eventsPayload?.data || [];
    const syncRes = await fetch(DAPP_RECONCILE_URL, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${CRON_SECRET}`,
        },
        body: JSON.stringify({ events }),
    });
    const data = await syncRes.text();
    console.log(data);
}
main().catch((e) => {
    console.error(e);
    process.exit(1);
});
