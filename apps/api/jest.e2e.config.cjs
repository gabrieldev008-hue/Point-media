module.exports = { testEnvironment: 'node', testMatch: ['**/test/**/*.e2e-spec.ts'], transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }] }, testTimeout: 60000, maxWorkers: 1 };
