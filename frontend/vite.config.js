import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

const outDirByMode = {
  // `npm run build:app` → served by the .NET API from its wwwroot folder.
  app: path.resolve(__dirname, "../backend/Sift.Api/wwwroot"),
  // `npm run build:preview` → one self-contained HTML file on demo data.
  preview: "dist-preview",
};

export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === "preview" ? [viteSingleFile()] : [])],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://localhost:5080", changeOrigin: true },
    },
  },
  build: {
    outDir: outDirByMode[mode] ?? "dist",
    emptyOutDir: true,
  },
}));
