import { afterEach, describe, expect, it, vi } from "vitest";
import { installUpdateRecovery, isAppFileLoadError, retryAppFiles, updateRecovery } from "@/lib/update-recovery";

afterEach(() => updateRecovery.hide());

describe("Update recovery", () => {
  it.each(["Importing a module script failed.", "Failed to fetch dynamically imported module: /assets/page.js", "Unable to preload CSS for /assets/page.css"])("recognizes cached-file failures: %s", (message) => {
    expect(isAppFileLoadError(new Error(message))).toBe(true);
  });
  it("does not classify ordinary application failures as update failures", () => {
    expect(isAppFileLoadError(new Error("Permission denied"))).toBe(false);
  });
  it("intercepts failed preloads without navigating or replacing unsaved input", () => {
    const cleanup = installUpdateRecovery(window);
    const input = document.createElement("input");
    input.value = "Unsaved customer order";
    document.body.append(input);
    const event = new Event("vite:preloadError", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(updateRecovery.getSnapshot().visible).toBe(true);
    expect(input.isConnected).toBe(true);
    expect(input.value).toBe("Unsaved customer order");
    input.remove();
    cleanup();
  });
  it("runs an in-place retry without changing open work", async () => {
    const retry = vi.fn().mockResolvedValue(undefined);
    expect(await retryAppFiles(retry)).toBe(true);
    expect(retry).toHaveBeenCalledOnce();
  });
  it("keeps recovery available when another file fails during retry", async () => {
    expect(await retryAppFiles(async () => updateRecovery.show())).toBe(false);
    expect(updateRecovery.getSnapshot().visible).toBe(true);
  });
  it("reports a rejected retry without reloading", async () => {
    expect(await retryAppFiles(async () => { throw new Error("offline"); })).toBe(false);
  });
});