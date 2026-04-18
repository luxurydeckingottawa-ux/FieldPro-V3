import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load all environment variables from the current environment
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [
      react(),
    ],
    // SECURITY: Do NOT put API keys in the define block — they leak into the client bundle.
    // Gemini calls go through the server-side gemini-proxy Netlify function.
    define: {},
    optimizeDeps: {
      include: [],
    },
    build: {
      commonjsOptions: {
        include: [/node_modules/],
      },
      // Bump limit so we only get warnings for truly-over-budget chunks.
      // Route chunks that exceed this are acceptable because they are lazy-loaded.
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          // Vendor chunking strategy — keeps shared libs in stable, cacheable chunks
          // so updating app code does not invalidate vendor caches. Groups picked
          // by deploy-frequency and logical feature pairing, not alphabetically.
          manualChunks: (id) => {
            if (!id.includes('node_modules')) return undefined;
            // React core — always in the main bundle's critical path.
            if (/[\\/]node_modules[\\/](react|react-dom|react-router-dom|scheduler)[\\/]/.test(id)) {
              return 'vendor-react';
            }
            // PDF generation stack — heavy (~400 KB combined) but only used on
            // estimate save, contract sign, and field submission. Shared chunk
            // so the three lazy entrypoints do not each duplicate jspdf.
            if (/[\\/]node_modules[\\/](jspdf|jspdf-autotable|html2canvas|dompurify|canvg|fflate)[\\/]/.test(id)) {
              return 'vendor-pdf';
            }
            // Konva — only used by the estimator sketch pad.
            if (/[\\/]node_modules[\\/](konva|react-konva)[\\/]/.test(id)) {
              return 'vendor-konva';
            }
            // 3D stack — three + react-three-fiber + drei + all known transitive
            // deps. Including the transitive deps explicitly avoids the circular
            // chunk warning that occurs when they end up in a different chunk.
            // Only loaded in EstimatorShowroomView (inside EstimatorCalculatorView).
            if (/[\\/]node_modules[\\/](three|@react-three|maath|zustand|suspend-react|its-fine|tunnel-rat|@use-gesture|camera-controls|three-stdlib|three-mesh-bvh|meshline)[\\/]/.test(id)) {
              return 'vendor-three';
            }
            // UI utilities — icons, date formatting, markdown, sentry.
            if (/[\\/]node_modules[\\/](lucide-react|date-fns|react-markdown|@sentry)[\\/]/.test(id)) {
              return 'vendor-ui';
            }
            // @supabase is small and used app-wide — default Vite behavior is fine.
            // Everything else: let Rollup co-locate with importer (default).
            return undefined;
          },
        },
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
  };
});
