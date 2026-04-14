"use client";

export async function trackProductEvent(
  eventName: string,
  source: string,
  properties?: Record<string, unknown>
) {
  try {
    await fetch("/api/product-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_name: eventName,
        source,
        properties: properties ?? {},
      }),
    });
  } catch {}
}
