import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { reactFirst } from "./vite-plugin-react-first";

// https://vitejs.dev/config/
export default defineConfig({
  base: './', // CRITICAL: Use relative paths for Electron file:// protocol
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    // Removed reactFirst plugin - potentially conflicting with standard loading
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 5000,
    minify: true, // PRODUCTION: Re-enable minification for smaller file size and code obfuscation
    rollupOptions: {
      output: {
        // CRITICAL: Force EVERYTHING into a single file
        // This eliminates all race conditions, loading order issues, and circular dependency splits
        inlineDynamicImports: true,
        entryFileNames: 'assets/js/bundle.js',
        assetFileNames: 'assets/[ext]/[name].[ext]',
      },
    },
  },
});

