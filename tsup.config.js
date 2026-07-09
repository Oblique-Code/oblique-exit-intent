import { defineConfig } from 'tsup'

export default defineConfig({
  entry: { index: 'src/index.js' },
  format: ['esm', 'cjs'],
  outExtension: ({ format }) => ({ js: format === 'cjs' ? '.cjs' : '.js' }),
  dts: true,
  sourcemap: true,
  clean: true,
  minify: true,
  treeshake: true,
  target: 'es2020',
})
