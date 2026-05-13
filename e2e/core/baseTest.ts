import { test as base, expect } from "@playwright/test";

export { expect };

function shouldIgnoreRuntimeError(message: string) {
  return (
    message.includes("TypeError: Failed to fetch") ||
    message.includes("Failed to execute 'writeText' on 'Clipboard'") ||
    message.includes("Failed to load resource: the server responded with a status of 401") ||
    message.includes("Failed to load resource: the server responded with a status of 403")
  );
}

function shouldIgnoreResponseStatus(status: number) {
  return status === 401 || status === 403;
}

export const test = base.extend({
  page: async ({ page }, runPageFixture) => {
    const errors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() !== "error") return;

      const text = msg.text();
      if (!shouldIgnoreRuntimeError(text)) {
        errors.push(text);
      }
    });

    page.on("pageerror", (err) => {
      if (!shouldIgnoreRuntimeError(err.message)) {
        errors.push(err.message);
      }
    });

    page.on("response", (res) => {
      if (res.status() >= 400 && !shouldIgnoreResponseStatus(res.status())) {
        errors.push(`API error: ${res.url()} - ${res.status()}`);
      }
    });

    await runPageFixture(page);

    if (errors.length) {
      throw new Error(errors.join("\n"));
    }
  },
});
