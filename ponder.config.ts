import { createConfig } from 'ponder';
import { ScamReporterAbi } from './abis/ScamReporterAbi.js';

export default createConfig({
  chains: {
    galileo: {
      id: 16602,
      rpc: process.env.PONDER_RPC_URL_16602 || 'https://evmrpc-testnet.0g.ai',
    },
  },
  contracts: {
    ScamReporter: {
      chain: 'galileo',
      abi: ScamReporterAbi,
      address: '0x544a39149d5169E4e1bDf7F8492804224CB70152',
      startBlock: Number(process.env.PONDER_START_BLOCK || 0),
    },
  },
});
