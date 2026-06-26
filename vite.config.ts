import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { VitePWA } from "vite-plugin-pwa";
import tailwindcss from "@tailwindcss/vite";
import fs from "fs";
import path from "path";

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    port: 5173,
    strictPort: true,
  },
  plugins: [
    vue(),
    tailwindcss(),
    {
      name: "html-transform",
      transformIndexHtml(html) {
        if (mode !== "production") {
          console.log("Removing robots meta tag for mode:", mode);
          return html.replace(
            '<meta name="robots" content="index, follow" />',
            '<meta name="robots" content="noindex, nofollow" />',
          );
        }
        return html;
      },
    },
    {
      name: "generate-robots-txt",
      closeBundle() {
        const distPath = path.resolve("dist");
        const robotsFile = path.resolve(distPath, "robots.txt");
        
        const productionContent = `User-agent: *\nAllow: /\nAllow: /plans\nAllow: /exercises\nAllow: /jthies73\nDisallow: /settings\n\nSitemap: https://yafa.app/sitemap.xml\n`;
        const developmentContent = `User-agent: *\nDisallow: /\n`;

        const content = mode === "production" ? productionContent : developmentContent;

        if (fs.existsSync(distPath)) {
          fs.writeFileSync(robotsFile, content);
          console.log(`[robots-txt] Generated robots.txt for mode: ${mode}`);

          if (mode !== "production") {
            const sitemapFile = path.resolve(distPath, "sitemap.xml");
            if (fs.existsSync(sitemapFile)) {
              fs.unlinkSync(sitemapFile);
              console.log(`[robots-txt] Removed sitemap.xml for mode: ${mode}`);
            }
          }
        }
      }
    },
    VitePWA({
      // "prompt": a new service worker stays in "waiting" until the user
      // explicitly triggers the update (the Update button in AppSidebar).
      registerType: "prompt",
      // Registration is driven by useRegisterSW() in usePwaUpdate.ts, so the
      // plugin must not also inject its own registration call.
      injectRegister: false,
      includeAssets: [
        "favicon.svg",
        "pwa-192x192.png",
        "pwa-512x512.png",
        "icons.svg",
      ],
      workbox: {
        // Everything is precached, so the app shell and assets are served
        // cache-first after the initial fetch — no network round-trip on load.
        // Navigation requests fall back to the precached index.html.
        globPatterns: ["**/*.{js,css,html,svg,png,ico}"],
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/^\/jthies73/],
        // Don't let a new worker take over until the user asks for it.
        skipWaiting: false,
        clientsClaim: true,
      },
      manifest: {
        name: "Y A F A",
        short_name: "Y A F A",
        description:
          "Yet Another Fitness App - Keep track of your workouts and measurements.",
        theme_color: "#08060d",
        background_color: "#08060d",
        display: "standalone",
        orientation: "portrait",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
}));
