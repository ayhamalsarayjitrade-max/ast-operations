import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

// Stale chunks after a redeploy ("Importing a module script failed" in Safari,
// "Failed to fetch dynamically imported module" in Chrome): reload once.
if (typeof window !== "undefined" && !(window as any).__chunkReloadHook) {
  (window as any).__chunkReloadHook = true;
  const reloadOnce = () => {
    const k = "chunk-reload-at";
    const last = Number(sessionStorage.getItem(k) ?? 0);
    if (Date.now() - last < 10_000) return;
    sessionStorage.setItem(k, String(Date.now()));
    window.location.reload();
  };
  window.addEventListener("vite:preloadError", (e) => { e.preventDefault(); reloadOnce(); });
  window.addEventListener("unhandledrejection", (e) => {
    const msg = String((e.reason as any)?.message ?? e.reason ?? "");
    if (/Importing a module script failed|dynamically imported module|error loading dynamically/i.test(msg)) reloadOnce();
  });
}

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
