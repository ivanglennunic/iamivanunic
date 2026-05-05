import { defineConfig } from 'vite'

// Project site: https://ivanglennunic.github.io/iamivanunic/
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/iamivanunic/' : '/',
}))
