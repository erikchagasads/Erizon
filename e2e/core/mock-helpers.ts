/**
 * ATENCAO: Este helper so deve ser usado em testes de componentes isolados.
 * Testes de comportamento real (full-behavior.spec.ts) NAO devem importar isto.
 * Manter aqui como fallback para ambientes sem Supabase configurado (CI local).
 */
export async function mockAPIs(
  page: {
    route: (
      url: string,
      handler: (route: {
        request: () => { url: () => string };
        fulfill: (options: { status: number; body: string }) => unknown;
        continue: () => unknown;
      }) => unknown,
    ) => Promise<void>;
  },
) {
  await page.route("**/api/**", async (route) => {
    const url = route.request().url();

    if (url.includes("/api/admin/stats")) {
      return route.fulfill({
        status: 200,
        body: JSON.stringify({
          usuarios: 100,
          faturamento: 5000,
        }),
      });
    }

    if (url.includes("/api/agente")) {
      return route.fulfill({
        status: 200,
        body: JSON.stringify({
          campanha: "gerada com sucesso",
        }),
      });
    }

    return route.continue();
  });
}
