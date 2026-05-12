import { ponder } from 'ponder:registry';
import { scamVoteEvents } from 'ponder:schema';
ponder.on('ScamReporter:ScamVoteSubmitted', async ({ event, context }) => {
    const id = `${event.transaction.hash}-${event.log.logIndex}`;
    await context.db
        .insert(scamVoteEvents)
        .values({
        id,
        txHash: event.transaction.hash,
        logIndex: Number(event.log.logIndex),
        blockNumber: Number(event.block.number),
        blockTimestamp: Number(event.block.timestamp),
        reporter: event.args.reporter.toLowerCase(),
        targetId: event.args.targetId,
        targetType: Number(event.args.targetType),
        reasonHash: event.args.reasonHash,
        isScam: event.args.isScam,
    })
        .onConflictDoNothing();
});
