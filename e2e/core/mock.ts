export async function mockAPIs(page: any) {

  await page.route('**/api/**', async (route: any) => {
    const url = route.request().url();

    if (url.includes('/api/admin/stats')) {
      return route.fulfill({
        status: 200,
        body: JSON.stringify({
          usuarios: 100,
          faturamento: 5000,
        }),
      });
    }

    if (url.includes('/api/agente')) {
      return route.fulfill({
        status: 200,
        body: JSON.stringify({
          campanha: 'gerada com sucesso',
        }),
      });
    }

    return route.continue();
  });

}
