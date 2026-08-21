import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    // Pinned because Vitest's default glob is **/*.{test,spec}.* rooted at the
    // project, which would also collect the Playwright specs in e2e/ and try
    // to run them in jsdom. Every unit test lives under src/ and is *.test.*,
    // so nothing is lost. Playwright owns e2e/ via `npm run e2e`.
    include: ['src/**/*.{test,spec}.{js,jsx}'],
  },
})
