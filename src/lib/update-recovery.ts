type RecoveryState = { visible: boolean; failure: number };

let state: RecoveryState = { visible: false, failure: 0 };
const listeners = new Set<() => void>();
const serverState: RecoveryState = { visible: false, failure: 0 };

export function isAppFileLoadError(error: unknown): boolean {
  const message = typeof error === "string" ? error : (error as { message?: unknown } | null)?.message;
  return typeof message === "string" && /Importing a module script failed|Failed to fetch dynamically imported module|error loading dynamically imported module|Loading chunk .* failed|Unable to preload CSS/i.test(message);
}

export const updateRecovery = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
  getSnapshot: () => state,
  getServerSnapshot: () => serverState,
  show() {
    state = { visible: true, failure: state.failure + 1 };
    listeners.forEach((listener) => listener());
  },
  hide() {
    state = { ...state, visible: false };
    listeners.forEach((listener) => listener());
  },
};

// Keep the current document and its form state alive. Only a deliberate,
// separately confirmed refresh may replace the document.
export function installUpdateRecovery(target: Window) {
  const preload = (event: Event) => {
    event.preventDefault();
    updateRecovery.show();
  };
  const rejection = (event: PromiseRejectionEvent) => {
    if (!isAppFileLoadError(event.reason)) return;
    event.preventDefault();
    updateRecovery.show();
  };
  target.addEventListener("vite:preloadError", preload);
  target.addEventListener("unhandledrejection", rejection);
  return () => {
    target.removeEventListener("vite:preloadError", preload);
    target.removeEventListener("unhandledrejection", rejection);
  };
}

export async function retryAppFiles(retry: () => Promise<unknown>): Promise<boolean> {
  const failure = state.failure;
  try {
    await retry();
    return state.failure === failure;
  } catch {
    return false;
  }
}