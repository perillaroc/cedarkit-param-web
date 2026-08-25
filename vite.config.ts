import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

// base './'：dist 可部署在任意子路径下（Netlify 根域名或预览路径均可）
export default defineConfig({
  base: './',
  plugins: [vue()],
  test: {
    include: ['tests/**/*.test.ts'],
  },
})
