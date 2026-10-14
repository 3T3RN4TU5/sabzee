import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // DuckDB-WASM ships its own worker + .wasm files, imported with `?url` (see src/db/engine.ts).
  optimizeDeps: { exclude: ['@duckdb/duckdb-wasm'] },
  worker: { format: 'es' },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1200,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'codemirror', test: /node_modules[\\/](@codemirror|@lezer|crelt|style-mod|w3c-keyname)/ },
            { name: 'arrow', test: /node_modules[\\/](apache-arrow|flatbuffers|tslib|json-bignum|command-line)/ },
          ],
        },
      },
    },
  },
})
