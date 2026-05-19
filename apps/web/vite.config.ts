import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    },
    // Ensure Vite resolves package.json exports (subpath exports)
    // This is needed for @neondatabase/neon-js/auth to resolve correctly
    conditions: ["import", "module", "default"]
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
  },
})
