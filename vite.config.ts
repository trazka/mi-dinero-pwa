import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
const base = "/mi-dinero-pwa/";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      scope: base,
      includeAssets: ["icon-v4-192.png", "apple-touch-icon-v4.png", "theme.js"],
      manifest: {
        name: "Mi dinero",
        short_name: "Mi dinero",
        description: "Tus finanzas, en tus manos.",
        lang: "es-MX",
        id: base,
        start_url: base,
        scope: base,
        display: "standalone",
        background_color: "#f5f7f4",
        theme_color: "#124c38",
        icons: [
          {
            src: `${base}icon-v4-192.png`,
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: `${base}icon-v4-512.png`,
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        importScripts: [`${base}sw-claims.js`],
        clientsClaim: true,
        globPatterns: ["**/*.{js,css,html,png,svg,ico,woff2}"],
        navigateFallback: `${base}index.html`,
        navigateFallbackAllowlist: [/^\/mi-dinero-pwa(?:\/|$)/],
      },
    }),
  ],
  base,
});
