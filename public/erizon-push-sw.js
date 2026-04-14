self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
  if (!event.data || event.data.type !== "ERIZON_SHOW_NOTIFICATION") return;

  const payload = event.data.payload || {};
  self.registration.showNotification(payload.title || "Erizon", {
    body: payload.body || "Seu resumo diario esta pronto.",
    icon: "/logo-erizon.png",
    badge: "/logo-erizon.png",
    data: {
      url: payload.url || "/pulse",
    },
  });
});

self.addEventListener("push", (event) => {
  const payload = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(payload.title || "Erizon", {
      body: payload.body || "Seu resumo diario esta pronto.",
      icon: "/logo-erizon.png",
      badge: "/logo-erizon.png",
      data: {
        url: payload.url || "/pulse",
      },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  const url = event.notification.data?.url || "/pulse";
  event.notification.close();
  event.waitUntil(self.clients.openWindow(url));
});
