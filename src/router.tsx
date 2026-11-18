import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { installUpdateRecovery } from "./lib/update-recovery";

if (typeof window !== "undefined") installUpdateRecovery(window);

export const getRouter = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, gcTime: 10 * 60_000, retry: 1, refetchOnWindowFocus: false } } });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultPendingMs: 100,
  });

  return router;
};
