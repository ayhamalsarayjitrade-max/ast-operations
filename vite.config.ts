// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  vite: {
    plugins: [VitePWA({
      strategies: "generateSW", filename: "sw.js", registerType: "autoUpdate",
      injectRegister: null, devOptions: { enabled: false },
      manifest: false,
      workbox: {
        globPatterns: ["**/*.{js,css,png,ico,webmanifest}"],
        navigateFallback: null,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          { urlPattern: ({ request, url }) => request.mode === "navigate" && !url.pathname.startsWith("/~oauth") && !url.pathname.startsWith("/api/"), handler: "NetworkFirst", options: { cacheName: "midan-pages", networkTimeoutSeconds: 3, expiration: { maxEntries: 20 } } },
          { urlPattern: ({ url, sameOrigin }) => sameOrigin && /\/assets\/.*-[a-zA-Z0-9_-]{8,}\.(js|css|png|jpg|woff2)$/.test(url.pathname), handler: "CacheFirst", options: { cacheName: "midan-assets", expiration: { maxEntries: 150 } } },
        ],
      },
    })],
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
