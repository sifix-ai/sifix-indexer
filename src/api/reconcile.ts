import { db } from "ponder:api";
import * as schema from "ponder:schema";
import { securityReportEvents } from "ponder:schema";
import { Hono } from "hono";
import { client, desc, gt } from "ponder";

const app = new Hono();
const CHAIN_ID = Number(process.env.CHAIN_ID || 16602);

app.use("/sql/*", client({ db, schema }));

app.use("/*", async (c, next) => {
  await next();
  c.header("Access-Control-Allow-Origin", "*");
  c.header("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  c.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
});

app.options("/*", (c) => {
  c.header("Access-Control-Allow-Origin", "*");
  c.header("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  c.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return c.text("");
});

app.get("/sync-state", async (c) => {
  try {
    const latestEvent = await db
      .select()
      .from(securityReportEvents)
      .orderBy(desc(securityReportEvents.blockNumber))
      .limit(1);

    const lastBlock = latestEvent[0]?.blockNumber || 0;

    return c.json({
      success: true,
      data: {
        name: "sifix_reputation_indexer",
        lastBlock,
        chainId: CHAIN_ID,
        source: "onchain",
        status: "active",
        lastSyncAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("[Reconcile] Error getting sync state:", error);
    return c.json(
      { success: false, error: error?.message || "Failed to get sync state" },
      { status: 500 }
    );
  }
});

app.post("/batch", async (c) => {
  try {
    const body = await c.req.json();
    const { lastBlock = 0, limit = 100 } = body;

    const events = await db
      .select()
      .from(securityReportEvents)
      .where(gt(securityReportEvents.blockNumber, lastBlock))
      .orderBy(securityReportEvents.blockNumber)
      .orderBy(securityReportEvents.logIndex)
      .limit(limit);

    const latestEvent = await db
      .select()
      .from(securityReportEvents)
      .orderBy(desc(securityReportEvents.blockNumber))
      .limit(1);

    const currentLastBlock = latestEvent[0]?.blockNumber || 0;

    return c.json({
      success: true,
      data: {
        events,
        lastBlock: currentLastBlock,
        hasMore: events.length === limit,
      },
    });
  } catch (error: any) {
    console.error("[Reconcile] Error fetching batch:", error);
    return c.json(
      { success: false, error: error?.message || "Failed to fetch batch" },
      { status: 500 }
    );
  }
});

app.post("/push-batch", async (c) => {
  try {
    const body = await c.req.json();
    const { dappUrl, cronSecret, batchSize = 50 } = body;

    if (!dappUrl || !cronSecret) {
      return c.json(
        { success: false, error: "Missing dappUrl or cronSecret" },
        { status: 400 }
      );
    }

    const stateRes = await fetch(`${dappUrl}/api/v1/sync/state`, {
      headers: { Authorization: `Bearer ${cronSecret}` },
    });

    if (!stateRes.ok) {
      return c.json(
        { success: false, error: "Failed to get dapp sync state" },
        { status: 500 }
      );
    }

    const stateData: any = await stateRes.json();
    const lastBlock = stateData.data?.lastBlock || 0;

    const events = await db
      .select()
      .from(securityReportEvents)
      .where(gt(securityReportEvents.blockNumber, lastBlock))
      .orderBy(securityReportEvents.blockNumber)
      .orderBy(securityReportEvents.logIndex)
      .limit(batchSize);

    if (events.length === 0) {
      return c.json({
        success: true,
        data: {
          synced: 0,
          message: "No new events to sync",
        },
      });
    }

    const lastIndexedBlock = Math.max(...events.map((e: any) => Number(e.blockNumber)));

    const reconcileRes = await fetch(`${dappUrl}/api/v1/sync/reconcile-batch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cronSecret}`,
      },
      body: JSON.stringify({
        events: events.map((e: any) => ({
          txHash: e.txHash,
          logIndex: Number(e.logIndex),
          blockNumber: Number(e.blockNumber),
          reportId: e.reportId,
          reporter: e.reporter,
          targetId: e.targetId,
          target: e.target,
          threatType: Number(e.threatType),
          evidenceHash: e.evidenceHash,
          severity: Number(e.severity),
          eventTimestamp: e.eventTimestamp,
        })),
        lastBlock: lastIndexedBlock,
        chainId: CHAIN_ID,
      }),
    });

    if (!reconcileRes.ok) {
      const errorText = await reconcileRes.text();
      return c.json(
        { success: false, error: `Failed to push to dapp: ${errorText}` },
        { status: 500 }
      );
    }

    const reconcileData: any = await reconcileRes.json();

    return c.json({
      success: true,
      data: {
        synced: reconcileData.data?.synced || 0,
        notFound: reconcileData.data?.notFound || 0,
        errors: reconcileData.data?.errors || 0,
        lastBlock: lastIndexedBlock,
      },
    });
  } catch (error: any) {
    console.error("[Reconcile] Error in push-batch:", error);
    return c.json(
      { success: false, error: error?.message || "Failed to push batch" },
      { status: 500 }
    );
  }
});

export default app;
