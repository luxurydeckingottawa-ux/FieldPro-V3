import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [
      react(),
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || process.env.GEMINI_API_KEY),
      'process.env.API_KEY': JSON.stringify(env.API_KEY || process.env.API_KEY),
    },
    optimizeDeps: {
      include: ['motion/react', 'motion'],
    },
    build: {
      commonjsOptions: {
        include: [/motion/, /node_modules/],
      },
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-motion': ['motion', 'motion/react'],
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
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
