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
    coverage: {
      provider: 'v8',
      // Only produced by `npm run test:coverage`; plain `npm test` stays
      // uninstrumented and as quick as it was.
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      // Without `all`, a file no test imports at all is simply absent from the
      // report -- which reads as "nothing to see here" when it is in fact the
      // least covered file in the project.
      all: true,
      include: ['src/**/*.{js,jsx}'],
      exclude: [
        'src/**/*.{test,spec}.{js,jsx}',
        'src/test/**',
        // Bootstrap and generated surface: no branches worth measuring, and
        // leaving them in drags the percentage around for no signal.
        'src/main.jsx',
      ],
    },
  },
})
