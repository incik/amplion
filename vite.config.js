import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

/** @type {import('vite').UserConfig} */
const baseConfig = {
  plugins: [react()],
  base: "./",
  build: {
    outDir: "renderer_dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src/renderer"),
    },
  },
};

// Index (main) renderer is injected via executeJavaScript() - must be a single
// self-contained file (no import statements). Settings loads via HTML script
// type="module" so it can use chunks.
const mode = process.env.VITE_BUILD_MODE || "all";

export default defineConfig({
  ...baseConfig,
  build: {
    ...baseConfig.build,
    emptyOutDir: mode !== "settings",
    rollupOptions: {
      ...baseConfig.build.rollupOptions,
      input:
        mode === "index"
          ? path.resolve(__dirname, "src/renderer/index.html")
          : mode === "settings"
            ? { settings: path.resolve(__dirname, "src/settings/index.html") }
            : {
                index: path.resolve(__dirname, "src/renderer/index.html"),
                settings: path.resolve(__dirname, "src/settings/index.html"),
              },
      output: {
        ...baseConfig.build.rollupOptions.output,
        inlineDynamicImports: mode === "index",
      },
    },
  },
});
