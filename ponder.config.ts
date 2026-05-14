import { createConfig } from 'ponder';
import { SifixReputationAbi } from './abis/SifixReputationAbi.js';

export default createConfig({
  chains: {
    galileo: {
      id: 16602,
      rpc: process.env.PONDER_RPC_URL_16602 || 'https://evmrpc-testnet.0g.ai',
    },
  },
  contracts: {
    SifixReputation: {
      chain: 'galileo',
      abi: SifixReputationAbi,
      address: '0xBBa8b030D80113e50271a2bbEeDBE109D9f1C42e',
      startBlock: Number(process.env.PONDER_START_BLOCK || 0),
    },
  },
});
