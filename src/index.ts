import { ponder } from 'ponder:registry';
import { securityReportEvents } from 'ponder:schema';

ponder.on('SifixReputation:SecurityReportSubmitted', async ({ event, context }) => {
  const id = `${event.transaction.hash}-${event.log.logIndex}`;

  await context.db
    .insert(securityReportEvents)
    .values({
      id,
      txHash: event.transaction.hash,
      logIndex: Number(event.log.logIndex),
      blockNumber: Number(event.block.number),
      blockTimestamp: Number(event.block.timestamp),
      reportId: event.args.reportId.toString(),
      reporter: event.args.reporter.toLowerCase(),
      targetId: event.args.targetId,
      target: event.args.target.toLowerCase(),
      threatType: Number(event.args.threatType),
      evidenceHash: event.args.evidenceHash,
      severity: Number(event.args.severity),
      eventTimestamp: event.args.timestamp.toString(),
    })
    .onConflictDoNothing();
});
