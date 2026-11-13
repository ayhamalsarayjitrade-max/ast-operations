export function isOfflinePreview(host: string, iframe: boolean, production: boolean, disabled: boolean) {
  host = host.toLowerCase();
  const parts = host.split(".");
  const label = parts[0] || "";
  const lovableHost = /\.(lovable\.app|gpt-eng\.com|gptengineer\.run)$/.test(host);
  return !production || iframe || disabled ||
    (lovableHost && (/^(?:id-preview|preview)(?:-[a-z0-9]+)?--.+$/.test(label) || /^project--.+-dev$/.test(label))) ||
    ["lovableproject.com", "lovableproject-dev.com", "beta.lovable.dev"].some(domain => host === domain || host.endsWith(`.${domain}`));
}
export async function setupOfflineShell() {
  if (!("serviceWorker" in navigator)) return;
  if (isOfflinePreview(window.location.hostname, window.top !== window.self, import.meta.env.PROD, new URLSearchParams(window.location.search).get("sw") === "off")) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.filter(r => [r.active, r.waiting, r.installing].some(w => w && new URL(w.scriptURL).pathname === "/sw.js")).map(r => r.unregister()));
    return;
  }
  const { registerSW } = await import("virtual:pwa-register");
  registerSW({ immediate: true });
}