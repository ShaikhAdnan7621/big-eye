import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { handleStreamProxy } from './src/server/streamHandler';

export default defineConfig(() => {
  return {
    plugins: [
      react(), 
      tailwindcss(),
      {
        name: 'sentinel-stream-proxy',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url && (req.url.startsWith('/api/stream') || req.url.startsWith('/api/sentinel') || req.url.startsWith('/api/cameras') || req.url === '/enc.key' || req.url.endsWith('/enc.key'))) {
              try {
                const handled = await handleStreamProxy(req, res);
                if (handled) return;
              } catch (err) {
                console.error('Stream proxy error:', err);
              }
            }
            next();
          });
        }
      }
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
