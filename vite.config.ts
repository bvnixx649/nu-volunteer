import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'

export default defineConfig({
  base: '/nu-volunteer/',
  plugins: [react(), tailwind()],
  test: { environment: 'jsdom', include: ['src/**/*.test.ts'] },
})
