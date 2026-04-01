"use client";

import { useState } from "react";
import {
  ArrowRight, Loader2, ChevronRight, TrendingUp, Zap,
  Target, AlertTriangle, CheckCircle2, BarChart3, Lightbulb,
  Clock, DollarSign, Megaphone, Star,
} from "lucide-react";

// ── Tipos ──────────────────────────────────────────────────────────────────────
interface Alavanca {
  titulo: string;
  descricao: string;
  impacto: string;
  prazo: string;
  como_comecar: string;
}

interface CanalRec {
  canal: string;
  por_que_para_este_nicho: string;
  como_usar: string;
}

interface Diagnostico {
  titulo_diagnostico: string;
  resumo_executivo: string;
  score_growth: number;
  principais_alavancas: Alavanca[];
  plano_30_dias: string[];
  canais_recomendados: CanalRec[];
  alerta_critico: string;
  proximos_passos: string[];
  frase_motivacional: string;
}

// ── Dados do formulário ────────────────────────────────────────────────────────
const NICHOS = [
  "E-commerce / Loja virtual",
  "Imobiliária / Corretor",
  "Clínica / Saúde",
  "Restaurante / Food",
  "Infoproduto / Curso online",
  "SaaS / Software",
  "Serviço local (salão, academia, etc.)",
  "Consultoria / Agência",
  "Varejo físico",
  "Educação / Escola",
  "Indústria / B2B",
  "Outro",
];

const MODELOS = ["B2C (venda direto ao consumidor)", "B2B (venda para empresas)", "B2B2C", "Marketplace", "Assinatura/Recorrência"];

const FATURAMENTOS = [
  "Ainda não faturando (pré-revenue)",
  "Até R$ 10 mil/mês",
  "R$ 10 mil – R$ 50 mil/mês",
  "R$ 50 mil – R$ 150 mil/mês",
  "R$ 150 mil – R$ 500 mil/mês",
  "Acima de R$ 500 mil/mês",
];

const CANAIS_OPTIONS = [
  "Instagram / Facebook orgânico",
  "Meta Ads (Facebook/Instagram pago)",
  "Google Ads",
  "SEO / Blog",
  "WhatsApp",
  "TikTok",
  "E-mail marketing",
  "Indicação / boca a boca",
  "YouTube",
  "LinkedIn",
  "Nenhum canal estruturado",
];

const ORCAMENTOS = [
  "Sem orçamento definido",
  "Até R$ 500/mês",
  "R$ 500 – R$ 2.000/mês",
  "R$ 2.000 – R$ 5.000/mês",
  "R$ 5.000 – R$ 15.000/mês",
  "Acima de R$ 15.000/mês",
];

// ── Componente principal ───────────────────────────────────────────────────────
export default function DiagnosticoGrowth() {
  const [passo, setPasso] = useState(0);
  const [loading, setLoading] = useState(false);
  const [diagnostico, setDiagnostico] = useState<Diagnostico | null>(null);
  const [erro, setErro] = useState("");

  const [form, setForm] = useState({
    nome: "",
    email: "",
    nicho: "",
    nichoCustom: "",
    modelo_negocio: "",
    faturamento: "",
    canais: [] as string[],
    desafio: "",
    meta: "",
    orcamento: "",
  });

  function set(field: string, value: string | string[]) {
    setForm((f) => ({ ...f, [field]: value }));
    setErro("");
  }

  function toggleCanal(canal: string) {
    set(
      "canais",
      form.canais.includes(canal)
        ? form.canais.filter((c) => c !== canal)
        : [...form.canais, canal]
    );
  }

  const TOTAL_PASSOS = 6;
  const progresso = Math.round((passo / TOTAL_PASSOS) * 100);

  async function enviar() {
    setLoading(true);
    setErro("");
    try {
      const res = await fetch("/api/growth-diagnostico", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          canais: form.canais.join(", ") || "Nenhum",
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Erro ao gerar diagnóstico");
      setDiagnostico(json.diagnostico);
      setPasso(7);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  function avancar() {
    if (passo === 0 && (!form.nome.trim() || !form.email.includes("@"))) {
      setErro("Preencha seu nome e e-mail corretamente.");
      return;
    }
    if (passo === 1 && !form.nicho) { setErro("Selecione o seu nicho."); return; }
    if (passo === 1 && form.nicho === "Outro" && !form.nichoCustom.trim()) {
      setErro("Descreva o seu nicho."); return;
    }
    if (passo === 2 && (!form.modelo_negocio || !form.faturamento)) {
      setErro("Preencha todos os campos."); return;
    }
    if (passo === 4 && (!form.desafio.trim() || !form.meta.trim())) {
      setErro("Descreva seu desafio e meta."); return;
    }
    if (passo === 5) { enviar(); return; }
    setPasso((p) => p + 1);
  }

  // ── Tela de resultado ────────────────────────────────────────────────────────
  if (passo === 7 && diagnostico) {
    return <ResultadoDiagnostico diagnostico={diagnostico} nome={form.nome} />;
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center gap-6 px-4">
        <div className="w-16 h-16 rounded-2xl bg-purple-600/20 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-white text-xl font-semibold mb-2">Analisando seu negócio…</p>
          <p className="text-white/40 text-sm max-w-xs">
            Nosso analista de growth está mapeando as melhores oportunidades para o seu nicho.
          </p>
        </div>
        <div className="flex gap-1.5 mt-4">
          {["Mapeando nicho", "Identificando gaps", "Construindo plano"].map((t, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs text-white/30">
              {i > 0 && <span className="text-white/10">›</span>}
              <span>{t}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Formulário ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
      {/* Hero / Header */}
      {passo === 0 && (
        <div className="pt-16 pb-8 px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-purple-600/10 border border-purple-600/20 rounded-full px-4 py-1.5 mb-6">
            <Zap className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-purple-300 text-xs font-medium">Diagnóstico gratuito em 2 minutos</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4 leading-tight">
            Descubra o que está<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
              travando o seu crescimento
            </span>
          </h1>
          <p className="text-white/50 text-base max-w-md mx-auto">
            Responda 6 perguntas rápidas e receba um diagnóstico personalizado com o plano de ação para o seu negócio.
          </p>
        </div>
      )}

      {/* Barra de progresso */}
      {passo > 0 && passo < 7 && (
        <div className="pt-8 px-4 max-w-lg mx-auto w-full">
          <div className="flex justify-between items-center mb-2">
            <span className="text-white/30 text-xs">Etapa {passo} de {TOTAL_PASSOS}</span>
            <span className="text-purple-400 text-xs font-medium">{progresso}%</span>
          </div>
          <div className="h-1 bg-white/[0.06] rounded-full">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
              style={{ width: `${progresso}%` }}
            />
          </div>
        </div>
      )}

      {/* Conteúdo do passo */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg">

          {/* Passo 0: Dados pessoais */}
          {passo === 0 && (
            <Card titulo="Vamos começar" subtitulo="Como posso te chamar?">
              <Input label="Seu nome" value={form.nome} onChange={(v) => set("nome", v)} placeholder="João Silva" />
              <Input label="Seu e-mail" value={form.email} onChange={(v) => set("email", v)} placeholder="joao@empresa.com" type="email" />
            </Card>
          )}

          {/* Passo 1: Nicho */}
          {passo === 1 && (
            <Card titulo="Seu negócio" subtitulo="Qual é o seu nicho ou segmento?">
              <div className="grid grid-cols-2 gap-2">
                {NICHOS.map((n) => (
                  <button
                    key={n}
                    onClick={() => set("nicho", n)}
                    className={`text-left text-sm px-3 py-3 rounded-xl border transition-all ${
                      form.nicho === n
                        ? "border-purple-500 bg-purple-500/10 text-white"
                        : "border-white/10 text-white/50 hover:border-white/20 hover:text-white/70"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              {form.nicho === "Outro" && (
                <Input
                  label="Descreva seu nicho"
                  value={form.nichoCustom}
                  onChange={(v) => set("nichoCustom", v)}
                  placeholder="Ex: petshop, advocacia, etc."
                />
              )}
            </Card>
          )}

          {/* Passo 2: Modelo e faturamento */}
          {passo === 2 && (
            <Card titulo="Modelo e tamanho" subtitulo="Como seu negócio opera?">
              <div className="space-y-3">
                <label className="text-white/60 text-sm">Modelo de negócio</label>
                <div className="space-y-2">
                  {MODELOS.map((m) => (
                    <button
                      key={m}
                      onClick={() => set("modelo_negocio", m)}
                      className={`w-full text-left text-sm px-4 py-3 rounded-xl border transition-all ${
                        form.modelo_negocio === m
                          ? "border-purple-500 bg-purple-500/10 text-white"
                          : "border-white/10 text-white/50 hover:border-white/20"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-3 mt-4">
                <label className="text-white/60 text-sm">Faturamento mensal atual</label>
                <div className="space-y-2">
                  {FATURAMENTOS.map((f) => (
                    <button
                      key={f}
                      onClick={() => set("faturamento", f)}
                      className={`w-full text-left text-sm px-4 py-3 rounded-xl border transition-all ${
                        form.faturamento === f
                          ? "border-purple-500 bg-purple-500/10 text-white"
                          : "border-white/10 text-white/50 hover:border-white/20"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Passo 3: Canais */}
          {passo === 3 && (
            <Card titulo="Marketing atual" subtitulo="Quais canais você usa hoje? (pode marcar vários)">
              <div className="grid grid-cols-2 gap-2">
                {CANAIS_OPTIONS.map((c) => (
                  <button
                    key={c}
                    onClick={() => toggleCanal(c)}
                    className={`text-left text-sm px-3 py-3 rounded-xl border transition-all ${
                      form.canais.includes(c)
                        ? "border-purple-500 bg-purple-500/10 text-white"
                        : "border-white/10 text-white/50 hover:border-white/20 hover:text-white/70"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </Card>
          )}

          {/* Passo 4: Desafio e meta */}
          {passo === 4 && (
            <Card titulo="Desafio e objetivo" subtitulo="O que está travando e onde quer chegar?">
              <Textarea
                label="Qual é o seu maior desafio de crescimento hoje?"
                value={form.desafio}
                onChange={(v) => set("desafio", v)}
                placeholder="Ex: não consigo gerar leads qualificados, meu CAC tá alto, não tenho previsibilidade de receita..."
              />
              <Textarea
                label="Qual é a sua meta para os próximos 3 meses?"
                value={form.meta}
                onChange={(v) => set("meta", v)}
                placeholder="Ex: dobrar o faturamento, chegar a 100 clientes, lançar meu produto..."
              />
            </Card>
          )}

          {/* Passo 5: Orçamento */}
          {passo === 5 && (
            <Card titulo="Investimento em marketing" subtitulo="Quanto você investe (ou pode investir) por mês?">
              <div className="space-y-2">
                {ORCAMENTOS.map((o) => (
                  <button
                    key={o}
                    onClick={() => set("orcamento", o)}
                    className={`w-full text-left text-sm px-4 py-3 rounded-xl border transition-all ${
                      form.orcamento === o
                        ? "border-purple-500 bg-purple-500/10 text-white"
                        : "border-white/10 text-white/50 hover:border-white/20"
                    }`}
                  >
                    {o}
                  </button>
                ))}
              </div>
              <div className="mt-4 p-4 bg-purple-600/10 border border-purple-600/20 rounded-xl">
                <p className="text-purple-300 text-sm">
                  Tudo pronto! Ao clicar em continuar, nossa IA vai analisar suas respostas e montar um diagnóstico personalizado para o seu negócio.
                </p>
              </div>
            </Card>
          )}

          {/* Erro */}
          {erro && (
            <p className="text-red-400 text-sm mt-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> {erro}
            </p>
          )}

          {/* Botão avançar */}
          <button
            onClick={avancar}
            disabled={loading}
            className="mt-6 w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-2xl py-4 transition-all disabled:opacity-50"
          >
            {passo === 5 ? (
              <><Zap className="w-4 h-4" /> Gerar meu diagnóstico</>
            ) : (
              <><span>Continuar</span><ArrowRight className="w-4 h-4" /></>
            )}
          </button>

          {passo > 0 && (
            <button
              onClick={() => setPasso((p) => p - 1)}
              className="mt-3 w-full text-white/30 text-sm hover:text-white/50 transition-colors"
            >
              ← Voltar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Componentes auxiliares ─────────────────────────────────────────────────────
function Card({ titulo, subtitulo, children }: { titulo: string; subtitulo: string; children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">{titulo}</h2>
        <p className="text-white/40 text-sm">{subtitulo}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Input({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-white/60 text-sm">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 text-sm focus:outline-none focus:border-purple-500 transition-colors"
      />
    </div>
  );
}

function Textarea({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-white/60 text-sm">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 text-sm focus:outline-none focus:border-purple-500 transition-colors resize-none"
      />
    </div>
  );
}

// ── Tela de resultado ──────────────────────────────────────────────────────────
function ResultadoDiagnostico({ diagnostico: d, nome }: { diagnostico: Diagnostico; nome: string }) {
  const scoreColor =
    d.score_growth >= 70 ? "text-green-400" :
    d.score_growth >= 40 ? "text-yellow-400" : "text-red-400";

  const impactoBadge = (impacto: string) => {
    if (impacto === "alto") return "bg-green-500/10 text-green-400 border-green-500/20";
    if (impacto === "médio") return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
    return "bg-white/5 text-white/40 border-white/10";
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] pb-20">
      {/* Header resultado */}
      <div className="bg-gradient-to-b from-purple-950/40 to-transparent pt-12 pb-8 px-4 text-center">
        <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-4 py-1.5 mb-4">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
          <span className="text-green-300 text-xs font-medium">Diagnóstico gerado com sucesso</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">{d.titulo_diagnostico}</h1>
        <p className="text-white/50 text-sm max-w-md mx-auto">{d.resumo_executivo}</p>
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-6">

        {/* Score */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 flex items-center gap-6">
          <div className="text-center">
            <div className={`text-5xl font-black ${scoreColor}`}>{d.score_growth}</div>
            <div className="text-white/30 text-xs mt-1">Growth Score</div>
          </div>
          <div className="flex-1">
            <div className="h-3 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  d.score_growth >= 70 ? "bg-green-500" :
                  d.score_growth >= 40 ? "bg-yellow-500" : "bg-red-500"
                }`}
                style={{ width: `${d.score_growth}%` }}
              />
            </div>
            <p className="text-white/40 text-xs mt-2">
              {d.score_growth >= 70 ? "Negócio bem estruturado — foco em escalar" :
               d.score_growth >= 40 ? "Base sólida — oportunidades de otimização claras" :
               "Momento de estruturar antes de escalar"}
            </p>
          </div>
        </div>

        {/* Alerta crítico */}
        {d.alerta_critico && (
          <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5 flex gap-4">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-red-300 font-semibold text-sm mb-1">Alerta crítico</p>
              <p className="text-white/60 text-sm">{d.alerta_critico}</p>
            </div>
          </div>
        )}

        {/* Principais alavancas */}
        {d.principais_alavancas?.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              <h2 className="text-white font-bold text-lg">Principais alavancas de crescimento</h2>
            </div>
            <div className="space-y-3">
              {d.principais_alavancas.map((a, i) => (
                <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="text-white font-semibold text-sm">{a.titulo}</h3>
                    <div className="flex gap-2 shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${impactoBadge(a.impacto)}`}>
                        {a.impacto}
                      </span>
                    </div>
                  </div>
                  <p className="text-white/50 text-sm mb-3">{a.descricao}</p>
                  <div className="flex items-start gap-2 bg-purple-600/10 rounded-xl p-3">
                    <ChevronRight className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-purple-300 text-xs font-medium">Como começar: </span>
                      <span className="text-white/60 text-xs">{a.como_comecar}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2">
                    <Clock className="w-3.5 h-3.5 text-white/20" />
                    <span className="text-white/30 text-xs">{a.prazo}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Plano 30 dias */}
        {d.plano_30_dias?.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-pink-400" />
              <h2 className="text-white font-bold text-lg">Plano de ação — 30 dias</h2>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden">
              {d.plano_30_dias.map((acao, i) => (
                <div key={i} className={`flex items-start gap-4 p-4 ${i < d.plano_30_dias.length - 1 ? "border-b border-white/[0.04]" : ""}`}>
                  <div className="w-8 h-8 rounded-lg bg-pink-600/10 border border-pink-600/20 flex items-center justify-center shrink-0">
                    <span className="text-pink-400 text-xs font-bold">S{i + 1}</span>
                  </div>
                  <p className="text-white/70 text-sm pt-1">{acao}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Canais recomendados */}
        {d.canais_recomendados?.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Megaphone className="w-5 h-5 text-blue-400" />
              <h2 className="text-white font-bold text-lg">Canais recomendados para o seu nicho</h2>
            </div>
            <div className="space-y-3">
              {d.canais_recomendados.map((c, i) => (
                <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="w-4 h-4 text-blue-400" />
                    <span className="text-white font-semibold text-sm">{c.canal}</span>
                  </div>
                  <p className="text-white/40 text-xs mb-2">{c.por_que_para_este_nicho}</p>
                  <p className="text-white/60 text-sm">{c.como_usar}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Próximos passos */}
        {d.proximos_passos?.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="w-5 h-5 text-yellow-400" />
              <h2 className="text-white font-bold text-lg">Seus próximos passos</h2>
            </div>
            <div className="space-y-2">
              {d.proximos_passos.map((p, i) => (
                <div key={i} className="flex items-start gap-3 bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                  <div className="w-6 h-6 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shrink-0">
                    <span className="text-yellow-400 text-xs font-bold">{i + 1}</span>
                  </div>
                  <p className="text-white/70 text-sm">{p}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Frase motivacional */}
        {d.frase_motivacional && (
          <div className="bg-gradient-to-r from-purple-600/10 to-pink-600/10 border border-purple-600/20 rounded-2xl p-6 text-center">
            <Star className="w-6 h-6 text-purple-400 mx-auto mb-3" />
            <p className="text-white font-semibold text-lg italic">"{d.frase_motivacional}"</p>
          </div>
        )}

        {/* CTA final */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 text-center">
          <p className="text-white font-bold text-lg mb-2">Quer implementar isso com suporte?</p>
          <p className="text-white/40 text-sm mb-5">
            O Erizon automatiza seu marketing, centraliza seus dados e acelera a execução do seu plano de growth.
          </p>
          <a
            href="/signup"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-2xl px-8 py-4 transition-all"
          >
            <Zap className="w-4 h-4" />
            Começar no Erizon — grátis
          </a>
        </div>

      </div>
    </div>
  );
}
