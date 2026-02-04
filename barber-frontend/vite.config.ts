import fs from 'fs';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const httpsCert = env.VITE_HTTPS_CERT;
    const httpsKey = env.VITE_HTTPS_KEY;
    const https = httpsCert && httpsKey
      ? {
          cert: fs.readFileSync(httpsCert),
          key: fs.readFileSync(httpsKey)
        }
      : undefined;
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        https,
        headers: {
          'Cache-Control': 'public, max-age=3600',
          'X-Content-Type-Options': 'nosniff',
        }
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
        },
      },
      build: {
        chunkSizeWarningLimit: 800,
        rollupOptions: {
          output: {
            manualChunks: {
              vendor: ['react', 'react-dom', 'react-router-dom'],
              ui: ['framer-motion', 'lucide-react', 'recharts'],
              utils: ['date-fns', 'clsx', 'tailwind-merge']
            }
          }
        }
      }
    };
});
