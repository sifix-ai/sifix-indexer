import { onchainTable, index } from 'ponder';
export const scamVoteEvents = onchainTable('scam_vote_events', (t) => ({
    id: t.text().primaryKey(),
    txHash: t.text().notNull(),
    logIndex: t.integer().notNull(),
    blockNumber: t.integer().notNull(),
    blockTimestamp: t.integer().notNull(),
    reporter: t.text().notNull(),
    targetId: t.text().notNull(),
    targetType: t.integer().notNull(),
    reasonHash: t.text().notNull(),
    isScam: t.boolean().notNull(),
}), (table) => ({
    txHashIdx: index().on(table.txHash),
    reasonHashIdx: index().on(table.reasonHash),
    blockIdx: index().on(table.blockNumber),
}));
