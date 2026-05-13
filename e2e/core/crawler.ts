import type { Page } from "@playwright/test";

const NAVIGATION_TIMEOUT_MS = 15_000;

function normalizeInternalHref(href: string): string | null {
  if (!href.startsWith("/") || href.startsWith("//") || href.startsWith("/api")) {
    return null;
  }

  const url = new URL(href, "http://localhost:3000");
  return `${url.pathname}${url.search}`;
}

async function navigateSafely(page: Page, path: string) {
  try {
    await page.goto(path, {
      waitUntil: "commit",
      timeout: NAVIGATION_TIMEOUT_MS * 2,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (!message.includes("ERR_ABORTED") && !message.includes("frame was detached")) {
      throw error;
    }

    await page.waitForLoadState("domcontentloaded", {
      timeout: NAVIGATION_TIMEOUT_MS * 2,
    }).catch(() => null);
  }

  const currentUrl = new URL(page.url());
  return `${currentUrl.pathname}${currentUrl.search}`;
}

export async function crawlSite(page: Page) {
  const visited = new Set<string>();
  const toVisit = ["/"];

  while (toVisit.length) {
    const path = toVisit.pop();
    if (!path || visited.has(path)) continue;

    const resolvedPath = await navigateSafely(page, path);
    visited.add(path);
    visited.add(resolvedPath);

    const hrefs = await page.locator("a[href]").evaluateAll((links) =>
      links
        .map((link) => link.getAttribute("href"))
        .filter((href): href is string => Boolean(href)),
    );

    for (const href of hrefs) {
      const normalized = normalizeInternalHref(href);
      if (normalized && !visited.has(normalized)) {
        toVisit.push(normalized);
      }
    }
  }

  return [...visited];
}
