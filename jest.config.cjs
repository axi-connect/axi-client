module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|sass|scss)$': 'identity-obj-proxy',
  },
  testMatch: ['**/__tests__/**/*.test.(ts|tsx)'],
  // Los worktrees de features viven bajo .claude/worktrees: sus tests
  // duplican las suites y resuelven @/* contra el src del repo PADRE
  // (fallos fantasma). Cada worktree corre su propia suite.
  testPathIgnorePatterns: ['/node_modules/', '/.claude/worktrees/', '/.next/'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.jest.json' }],
  },
}
