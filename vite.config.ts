import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  server: { host: true },

  // 🔴 Fuerza JSX de production (evita jsxDEV en runtime)
  esbuild: { jsxDev: false, jsx: "automatic" },

  build: {
    target: "es2019",
    minify: "esbuild",
    sourcemap: true,
    lib: {
      entry: path.resolve(__dirname, "src/define-element.tsx"),
      name: "ProntoChatWidget",
      formats: ["iife"],
      fileName: () => "pronto-chat-widget.iife.js",
    },
    rollupOptions: { output: { inlineDynamicImports: true } },
  },

  // React usa esto para activar su runtime prod
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
});
