import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig(() => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, ".")
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (/node_modules\/(onnxruntime-web|@ricky0123\/vad-react|@ricky0123\/vad-web)\//.test(id)) {
            return "audio-inference";
          }
          if (/node_modules\/(firebase|@firebase)\//.test(id)) {
            return "firebase";
          }
          if (/node_modules\/(recharts|d3-[^/]+)\//.test(id)) {
            return "charts";
          }
          if (/node_modules\/(motion|framer-motion)\//.test(id)) {
            return "motion";
          }
          if (/node_modules\/lucide-react\//.test(id)) {
            return "icons";
          }
          if (/node_modules\/@google\/genai\//.test(id)) {
            return "genai";
          }
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) {
            return "react-vendor";
          }
        }
      }
    }
  },
  server: {
    // Keep the existing AI Studio option without exposing server secrets.
    hmr: process.env.DISABLE_HMR !== "true"
  }
}));
