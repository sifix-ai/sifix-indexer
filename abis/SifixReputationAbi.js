export const SifixReputationAbi = [
  {
    type: 'event',
    name: 'SecurityReportSubmitted',
    inputs: [
      { name: 'reportId', type: 'uint256', indexed: true, internalType: 'uint256' },
      { name: 'reporter', type: 'address', indexed: true, internalType: 'address' },
      { name: 'targetId', type: 'bytes32', indexed: true, internalType: 'bytes32' },
      { name: 'target', type: 'address', indexed: false, internalType: 'address' },
      { name: 'threatType', type: 'uint8', indexed: false, internalType: 'enum SifixReputation.ThreatType' },
      { name: 'evidenceHash', type: 'bytes32', indexed: false, internalType: 'bytes32' },
      { name: 'severity', type: 'uint8', indexed: false, internalType: 'uint8' },
      { name: 'timestamp', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
    anonymous: false,
  },
];
