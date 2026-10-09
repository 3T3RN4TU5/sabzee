import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  worker: {
    format: 'es',
  },
  build: {
    rolldownOptions: {
      output: {
        // CodeMirror is only reached through a lazy import, so its two chunks
        // load after the problem list has painted. React is captured first
        // (higher priority) so it is not pulled into the editor chunks as a
        // dependency of @uiw/react-codemirror.
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/, priority: 30 },
            { name: 'codemirror-view', test: /node_modules[\\/](@codemirror[\\/](view|state)|crelt|style-mod|w3c-keyname|@marijn)[\\/]/, priority: 20 },
            { name: 'codemirror', test: /node_modules[\\/](@codemirror|@lezer|@uiw|codemirror)[\\/]/, priority: 10 },
          ],
        },
      },
    },
  },
})
