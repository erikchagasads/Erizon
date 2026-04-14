"use client";

type PushConfigResponse = {
  vapidPublicKey: string | null;
  supported: boolean;
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function ensureBrowserPushSubscription(source = "app") {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { ok: false, reason: "unsupported" as const };
  }

  const registration =
    (await navigator.serviceWorker.getRegistration("/erizon-push-sw.js")) ??
    (await navigator.serviceWorker.register("/erizon-push-sw.js"));

  const configRes = await fetch("/api/push-subscriptions", { cache: "no-store" });
  const config = (await configRes.json()) as PushConfigResponse;

  if (!config.vapidPublicKey) {
    return { ok: true, reason: "missing_vapid" as const };
  }

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(config.vapidPublicKey),
    });
  }

  await fetch("/api/push-subscriptions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subscription,
      source,
      device_label: navigator.platform || "browser",
    }),
  });

  window.localStorage.setItem("erizon_browser_push", "enabled");
  return { ok: true, reason: "subscribed" as const };
}

export async function removeBrowserPushSubscription() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration("/erizon-push-sw.js");
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;

  await fetch("/api/push-subscriptions", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  });

  await subscription.unsubscribe().catch(() => {});
  window.localStorage.removeItem("erizon_browser_push");
}
