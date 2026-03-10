// src/app/api/agente/route.ts — v4
// Melhorias:
// ✦ Streaming via ReadableStream (resposta token a token)
// ✦ Tool calls paralelas com Promise.all
// ✦ Filtro inteligente para não atualizar resumo em conversas triviais
// Powered by Groq

import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Groq from "groq-sdk";

const groq = new Groq({
  
  
});

// Modelos em ordem de preferência para tool use
// Se um falhar, tente o próximo
const MODEL        = "llama-3.3-70b-versatile";
const MODEL_BACKUP = "llama3-groq-70b-8192-tool-use-preview";

async function getSupabaseUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

// ─── Tools ────────────────────────────────────────────────────────────────────
const TOOLS: Groq.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "buscar_campanhas",
      description: "Busca campanhas com métricas reais: gasto, leads, CPL, ROAS, score. Filtra por cliente, nome ou status.",
      parameters: {
        type: "object",
        properties: {
          cliente_id: { type: "string"  },
          busca:      { type: "string"  },
          status:     { type: "string", enum: ["ativo","pausado","todos"] },
          limite:     { type: "number" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "buscar_clientes",
      description: "Lista clientes com métricas: investimento, leads, CPL, campanhas ativas e críticas.",
      parameters: {
        type: "object",
        properties: {
          busca: { type: "string" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "analisar_conta",
      description: "Análise profunda: score geral, campanhas críticas, oportunidades de escala, recomendações com impacto financeiro.",
      parameters: {
        type: "object",
        properties: {
          cliente_id: { type: "string" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "gerar_relatorio",
      description: "Gera dados para PDF. Use quando pedirem relatório, exportação ou PDF.",
      parameters: {
        type: "object",
        properties: {
          cliente_id: { type: "string" },
          busca:      { type: "string" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "salvar_decisao",
      description: "Salva uma decisão tomada pelo usuário na memória persistente. Use quando o usuário disser que pausou, escalou, criou ou alterou algo.",
      parameters: {
        type: "object",
        properties: {
          acao:      { type: "string", description: "Ex: pausou, escalou, criou, alterou" },
          campanha:  { type: "string", description: "Nome da campanha" },
          motivo:    { type: "string", description: "Motivo da decisão" },
          impacto:   { type: "string", description: "Impacto esperado" },
        },
        required: ["acao", "campanha"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "atualizar_metas",
      description: "Atualiza as metas do usuário na memória. Use quando o usuário definir CPL alvo, ROAS mínimo ou budget.",
      parameters: {
        type: "object",
        properties: {
          cpl_alvo:       { type: "number", description: "CPL alvo em R$" },
          roas_minimo:    { type: "number", description: "ROAS mínimo aceitável" },
          budget_diario:  { type: "number", description: "Budget diário total em R$" },
        },
        required: [],
      },
    },
  },
];

// ─── Row types ────────────────────────────────────────────────────────────────
interface AdRow {
  id: string;
  nome_campanha: string;
  status: string;
  gasto_total: number;
  contatos: number;
  receita_estimada: number | null;
  ctr: number | null;
  cpm: number | null;
  impressoes: number | null;
  dias_ativo: number | null;
  cliente_id: string;
}
interface AdMinRow { gasto_total: number; contatos: number; status: string; }
interface ClienteRow { id: string; nome: string; nome_cliente: string | null; meta_account_id: string | null; [key: string]: unknown; }
interface EnrichedRow { id: string; nome: string; gasto: number; leads: number; cpl: number; roas: number; score: number; diasAtivo: number; }

// ─── Score helper ─────────────────────────────────────────────────────────────
function calcScore(gasto: number, leads: number, receita: number): number {
  if (gasto === 0) return 0;
  if (leads === 0 && gasto > 50) return 20;
  const roas = gasto > 0 ? receita / gasto : 0;
  const cpl  = leads > 0 ? gasto / leads  : 999;
  let s = 50;
  if (roas >= 3) s += 25; else if (roas >= 2) s += 10; else if (roas < 1) s -= 20;
  if (cpl < 30)  s += 15; else if (cpl < 60)  s += 5;  else if (cpl > 120) s -= 15;
  return Math.min(100, Math.max(0, Math.round(s)));
}

function isAtivo(s: string) {
  return ["ATIVO","ACTIVE","ATIVA"].includes(s?.toUpperCase?.() ?? "");
}

// ─── MELHORIA 1: Verifica se conversa é substancial para atualizar resumo ─────
// Evita gastar tokens do Grok em "ok", "obrigado", "tudo bem" etc.
function conversaSubstancial(messages: Array<{ role: string; content: string }>): boolean {
  const triviais = [
    /^(ok|okay|certo|entendi|valeu|obrigad[oa]|vlw|tks|blz|beleza|ótimo|boa|perfeito|show|👍|✅)[\s!.]*$/i,
    /^(oi|olá|ola|e aí|eae|tudo bem|tudo bom|como vai)[\s?!.]*$/i,
    /^(sim|não|nao|talvez|claro|com certeza|exato|isso mesmo)[\s!.]*$/i,
  ];
  const ultimaMensagem = messages[messages.length - 1]?.content ?? "";
  const isTrivial = triviais.some(r => r.test(ultimaMensagem.trim()));
  const temConteudoSuficiente = messages.length >= 3 && ultimaMensagem.length > 30;
  return !isTrivial && temConteudoSuficiente;
}

// ─── Executores ───────────────────────────────────────────────────────────────
async function executarTool(
  nome: string,
  input: Record<string, unknown>,
  supabase: ReturnType<typeof createServerClient>,
  userId: string
): Promise<{ resultado: string; memoriaUpdate?: Record<string, unknown> }> {
  let memoriaUpdate: Record<string, unknown> | undefined;

  console.log("[Erizon Tool]", nome, JSON.stringify(input));
  try {
    if (nome === "buscar_campanhas") {
      let q = supabase
        .from("metricas_ads")
        .select("id, nome_campanha, status, gasto_total, contatos, receita_estimada, ctr, cpm, impressoes, dias_ativo, cliente_id")
        .eq("user_id", userId)
        .order("gasto_total", { ascending: false })
        .limit((input.limite as number) || 100);

      if (input.cliente_id) q = q.eq("cliente_id", input.cliente_id as string);
      if (input.busca)      q = q.ilike("nome_campanha", `%${input.busca}%`);
      if (input.status === "ativo")   q = q.in("status", ["ATIVO","ACTIVE","ATIVA"]);
      if (input.status === "pausado") q = q.not("status", "in", '("ATIVO","ACTIVE","ATIVA")');

      const { data, error } = await q;
      if (error) return { resultado: JSON.stringify({ erro: error.message }) };

      const campanhas = (data ?? [] as AdRow[]).map((c: AdRow) => {
        const cpl  = c.contatos > 0 ? c.gasto_total / c.contatos : 0;
        const roas = c.gasto_total > 0 ? (c.receita_estimada ?? 0) / c.gasto_total : 0;
        return {
          id: c.id, nome: c.nome_campanha,
          status: isAtivo(c.status) ? "Ativa" : "Pausada",
          gasto: c.gasto_total, leads: c.contatos, receita: c.receita_estimada ?? 0,
          cpl: Math.round(cpl * 100) / 100, roas: Math.round(roas * 100) / 100,
          ctr: c.ctr ?? 0, cpm: c.cpm ?? 0, diasAtivo: c.dias_ativo ?? 0,
          score: calcScore(c.gasto_total, c.contatos, c.receita_estimada ?? 0),
        };
      });

      return { resultado: JSON.stringify({ total: campanhas.length, campanhas }) };
    }

    if (nome === "buscar_clientes") {
      let q = supabase.from("clientes").select("*").eq("user_id", userId).eq("ativo", true);
      if (input.busca) q = q.ilike("nome", `%${input.busca}%`);
      const { data, error } = await q;
      if (error) return { resultado: JSON.stringify({ erro: error.message }) };

      const lista = await Promise.all((data ?? [] as ClienteRow[]).map(async (c: ClienteRow) => {
        const { data: ads } = await supabase
          .from("metricas_ads").select("gasto_total, contatos, status").eq("cliente_id", c.id);
        const gasto  = (ads ?? [] as AdMinRow[]).reduce((s: number, x: AdMinRow) => s + (x.gasto_total ?? 0), 0);
        const leads  = (ads ?? [] as AdMinRow[]).reduce((s: number, x: AdMinRow) => s + (x.contatos ?? 0), 0);
        const ativas = (ads ?? [] as AdMinRow[]).filter((x: AdMinRow) => isAtivo(x.status)).length;
        return {
          id: c.id, nome: c.nome_cliente ?? c.nome,
          gasto_total: gasto, total_leads: leads,
          campanhas_ativas: ativas,
          cpl_medio: leads > 0 ? Math.round(gasto / leads * 100) / 100 : 0,
          tem_integracao: !!c.meta_account_id,
        };
      }));

      return { resultado: JSON.stringify({ total: lista.length, clientes: lista }) };
    }

    if (nome === "analisar_conta") {
      let q = supabase
        .from("metricas_ads").select("*")
        .eq("user_id", userId)
        .in("status", ["ATIVO","ACTIVE","ATIVA"]);
      if (input.cliente_id) q = q.eq("cliente_id", input.cliente_id as string);

      const { data } = await q;
      const campanhas = (data ?? []) as AdRow[];

      const totalInvest  = (campanhas as AdRow[]).reduce((s: number, c: AdRow) => s + (c.gasto_total ?? 0), 0);
      const totalLeads   = (campanhas as AdRow[]).reduce((s: number, c: AdRow) => s + (c.contatos ?? 0), 0);
      const totalReceita = (campanhas as AdRow[]).reduce((s: number, c: AdRow) => s + ((c.receita_estimada) ?? 0), 0);
      const roasMedio    = totalInvest > 0 ? totalReceita / totalInvest : 0;
      const cplMedio     = totalLeads  > 0 ? totalInvest  / totalLeads  : 0;

      const enriched = (campanhas as AdRow[]).map((c: AdRow) => {
        const cpl  = c.contatos > 0 ? c.gasto_total / c.contatos : 0;
        const roas = c.gasto_total > 0 ? (c.receita_estimada ?? 0) / c.gasto_total : 0;
        return {
          id: c.id, nome: c.nome_campanha, gasto: c.gasto_total,
          leads: c.contatos, cpl, roas,
          score: calcScore(c.gasto_total, c.contatos, c.receita_estimada ?? 0),
          diasAtivo: c.dias_ativo ?? 7,
        };
      });

      const criticas      = (enriched as EnrichedRow[]).filter((c: EnrichedRow) => c.score < 40).sort((a: EnrichedRow, b: EnrichedRow) => b.gasto - a.gasto);
      const atencao       = (enriched as EnrichedRow[]).filter((c: EnrichedRow) => c.score >= 40 && c.score < 65);
      const oportunidades = (enriched as EnrichedRow[]).filter((c: EnrichedRow) => c.score >= 75 && c.roas >= 2).sort((a: EnrichedRow, b: EnrichedRow) => b.roas - a.roas);
      const scoreGlobal   = enriched.length > 0
        ? Math.round((enriched as EnrichedRow[]).reduce((s: number, c: EnrichedRow) => s + c.score, 0) / enriched.length) : 0;

      const gastoEmRisco = (criticas as EnrichedRow[]).reduce((s: number, c: EnrichedRow) => s + c.gasto, 0);
      const perdaMensal  = Math.round(gastoEmRisco * 0.3 * 30 / 7);
      const ganhoEscala  = (oportunidades as EnrichedRow[]).slice(0, 2).reduce((s: number, c: EnrichedRow) => s + c.gasto * 0.2 * c.roas, 0);

      const recomendacoes: string[] = [];
      (criticas as EnrichedRow[]).slice(0, 3).forEach((c: EnrichedRow) => {
        const gd = Math.round(c.gasto / Math.max(c.diasAtivo, 1));
        recomendacoes.push(`PAUSAR: "${c.nome}" — score ${c.score}/100, CPL R$${c.cpl.toFixed(0)}, R$${gd}/dia. Economiza ~R$${gd * 30}/mês.`);
      });
      (atencao as EnrichedRow[]).slice(0, 2).forEach((c: EnrichedRow) => {
        recomendacoes.push(`REVISAR: "${c.nome}" — score ${c.score}/100, ROAS ${c.roas.toFixed(2)}×.`);
      });
      (oportunidades as EnrichedRow[]).slice(0, 2).forEach((c: EnrichedRow) => {
        const ganho = Math.round(c.gasto * 0.2 * c.roas);
        recomendacoes.push(`ESCALAR: "${c.nome}" — ROAS ${c.roas.toFixed(2)}×, score ${c.score}/100. +20% budget = ~R$${ganho} extra.`);
      });

      const analise = {
        scoreGlobal, saude: scoreGlobal >= 70 ? "Saudável" : scoreGlobal >= 50 ? "Atenção" : "Crítico",
        totalCampanhas: campanhas.length, criticas: criticas.length,
        emAtencao: atencao.length, oportunidades: oportunidades.length,
        totalInvest: Math.round(totalInvest * 100) / 100,
        totalLeads, roasMedio: Math.round(roasMedio * 100) / 100,
        cplMedio: Math.round(cplMedio * 100) / 100,
        gastoEmRisco: Math.round(gastoEmRisco * 100) / 100,
        perdaMensalEstimada: perdaMensal, ganhoEscalaEstimado: Math.round(ganhoEscala),
        recomendacoes, topCriticas: criticas.slice(0, 5), topOportunidades: oportunidades.slice(0, 3),
      };

      memoriaUpdate = {
        nova_analise: {
          score: scoreGlobal,
          criticas: criticas.length,
          oportunidades: oportunidades.length,
          totalInvest,
          resumo: `Score ${scoreGlobal}/100, ${criticas.length} críticas, ${oportunidades.length} para escalar`,
        },
      };

      return { resultado: JSON.stringify(analise), memoriaUpdate };
    }

    if (nome === "gerar_relatorio") {
      let q = supabase
        .from("metricas_ads").select("*")
        .eq("user_id", userId)
        .order("gasto_total", { ascending: false });
      if (input.cliente_id) q = q.eq("cliente_id", input.cliente_id as string);
      if (input.busca)      q = q.ilike("nome_campanha", `%${input.busca}%`);

      const { data } = await q;
      const lista = data ?? [];
      let nomeCliente = "Conta Geral";
      if (input.cliente_id) {
        const { data: cl } = await supabase.from("clientes")
          .select("nome, nome_cliente").eq("id", input.cliente_id as string).maybeSingle();
        if (cl) nomeCliente = cl.nome_cliente ?? cl.nome ?? nomeCliente;
      }
      if (input.busca) nomeCliente = `Busca: ${input.busca}`;

      const totalInvest  = (lista as AdRow[]).reduce((s: number, c: AdRow) => s + (c.gasto_total ?? 0), 0);
      const totalLeads   = (lista as AdRow[]).reduce((s: number, c: AdRow) => s + (c.contatos ?? 0), 0);
      const totalReceita = (lista as AdRow[]).reduce((s: number, c: AdRow) => s + ((c.receita_estimada) ?? 0), 0);

      return {
        resultado: JSON.stringify({
          tipo: "relatorio_pdf",
          dados: {
            titulo: `Relatório de Campanhas — ${nomeCliente}`,
            cliente: nomeCliente,
            dataGeracao: new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }),
            totais: {
              campanhas: lista.length, investimento: totalInvest,
              leads: totalLeads, receita: totalReceita,
              cplMedio: totalLeads > 0 ? totalInvest / totalLeads : 0,
              roasMedio: totalInvest > 0 ? totalReceita / totalInvest : 0,
            },
            campanhas: (lista as AdRow[]).map((c: AdRow) => {
              const cpl  = c.contatos > 0 ? c.gasto_total / c.contatos : 0;
              const roas = c.gasto_total > 0 ? (c.receita_estimada ?? 0) / c.gasto_total : 0;
              return { nome: c.nome_campanha, status: c.status, gasto: c.gasto_total,
                leads: c.contatos, cpl, roas, score: calcScore(c.gasto_total, c.contatos, c.receita_estimada ?? 0) };
            }),
          },
        }),
      };
    }

    if (nome === "salvar_decisao") {
      memoriaUpdate = {
        nova_decisao: {
          acao:     input.acao,
          campanha: input.campanha,
          motivo:   input.motivo ?? "",
          impacto:  input.impacto ?? "",
        },
      };
      return { resultado: JSON.stringify({ ok: true, msg: "Decisão salva na memória." }), memoriaUpdate };
    }

    if (nome === "atualizar_metas") {
      const novasMetas: Record<string, number> = {};
      if (input.cpl_alvo      !== undefined) novasMetas.cpl_alvo      = input.cpl_alvo as number;
      if (input.roas_minimo   !== undefined) novasMetas.roas_minimo   = input.roas_minimo as number;
      if (input.budget_diario !== undefined) novasMetas.budget_diario = input.budget_diario as number;
      memoriaUpdate = { metas: novasMetas };
      return { resultado: JSON.stringify({ ok: true, metas: novasMetas, msg: "Metas atualizadas e salvas." }), memoriaUpdate };
    }

    return { resultado: JSON.stringify({ erro: `Tool desconhecida: ${nome}` }) };
  } catch (e) {
    console.error("[Erizon Tool Error]", nome, e);
    return { resultado: JSON.stringify({ erro: e instanceof Error ? e.message : "Erro interno" }) };
  }
}

// ─── Monta system prompt com memória ─────────────────────────────────────────
function buildSystem(memoria: Record<string, unknown> | null, clienteNome?: string): string {
  // System prompt enxuto — Llama performa melhor com instruções curtas e diretas
  let system = `Você é o Erizon, especialista em Meta Ads. Responda sempre em português brasileiro.

OBRIGATÓRIO: Antes de qualquer resposta sobre dados, campanhas ou conta — chame a tool correta:
- analisar_conta → saúde geral, score, críticos, oportunidades
- buscar_campanhas → métricas de campanhas específicas
- buscar_clientes → lista de clientes
- gerar_relatorio → gerar PDF
- salvar_decisao → quando usuário pausar/escalar algo
- atualizar_metas → quando usuário definir CPL/ROAS/budget

Seja direto, use números reais, inclua impacto financeiro nas recomendações.`;

  if (clienteNome) {
    system += `\n\nContexto atual: usuário está vendo o cliente "${clienteNome}". Priorize dados deste cliente.`;
  }

  if (memoria) {
    system += "\n\n═══ MEMÓRIA DO USUÁRIO ═══";

    if (memoria.resumo_contexto) {
      system += `\n\nPerfil: ${memoria.resumo_contexto}`;
    }

    if (memoria.metas && Object.keys(memoria.metas as object).length > 0) {
      const m = memoria.metas as Record<string, number>;
      const partes = [];
      if (m.cpl_alvo)      partes.push(`CPL alvo: R$${m.cpl_alvo}`);
      if (m.roas_minimo)   partes.push(`ROAS mínimo: ${m.roas_minimo}×`);
      if (m.budget_diario) partes.push(`Budget diário: R$${m.budget_diario}`);
      if (partes.length)   system += `\nMetas: ${partes.join(" | ")}`;
    }

    const decisoes = memoria.decisoes as Array<Record<string, string>> | undefined;
    if (decisoes?.length) {
      system += `\n\nÚltimas decisões do usuário:`;
      decisoes.slice(0, 5).forEach(d => {
        system += `\n- ${d.acao} "${d.campanha}"${d.motivo ? ` (${d.motivo})` : ""} — ${new Date(d.data).toLocaleDateString("pt-BR")}`;
      });
    }

    const historico = memoria.historico_analises as Array<Record<string, unknown>> | undefined;
    if (historico?.length) {
      const ultima = historico[0];
      system += `\n\nÚltima análise: ${ultima.resumo} em ${new Date(ultima.data as string).toLocaleDateString("pt-BR")}`;
    }

    if (memoria.preferencias && Object.keys(memoria.preferencias as object).length > 0) {
      system += `\nPreferências: ${JSON.stringify(memoria.preferencias)}`;
    }

    system += "\n\nUse este contexto para personalizar suas respostas. Você conhece este usuário.";
  }

  return system;
}

// ─── POST com Streaming ───────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { supabase, user } = await getSupabaseUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Não autenticado." }), { status: 401 });
  }

  const body = await req.json();
  const { messages, cliente_id } = body as {
    messages: Array<{ role: "user" | "assistant"; content: string }>;
    cliente_id?: string;
  };

  if (!messages?.length) {
    return new Response(JSON.stringify({ error: "Mensagens inválidas." }), { status: 400 });
  }

  // ── Teste rápido de conectividade Supabase ──────────────────────────────
  try {
    const { error: pingError } = await supabase.from("agente_memoria").select("id").limit(1);
    if (pingError) {
      console.error("[Erizon] Supabase inacessível:", pingError.message);
      return new Response(
        JSON.stringify({ error: `Supabase: ${pingError.message}` }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch (pingEx) {
    console.error("[Erizon] Supabase exception:", pingEx);
  }

  // ── Carrega memória + nome do cliente em paralelo ─────────────────────────
  const [{ data: memoria }, clienteResult] = await Promise.all([
    supabase.from("agente_memoria").select("*").eq("user_id", user.id).maybeSingle(),
    cliente_id
      ? supabase.from("clientes").select("nome, nome_cliente").eq("id", cliente_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const clienteNome = clienteResult.data
    ? (clienteResult.data.nome_cliente ?? clienteResult.data.nome)
    : undefined;

  const systemPrompt = buildSystem(memoria as Record<string, unknown> | null, clienteNome);

  const msgs: Groq.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...messages.map(m => ({ role: m.role, content: m.content } as Groq.Chat.ChatCompletionMessageParam)),
  ];

  // ── Stream via ReadableStream ─────────────────────────────────────────────
  const encoder = new TextEncoder();
  let pdfDados: Record<string, unknown> | null = null;
  const memoriaUpdates: Record<string, unknown>[] = [];

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        console.log("[Erizon] Iniciando agente para user:", user.id);
        let iteracoes = 0;

        // ── Agentic loop ────────────────────────────────────────────────────
        while (iteracoes < 15) {
          iteracoes++;
          console.log("[Erizon] Iteração", iteracoes);

          // Fase de tool calls: sem stream para poder processar as tools
          // Na primeira iteração, força analisar_conta se for pergunta geral
          // Nas demais, deixa o modelo decidir
          const isFirstCall = iteracoes === 1;
          const lastUserMsg = messages[messages.length - 1]?.content?.toLowerCase() ?? "";
          const perguntaGeral = isFirstCall && (
            lastUserMsg.includes("analisa") ||
            lastUserMsg.includes("conta") ||
            lastUserMsg.includes("crítico") ||
            lastUserMsg.includes("critico") ||
            lastUserMsg.includes("escalar") ||
            lastUserMsg.includes("campanhas") ||
            lastUserMsg.includes("clientes") ||
            lastUserMsg.includes("como está") ||
            lastUserMsg.includes("o que")
          );

          // Tenta com modelo principal, faz fallback para backup se necessário
          let response = await groq.chat.completions.create({
            model:       MODEL,
            messages:    msgs,
            tools:       TOOLS,
            tool_choice: perguntaGeral ? "required" : "auto",
            max_tokens:  4096,
            stream:      false,
          });

          // Se o modelo principal não chamou tool quando era esperado, tenta backup
          const firstChoice = response.choices?.[0];
          console.log("[Erizon] Resposta modelo:", firstChoice?.finish_reason, "tool_calls:", firstChoice?.message?.tool_calls?.length ?? 0);
          if (
            perguntaGeral &&
            firstChoice?.finish_reason !== "tool_calls" &&
            !firstChoice?.message?.tool_calls?.length
          ) {
            console.log("[Erizon] Modelo principal não usou tools, tentando backup...");
            response = await groq.chat.completions.create({
              model:       MODEL_BACKUP,
              messages:    msgs,
              tools:       TOOLS,
              tool_choice: "required",
              max_tokens:  4096,
              stream:      false,
            });
          }

          const choice = response.choices?.[0];
          if (!choice) break;

          const msg = choice.message;
          if (!msg) break;

          // ── Guards defensivos contra resposta malformada do Groq ────────
          const toolCalls = Array.isArray(msg.tool_calls) ? msg.tool_calls : [];
          const hasToolCalls = choice.finish_reason === "tool_calls" && toolCalls.length > 0;

          // ── Resposta final: envia em stream token a token ────────────────
          if (!hasToolCalls) {
            const content = typeof msg.content === "string" ? msg.content : "";
            if (content) {
              // Simula streaming dividindo em chunks de palavras
              const words = content.split(" ");
              const chunkSize = 3;
              for (let i = 0; i < words.length; i += chunkSize) {
                const chunk = words.slice(i, i + chunkSize).join(" ") + (i + chunkSize < words.length ? " " : "");
                send({ type: "delta", content: chunk });
                await new Promise(r => setTimeout(r, 12));
              }
            } else if (iteracoes >= 2) {
              // Modelo executou tools mas não gerou texto — pede para resumir
              send({ type: "delta", content: "Análise concluída. Verifique os dados acima." });
            }
            break;
          }

          // ── Tool calls em PARALELO ───────────────────────────────────────
          msgs.push(msg);

          const toolResults = await Promise.all(
            toolCalls.map(async (tc) => {
              // Guard: valida estrutura do tool call
              if (!tc?.function?.name) {
                return { role: "tool" as const, tool_call_id: tc?.id ?? "unknown", content: JSON.stringify({ erro: "Tool call malformada" }) };
              }

              const tcFn = tc.function;
              let inputParsed: Record<string, unknown> = {};
              try { inputParsed = JSON.parse(tcFn.arguments ?? "{}"); } catch {}

              send({ type: "tool_start", tool: tcFn.name });

              const { resultado, memoriaUpdate } = await executarTool(tcFn.name, inputParsed, supabase, user.id);
              if (memoriaUpdate) memoriaUpdates.push(memoriaUpdate);

              if (tcFn.name === "gerar_relatorio") {
                try {
                  const p = JSON.parse(resultado);
                  if (p.tipo === "relatorio_pdf") pdfDados = p.dados;
                } catch {}
              }

              send({ type: "tool_done", tool: tcFn.name });

              return { role: "tool" as const, tool_call_id: tc.id ?? "unknown", content: resultado };
            })
          );

          msgs.push(...toolResults);
        }

        // ── MELHORIA 3: Filtro inteligente para resumo de contexto ─────────
        // Só atualiza o perfil do usuário se a conversa foi substancial
        if (conversaSubstancial(messages)) {
          try {
            const contextoAtual = (memoria as Record<string, unknown> | null)?.resumo_contexto as string ?? "";
            const promptResumo = `Com base nesta conversa com o usuário sobre campanhas de anúncios, atualize em 2-3 frases o perfil dele. Seja específico sobre estilo, foco e preferências demonstradas.

Perfil atual: "${contextoAtual || "Nenhum ainda"}"

Conversa: ${messages.slice(-4).map(m => `${m.role}: ${m.content}`).join("\n")}

Responda APENAS com o novo texto do perfil, sem explicações.`;

            const resumoRes = await groq.chat.completions.create({
              model:      MODEL,
              messages:   [{ role: "user", content: promptResumo }],
              max_tokens: 150,
              stream:     false,
            });
            const novoResumo = resumoRes.choices[0]?.message?.content?.trim();
            if (novoResumo) memoriaUpdates.push({ resumo_contexto: novoResumo });
          } catch {}
        }

        // Salva memória em background (não bloqueia o stream)
        if (memoriaUpdates.length > 0) {
          const payloadMemoria: Record<string, unknown> = { user_id: user.id };
          for (const upd of memoriaUpdates) Object.assign(payloadMemoria, upd);
          supabase.from("agente_memoria").upsert(payloadMemoria, { onConflict: "user_id" }).then(() => {});
        }

        // Envia PDF dados e sinaliza fim do stream
        send({ type: "done", pdfDados });

      } catch (e) {
        const msg = e instanceof Error ? e.message : "Erro interno.";
        console.error("[Erizon] ERRO no stream:", e);
        send({ type: "error", message: msg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection":    "keep-alive",
    },
  });
}