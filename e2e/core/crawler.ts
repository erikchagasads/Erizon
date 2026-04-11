export async function crawlSite(page: any) {
  const visited = new Set<string>();
  const toVisit = ['/'];

  while (toVisit.length) {
    const path = toVisit.pop();
    if (!path || visited.has(path)) continue;

    visited.add(path);

    await page.goto(path, { waitUntil: 'domcontentloaded' });

    const links = page.locator('a');
    const count = await links.count();

    for (let i = 0; i < count; i++) {
      try {
        const link = links.nth(i);
        const href = await link.getAttribute('href');

        if (href && href.startsWith('/') && !visited.has(href)) {
          toVisit.push(href);
        }
      } catch {}
    }
  }

  return visited;
}
