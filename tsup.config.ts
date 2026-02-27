import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: { index: 'src/index.ts' },
    format: ['cjs', 'esm'],
    dts: true,
    clean: true,
    sourcemap: true,
    splitting: false,
    treeshake: true,
    target: 'node18',
  },
  {
    entry: { 'testing/index': 'src/testing/index.ts' },
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: true,
    target: 'node18',
  },
])
