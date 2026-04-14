"use client";

import { useEffect } from "react";
import { ensureBrowserPushSubscription } from "@/lib/browser-push";

export function PushBootstrap() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/erizon-push-sw.js").catch(() => {});

    if (
      window.localStorage.getItem("erizon_browser_push") === "enabled" &&
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      void ensureBrowserPushSubscription("bootstrap").catch(() => {});
    }
  }, []);

  return null;
}
