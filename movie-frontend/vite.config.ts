import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootDir, "");
  // Used only by `npm run dev` / `npm run preview` when VITE_API_BASE_URL is left empty
  // (browser then calls same-origin /api/... and Vite forwards it to the backend).
  const proxyTarget = env.VITE_DEV_PROXY_TARGET || "http://localhost:8080";

  return {
    plugins: [react()],
    resolve: { alias: { "@": path.resolve(rootDir, "src") } },
    server: {
      port: 5173,
      proxy: { "/api": { target: proxyTarget, changeOrigin: true } },
    },
    preview: {
      port: 4173,
      proxy: { "/api": { target: proxyTarget, changeOrigin: true } },
    },
    build: {
      sourcemap: false,
      chunkSizeWarningLimit: 700,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ["react", "react-dom", "react-router-dom"],
            state: ["@reduxjs/toolkit", "react-redux"],
            motion: ["framer-motion"],
          },
        },
      },
    },
  };
});
