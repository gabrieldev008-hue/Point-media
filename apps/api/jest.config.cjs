module.exports = { testEnvironment: 'node', testMatch: ['**/src/**/*.spec.ts'], transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }] }, clearMocks: true };
