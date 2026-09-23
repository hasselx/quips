const APP_SW_PATHS = ["/sw.js", "/service-worker.js"];

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
        return APP_SW_PATHS.some((path) => workerUrl.endsWith(path));
      })
      .map((registration) => registration.unregister()),
  );
}

export function registerAppServiceWorker() {
  // Offline caching is disabled: previously cached app shells were serving
  // outdated pages. Any lingering app worker is removed here.
  void unregisterAppWorkers();
}
