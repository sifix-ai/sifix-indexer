export const ScamReporterAbi = [
    {
        type: 'event',
        name: 'ScamVoteSubmitted',
        inputs: [
            { name: 'reporter', type: 'address', indexed: true, internalType: 'address' },
            { name: 'targetId', type: 'bytes32', indexed: true, internalType: 'bytes32' },
            { name: 'targetType', type: 'uint8', indexed: false, internalType: 'uint8' },
            { name: 'reasonHash', type: 'bytes32', indexed: false, internalType: 'bytes32' },
            { name: 'isScam', type: 'bool', indexed: false, internalType: 'bool' },
        ],
        anonymous: false,
    },
];
