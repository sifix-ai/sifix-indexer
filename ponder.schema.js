import { onchainTable, index } from 'ponder';
export const securityReportEvents = onchainTable('security_report_events', (t) => ({
    id: t.text().primaryKey(),
    txHash: t.text().notNull(),
    logIndex: t.integer().notNull(),
    blockNumber: t.integer().notNull(),
    blockTimestamp: t.integer().notNull(),
    reportId: t.text().notNull(),
    reporter: t.text().notNull(),
    targetId: t.text().notNull(),
    target: t.text().notNull(),
    threatType: t.integer().notNull(),
    evidenceHash: t.text().notNull(),
    severity: t.integer().notNull(),
    eventTimestamp: t.text().notNull(),
}), (table) => ({
    txHashIdx: index().on(table.txHash),
    targetIdx: index().on(table.target),
    targetIdIdx: index().on(table.targetId),
    evidenceHashIdx: index().on(table.evidenceHash),
    blockIdx: index().on(table.blockNumber),
}));
