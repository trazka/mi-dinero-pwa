import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["icon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Mi dinero",
        short_name: "Mi dinero",
        description: "Tus finanzas, en tus manos.",
        lang: "es-MX",
        start_url: "./",
        scope: "./",
        display: "standalone",
        background_color: "#f5f7f4",
        theme_color: "#124c38",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        clientsClaim: true,
        globPatterns: ["**/*.{js,css,html,png,svg,ico,woff2}"],
        navigateFallback: "index.html",
      },
    }),
  ],
  base: "./",
});
