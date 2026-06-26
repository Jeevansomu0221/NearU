import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  base: "/business/",
  resolve: {
    alias: {
      "@vyaha/api-client": path.resolve(__dirname, "../../packages/api-client/src")
    }
  },
  server: {
    port: 5175,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true
      }
    }
  }
});
