import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      thresholds: {
        lines: 90,
        branches: 85,    // v8 counts ?? and ?. as branches; 85% is high bar
        functions: 90,
        statements: 90,
      },
      exclude: [
        'src/testing/**',
        'src/types/**',
        'src/utils/logger.ts',
        'src/index.ts',
        'src/client.ts',          // tested via integration tests (requires real WS)
        'src/signer/index.ts',    // barrel re-export only
        'src/tx/index.ts',        // barrel re-export only
        'vitest.integration.config.ts',
        'tests/**',
      ],
    },
  },
})
