import Link from "next/link";
import { ArrowLeft, ExternalLink, KeyRound, ShieldCheck } from "lucide-react";

export default function BenchmarksDocsPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0b] text-white">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <Link
          href="/api-keys"
          className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para API Keys
        </Link>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-6 sm:p-8">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-violet-300">
                Benchmark API
              </span>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">Documentacao da API de benchmarks</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                  Consulte benchmarks por nicho, plataforma e periodo usando uma API key criada dentro da Erizon.
                </p>
              </div>
            </div>

            <a
              href="/api/public/benchmarks"
              target="_blank"
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-200 transition-colors hover:border-zinc-500 hover:bg-zinc-900"
            >
              Abrir endpoint
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
                <KeyRound className="h-4 w-4 text-violet-300" />
                Autenticacao
              </div>
              <p className="text-sm leading-6 text-zinc-400">
                Envie a key no header <code className="rounded bg-zinc-950 px-1.5 py-0.5 text-zinc-200">x-erizon-key</code>
                {" "}ou no query param <code className="rounded bg-zinc-950 px-1.5 py-0.5 text-zinc-200">key</code>.
              </p>
            </section>

            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
                <ShieldCheck className="h-4 w-4 text-emerald-300" />
                Rate limit
              </div>
              <p className="text-sm leading-6 text-zinc-400">
                O limite por hora varia conforme o plano da key: <strong className="text-zinc-200">free 100</strong>,
                {" "}<strong className="text-zinc-200">pro 1000</strong> e{" "}
                <strong className="text-zinc-200">enterprise 10000</strong>.
              </p>
            </section>
          </div>

          <section className="mt-8">
            <h2 className="text-lg font-medium text-white">Endpoint</h2>
            <div className="mt-3 rounded-2xl border border-zinc-800 bg-black p-4 font-mono text-sm text-zinc-200">
              GET /api/public/benchmarks
            </div>
          </section>

          <section className="mt-8">
            <h2 className="text-lg font-medium text-white">Parametros</h2>
            <div className="mt-3 overflow-hidden rounded-2xl border border-zinc-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-900 text-zinc-300">
                  <tr>
                    <th className="px-4 py-3 font-medium">Campo</th>
                    <th className="px-4 py-3 font-medium">Valores</th>
                    <th className="px-4 py-3 font-medium">Padrao</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 bg-zinc-950 text-zinc-400">
                  <tr>
                    <td className="px-4 py-3 font-mono text-zinc-200">niche</td>
                    <td className="px-4 py-3">texto livre para filtrar nicho</td>
                    <td className="px-4 py-3">opcional</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-mono text-zinc-200">metric</td>
                    <td className="px-4 py-3">cpl, roas, ctr, frequency, all</td>
                    <td className="px-4 py-3">all</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-mono text-zinc-200">period</td>
                    <td className="px-4 py-3">7d, 30d, 90d</td>
                    <td className="px-4 py-3">30d</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-mono text-zinc-200">platform</td>
                    <td className="px-4 py-3">meta, google, tiktok, linkedin, all</td>
                    <td className="px-4 py-3">meta</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-mono text-zinc-200">percentile</td>
                    <td className="px-4 py-3">p25, p50, p75, all</td>
                    <td className="px-4 py-3">all</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-8 grid gap-4">
            <div>
              <h2 className="text-lg font-medium text-white">Exemplo com curl</h2>
              <pre className="mt-3 overflow-x-auto rounded-2xl border border-zinc-800 bg-black p-4 text-xs leading-6 text-zinc-300">{`curl "https://app.erizonai.com.br/api/public/benchmarks?niche=arquitetura&metric=cpl&period=30d&platform=meta" \\
  -H "x-erizon-key: SUA_KEY_AQUI"`}</pre>
            </div>

            <div>
              <h2 className="text-lg font-medium text-white">Exemplo de resposta</h2>
              <pre className="mt-3 overflow-x-auto rounded-2xl border border-zinc-800 bg-black p-4 text-xs leading-6 text-zinc-300">{`{
  "ok": true,
  "query": {
    "niche": "arquitetura",
    "metric": "cpl",
    "period": "30d",
    "platform": "meta",
    "percentile": "all"
  },
  "count": 1,
  "benchmarks": [
    {
      "niche": "arquitetura",
      "platform": "meta",
      "period": "30d",
      "sample_size": 18,
      "metrics": {
        "cpl": {
          "p25": 24.7,
          "p50": 31.9,
          "p75": 44.3,
          "unit": "BRL"
        }
      }
    }
  ],
  "generated_at": "2026-04-15T09:00:00.000Z",
  "docs": "/docs/api/benchmarks"
}`}</pre>
            </div>
          </section>

          <section className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
              <h2 className="text-lg font-medium text-white">Codigos de status</h2>
              <div className="mt-3 space-y-2 text-sm text-zinc-400">
                <p><code className="rounded bg-zinc-950 px-1.5 py-0.5 text-zinc-200">200</code> consulta processada.</p>
                <p><code className="rounded bg-zinc-950 px-1.5 py-0.5 text-zinc-200">401</code> key ausente ou invalida.</p>
                <p><code className="rounded bg-zinc-950 px-1.5 py-0.5 text-zinc-200">429</code> limite horario excedido.</p>
                <p><code className="rounded bg-zinc-950 px-1.5 py-0.5 text-zinc-200">500</code> erro interno temporario.</p>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
              <h2 className="text-lg font-medium text-white">Boas praticas</h2>
              <div className="mt-3 space-y-2 text-sm leading-6 text-zinc-400">
                <p>Use cache de 15 a 60 minutos para dashboards externos.</p>
                <p>Evite expor sua API key no navegador; prefira chamadas server-side.</p>
                <p>Use <code className="rounded bg-zinc-950 px-1.5 py-0.5 text-zinc-200">sample_size</code> para decidir se o benchmark tem massa suficiente.</p>
              </div>
            </div>
          </section>

          <section className="mt-8">
            <h2 className="text-lg font-medium text-white">Exemplo em TypeScript</h2>
            <pre className="mt-3 overflow-x-auto rounded-2xl border border-zinc-800 bg-black p-4 text-xs leading-6 text-zinc-300">{`const res = await fetch(
  "https://app.erizonai.com.br/api/public/benchmarks?niche=imobiliario&period=30d&platform=meta",
  { headers: { "x-erizon-key": process.env.ERIZON_API_KEY! } }
);

if (!res.ok) throw new Error("Falha ao buscar benchmark");

const data = await res.json();
const cplMediano = data.benchmarks[0]?.metrics?.cpl?.p50;`}</pre>
          </section>

          <section className="mt-8 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 text-sm text-amber-100">
            Use esta API para integracoes com n8n, dashboards externos, agentes e automacoes que precisem comparar
            uma conta com a media do nicho sem depender da interface da Erizon.
          </section>
        </div>
      </div>
    </main>
  );
}
