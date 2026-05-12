import { db } from "ponder:api";
import { scamVoteEvents } from "ponder:schema";
import { Hono } from "hono";
import { eq, desc, gt } from "ponder";

const app = new Hono();

// Simple CORS middleware
app.use("/*", async (c, next) => {
  await next();
  c.header("Access-Control-Allow-Origin", "*");
  c.header("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  c.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
});

// Handle OPTIONS preflight
app.options("/*", (c) => {
  c.header("Access-Control-Allow-Origin", "*");
  c.header("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  c.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return c.text("");
});

/**
 * GET /api/reconcile/sync-state
 * Get current sync state (last indexed block)
 */
app.get("/sync-state", async (c) => {
  try {
    // Get the latest block number from indexed events
    const latestEvent = await db
      .select()
      .from(scamVoteEvents)
      .orderBy(desc(scamVoteEvents.blockNumber))
      .limit(1);

    const lastBlock = latestEvent[0]?.blockNumber || 0;

    return c.json({
      success: true,
      data: {
        name: "scam_vote_indexer",
        lastBlock,
        chainId: 16602,
        source: "onchain",
        status: "active",
        lastSyncAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("[Reconcile] Error getting sync state:", error);
    return c.json(
      {
        success: false,
        error: error?.message || "Failed to get sync state",
      },
      { status: 500 }
    );
  }
});

/**
 * POST /api/reconcile/batch
 * Get batch of events since lastBlock
 * This is the pull-based approach where dapp polls indexer
 */
app.post("/batch", async (c) => {
  try {
    const body = await c.req.json();
    const { lastBlock = 0, limit = 100 } = body;

    // Fetch events after lastBlock
    const events = await db
      .select()
      .from(scamVoteEvents)
      .where(gt(scamVoteEvents.blockNumber, lastBlock))
      .orderBy(scamVoteEvents.blockNumber)
      .orderBy(scamVoteEvents.logIndex)
      .limit(limit);

    // Get the latest block number
    const latestEvent = await db
      .select()
      .from(scamVoteEvents)
      .orderBy(desc(scamVoteEvents.blockNumber))
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
      {
        success: false,
        error: error?.message || "Failed to fetch batch",
      },
      { status: 500 }
    );
  }
});

/**
 * POST /api/reconcile/push-batch
 * Push batch of events to dapp (push-based approach)
 * This requires dapp to provide an endpoint and CRON_SECRET
 */
app.post("/push-batch", async (c) => {
  try {
    const body = await c.req.json();
    const {
      dappUrl,
      cronSecret,
      batchSize = 50,
    } = body;

    if (!dappUrl || !cronSecret) {
      return c.json(
        {
          success: false,
          error: "Missing dappUrl or cronSecret",
        },
        { status: 400 }
      );
    }

    // Get current sync state from dapp
    const stateRes = await fetch(`${dappUrl}/api/v1/sync/state`, {
      headers: {
        Authorization: `Bearer ${cronSecret}`,
      },
    });

    if (!stateRes.ok) {
      return c.json(
        {
          success: false,
          error: "Failed to get dapp sync state",
        },
        { status: 500 }
      );
    }

    const stateData: any = await stateRes.json();
    const lastBlock = stateData.data?.lastBlock || 0;

    // Fetch events after lastBlock
    const events = await db
      .select()
      .from(scamVoteEvents)
      .where(gt(scamVoteEvents.blockNumber, lastBlock))
      .orderBy(scamVoteEvents.blockNumber)
      .orderBy(scamVoteEvents.logIndex)
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

    // Push batch to dapp
    const reconcileRes = await fetch(`${dappUrl}/api/v1/sync/reconcile-batch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cronSecret}`,
      },
      body: JSON.stringify({
        votes: events.map((e: any) => ({
          reasonHash: e.reasonHash,
          isScam: e.isScam,
          reporter: e.reporter,
          blockNumber: e.blockNumber,
          txHash: e.txHash,
        })),
        lastBlock: Math.max(...events.map((e: any) => e.blockNumber)),
        chainId: 16602,
      }),
    });

    if (!reconcileRes.ok) {
      const errorText = await reconcileRes.text();
      return c.json(
        {
          success: false,
          error: `Failed to push to dapp: ${errorText}`,
        },
        { status: 500 }
      );
    }

    const reconcileData: any = await reconcileRes.json();

    return c.json({
      success: true,
      data: {
        synced: reconcileData.data.synced || 0,
        notFound: reconcileData.data.notFound || 0,
        errors: reconcileData.data.errors || 0,
        lastBlock: Math.max(...events.map((e: any) => e.blockNumber)),
      },
    });
  } catch (error: any) {
    console.error("[Reconcile] Error in push-batch:", error);
    return c.json(
      {
        success: false,
        error: error?.message || "Failed to push batch",
      },
      { status: 500 }
    );
  }
});

export default app;
