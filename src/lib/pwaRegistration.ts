import { registerSW } from "virtual:pwa-register";

const APP_SW_PATH = "/sw.js";

function isPreviewHost(hostname: string) {
  return (
    hostname.startsWith("id-preview--") ||
    hostname.startsWith("preview--") ||
    hostname === "lovableproject.com" ||
    hostname.endsWith(".lovableproject.com") ||
    hostname === "lovableproject-dev.com" ||
    hostname.endsWith(".lovableproject-dev.com") ||
    hostname === "beta.lovable.dev" ||
    hostname.endsWith(".beta.lovable.dev")
  );
}

async function unregisterAppWorkers() {
  if (!("serviceWorker" in navigator)) return;

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registrations
      .filter((registration) => {
        const workerUrl =
          registration.active?.scriptURL ??
          registration.waiting?.scriptURL ??
          registration.installing?.scriptURL ??
          "";
        return workerUrl.endsWith(APP_SW_PATH);
      })
      .map((registration) => registration.unregister()),
  );
}

export function registerAppServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  const swDisabled = new URLSearchParams(window.location.search).get("sw") === "off";
  const shouldRegister =
    import.meta.env.PROD &&
    window.self === window.top &&
    !isPreviewHost(window.location.hostname) &&
    !swDisabled;

  if (!shouldRegister) {
    void unregisterAppWorkers();
    return;
  }

  const updateSW = registerSW({ immediate: true });
  const checkForUpdate = () => void updateSW(true);

  window.addEventListener("focus", checkForUpdate);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") checkForUpdate();
  });
}