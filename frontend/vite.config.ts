/**
 * FILE: frontend/vite.config.ts
 * PHASE: 0 - Project Setup & Infrastructure
 * PURPOSE: Vite config: react plugin, tailwind plugin, @ alias, dev proxy /api -> backend to keep cookies same-site.
 */

import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(({ mode }) => {
  const viteEnv = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      proxy: {
        '/api': {
          target: viteEnv.VITE_API_PROXY_TARGET ?? 'http://localhost:4001',
          changeOrigin: true,
        },
      },
    },
  };
});
