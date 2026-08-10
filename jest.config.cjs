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
  //
  // El patrón va anclado a <rootDir> a propósito: sin anclar casa también con
  // la ruta ABSOLUTA de un worktree, y entonces la suite de ese worktree se
  // ignora a sí misma — jest encuentra 0 tests y el verde es mentira.
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/.claude/worktrees/', '/.next/'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.jest.json' }],
  },
}
