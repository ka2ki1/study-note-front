import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "Study Note",
        short_name: "StudyNote",
        description: "勉強した内容を思い出すためのノートアプリ",
        theme_color: "#2563eb",
        background_color: "#f3f4f6",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/favicon.svg",
            sizes: "192x192",
            type: "image/svg+xml",
          },
          {
            src: "/favicon.svg",
            sizes: "512x512",
            type: "image/svg+xml",
          },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^http:\/\/localhost:8081\/api\/study-notes/,
            handler: "NetworkFirst",
            options: {
              cacheName: "study-notes-api-cache",
            },
          },
        ],
      },
    }),
  ],
});
