import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5200,
    strictPort: false,
  },
  build: {
    outDir: 'dist',
    // Remove console.log/debug in production builds; keep console.error for monitoring
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // React core — most stable, longest cache life
          if (id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/react-router-dom/') ||
              id.includes('node_modules/scheduler/')) {
            return 'react-core';
          }
          // Animation library — large, changes rarely
          if (id.includes('node_modules/framer-motion/')) {
            return 'motion';
          }
          // Icon library — large, changes rarely
          if (id.includes('node_modules/lucide-react/')) {
            return 'lucide';
          }
          // Radix UI primitives — UI foundation
          if (id.includes('node_modules/@radix-ui/')) {
            return 'radix';
          }
          // Auth client
          if (id.includes('node_modules/better-auth/')) {
            return 'auth';
          }
          // Zod validation
          if (id.includes('node_modules/zod/')) {
            return 'validation';
          }
        },
      },
    },
  },
});
