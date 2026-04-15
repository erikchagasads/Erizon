// src/app/api/agente/route.ts
import { getContextoCliente } from "@/lib/agente-memoria";
import { buildStrategicContext } from "@/lib/strategic-context";
import { logEvent, logError } from "@/lib/observability/logger";
import { strategicIntelligenceService } from "@/services/strategic-intelligence-service";
// Erizon AI: suporte completo à plataforma + análise de métricas + copiloto de decisão
// Powered by Groq (llama-3.3-70b-versatile)

import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });
const MODEL = "llama-3.3-70b-versatile";

async function getSupabaseUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(values) {
          values.forEach(({ name, value, options }) => {
            try { cookieStore.set(name, value, options); } catch {}
          });
        },
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

interface AdRow {
  id: string; nome_campanha: string; status: string;
  gasto_total: number; contatos: number; receita_estimada: number | null;
  ctr: number | null; cpm: number | null; impressoes: number | null;
  dias_ativo: number | null; cliente_id: string;
}
interface ClienteRow {
  id: string; nome: string; nome_cliente: string | null;
  meta_account_id: string | null; [key: string]: unknown;
}
interface AdMinRow { gasto_total: number; contatos: number; status: string; }

function isAtivo(s: string) {
  return ["ATIVO","ACTIVE","ATIVA"].includes(s?.toUpperCase?.() ?? "");
}
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

const TOOLS: Groq.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "buscar_campanhas",
      description: "Busca campanhas reais com métricas: gasto, leads, CPL, ROAS, CTR, CPM, score de saúde. Use quando o usuário perguntar sobre campanhas específicas, performance, resultados ou métricas.",
      parameters: {
        type: "object",
        properties: {
          cliente_id: { type: "string" },
          busca:      { type: "string" },
          status:     { type: "string", enum: ["ativo","pausado","todos"] },
          limite:     { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "buscar_clientes",
      description: "Lista os clientes do usuário com resumo de investimento, leads e campanhas ativas.",
      parameters: {
        type: "object",
        properties: {
          busca: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "analisar_conta",
      description: "Análise completa da conta: score geral de saúde, campanhas críticas, oportunidades de escala, recomendações priorizadas com impacto financeiro. Use para 'como está minha conta', 'o que devo fazer', 'analisa tudo', 'quais campanhas estão ruins'.",
      parameters: {
        type: "object",
        properties: {
          cliente_id: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "gerar_relatorio",
      description: "Gera dados para exportar um relatório em PDF. Use somente quando pedirem 'relatório', 'PDF', 'exportar'.",
      parameters: {
        type: "object",
        properties: {
          cliente_id: { type: "string" },
          busca:      { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "salvar_decisao",
      description: "Salva uma decisão tomada pelo usuário na memória. Use quando relatar que pausou, escalou, criou ou alterou algo.",
      parameters: {
        type: "object",
        properties: {
          acao:     { type: "string" },
          campanha: { type: "string" },
          motivo:   { type: "string" },
          impacto:  { type: "string" },
        },
        required: ["acao", "campanha"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "atualizar_metas",
      description: "Salva metas do usuário. Use quando definir CPL alvo, ROAS mínimo ou budget.",
      parameters: {
        type: "object",
        properties: {
          cpl_alvo:      { type: "number" },
          roas_minimo:   { type: "number" },
          budget_diario: { type: "number" },
        },
      },
    },
  },
];

async function executarTool(
  nome: string,
  input: Record<string, unknown>,
  supabase: ReturnType<typeof createServerClient>,
  userId: string
): Promise<{ resultado: string; memoriaUpdate?: Record<string, unknown> }> {
  let memoriaUpdate: Record<string, unknown> | undefined;

  try {
    if (nome === "buscar_campanhas") {
      let q = supabase
        .from("metricas_ads")
        .select("id, nome_campanha, status, gasto_total, contatos, receita_estimada, ctr, cpm, impressoes, dias_ativo, cliente_id")
        .eq("user_id", userId)
        .order("gasto_total", { ascending: false })
        .limit((input.limite as number) || 50);

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
          gasto: c.gasto_total, leads: c.contatos,
          receita: c.receita_estimada ?? 0,
          cpl: Math.round(cpl * 100) / 100,
          roas: Math.round(roas * 100) / 100,
          ctr: c.ctr ?? 0, cpm: c.cpm ?? 0,
          diasAtivo: c.dias_ativo ?? 0,
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
          .from("metricas_ads").select("gasto_total, contatos, status")
          .eq("cliente_id", c.id);
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

      const totalInvest  = campanhas.reduce((s, c) => s + (c.gasto_total ?? 0), 0);
      const totalLeads   = campanhas.reduce((s, c) => s + (c.contatos ?? 0), 0);
      const totalReceita = campanhas.reduce((s, c) => s + ((c.receita_estimada) ?? 0), 0);
      const roasMedio    = totalInvest > 0 ? totalReceita / totalInvest : 0;
      const cplMedio     = totalLeads  > 0 ? totalInvest  / totalLeads  : 0;

      const enriched = campanhas.map(c => {
        const cpl  = c.contatos > 0 ? c.gasto_total / c.contatos : 0;
        const roas = c.gasto_total > 0 ? (c.receita_estimada ?? 0) / c.gasto_total : 0;
        return {
          id: c.id, nome: c.nome_campanha, gasto: c.gasto_total,
          leads: c.contatos, cpl, roas,
          score: calcScore(c.gasto_total, c.contatos, c.receita_estimada ?? 0),
          diasAtivo: c.dias_ativo ?? 7,
        };
      });

      const criticas      = enriched.filter(c => c.score < 40).sort((a, b) => b.gasto - a.gasto);
      const atencao       = enriched.filter(c => c.score >= 40 && c.score < 65);
      const oportunidades = enriched.filter(c => c.score >= 75 && c.roas >= 2).sort((a, b) => b.roas - a.roas);
      const scoreGlobal   = enriched.length > 0
        ? Math.round(enriched.reduce((s, c) => s + c.score, 0) / enriched.length) : 0;

      const gastoEmRisco = criticas.reduce((s, c) => s + c.gasto, 0);
      const perdaMensal  = Math.round(gastoEmRisco * 0.3 * 30 / 7);
      const ganhoEscala  = oportunidades.slice(0, 2).reduce((s, c) => s + c.gasto * 0.2 * c.roas, 0);

      const recomendacoes: string[] = [];
      criticas.slice(0, 3).forEach(c => {
        const gd = Math.round(c.gasto / Math.max(c.diasAtivo, 1));
        recomendacoes.push(`PAUSAR: "${c.nome}" — score ${c.score}/100, CPL R$${c.cpl.toFixed(0)}, ~R$${gd}/dia. Economiza ~R$${gd * 30}/mês.`);
      });
      atencao.slice(0, 2).forEach(c => {
        recomendacoes.push(`REVISAR: "${c.nome}" — score ${c.score}/100, ROAS ${c.roas.toFixed(2)}×.`);
      });
      oportunidades.slice(0, 2).forEach(c => {
        const ganho = Math.round(c.gasto * 0.2 * c.roas);
        recomendacoes.push(`ESCALAR: "${c.nome}" — ROAS ${c.roas.toFixed(2)}×, score ${c.score}/100. +20% budget = ~R$${ganho} extra.`);
      });

      memoriaUpdate = {
        nova_analise: {
          score: scoreGlobal, criticas: criticas.length,
          oportunidades: oportunidades.length, totalInvest,
          resumo: `Score ${scoreGlobal}/100, ${criticas.length} críticas, ${oportunidades.length} para escalar`,
        },
      };

      return {
        resultado: JSON.stringify({
          scoreGlobal,
          saude: scoreGlobal >= 70 ? "Saudável" : scoreGlobal >= 50 ? "Atenção" : "Crítico",
          totalCampanhas: campanhas.length, criticas: criticas.length,
          emAtencao: atencao.length, oportunidades: oportunidades.length,
          totalInvest: Math.round(totalInvest * 100) / 100,
          totalLeads, roasMedio: Math.round(roasMedio * 100) / 100,
          cplMedio: Math.round(cplMedio * 100) / 100,
          gastoEmRisco: Math.round(gastoEmRisco * 100) / 100,
          perdaMensalEstimada: perdaMensal,
          ganhoEscalaEstimado: Math.round(ganhoEscala),
          recomendacoes,
          topCriticas: criticas.slice(0, 5),
          topOportunidades: oportunidades.slice(0, 3),
        }),
        memoriaUpdate,
      };
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

      const totalInvest  = (lista as AdRow[]).reduce((s, c) => s + (c.gasto_total ?? 0), 0);
      const totalLeads   = (lista as AdRow[]).reduce((s, c) => s + (c.contatos ?? 0), 0);
      const totalReceita = (lista as AdRow[]).reduce((s, c) => s + ((c.receita_estimada) ?? 0), 0);

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
            campanhas: (lista as AdRow[]).map(c => {
              const cpl  = c.contatos > 0 ? c.gasto_total / c.contatos : 0;
              const roas = c.gasto_total > 0 ? (c.receita_estimada ?? 0) / c.gasto_total : 0;
              return {
                nome: c.nome_campanha, status: c.status,
                gasto: c.gasto_total, leads: c.contatos, cpl, roas,
                score: calcScore(c.gasto_total, c.contatos, c.receita_estimada ?? 0),
              };
            }),
          },
        }),
      };
    }

    if (nome === "salvar_decisao") {
      memoriaUpdate = {
        nova_decisao: {
          acao: input.acao, campanha: input.campanha,
          motivo: input.motivo ?? "", impacto: input.impacto ?? "",
        },
      };
      return { resultado: JSON.stringify({ ok: true, msg: "Decisão registrada." }), memoriaUpdate };
    }

    if (nome === "atualizar_metas") {
      const novasMetas: Record<string, number> = {};
      if (input.cpl_alvo      !== undefined) novasMetas.cpl_alvo      = input.cpl_alvo as number;
      if (input.roas_minimo   !== undefined) novasMetas.roas_minimo   = input.roas_minimo as number;
      if (input.budget_diario !== undefined) novasMetas.budget_diario = input.budget_diario as number;
      memoriaUpdate = { metas: novasMetas };
      return { resultado: JSON.stringify({ ok: true, metas: novasMetas }), memoriaUpdate };
    }

    return { resultado: JSON.stringify({ erro: `Tool desconhecida: ${nome}` }) };
  } catch (e) {
    console.error("[Erizon Tool Error]", nome, e);
    return { resultado: JSON.stringify({ erro: e instanceof Error ? e.message : "Erro interno" }) };
  }
}

function buildMemoriaSection(memoria: Record<string, unknown>): string {
  let s = "\n\n## MEMÓRIA DO USUÁRIO";
  if (memoria.resumo_contexto) s += `\nPerfil: ${memoria.resumo_contexto}`;

  const metas = memoria.metas as Record<string, number> | undefined;
  if (metas && Object.keys(metas).length > 0) {
    const partes = [];
    if (metas.cpl_alvo)      partes.push(`CPL alvo R$${metas.cpl_alvo}`);
    if (metas.roas_minimo)   partes.push(`ROAS mínimo ${metas.roas_minimo}×`);
    if (metas.budget_diario) partes.push(`Budget diário R$${metas.budget_diario}`);
    if (partes.length) s += `\nMetas: ${partes.join(" | ")}`;
  }

  const decisoes = memoria.decisoes as Array<Record<string, string>> | undefined;
  if (decisoes?.length) {
    s += `\nÚltimas ações:`;
    decisoes.slice(0, 5).forEach(d => {
      s += `\n- ${d.acao} "${d.campanha}"${d.motivo ? ` — ${d.motivo}` : ""} (${new Date(d.data).toLocaleDateString("pt-BR")})`;
    });
  }

  const historico = memoria.historico_analises as Array<Record<string, unknown>> | undefined;
  if (historico?.length) {
    const u = historico[0];
    s += `\nÚltima análise (${new Date(u.data as string).toLocaleDateString("pt-BR")}): ${u.resumo}`;
  }

  s += "\nUse este contexto — você já conhece este usuário.";
  return s;
}

function buildSystem(memoria: Record<string, unknown> | null, clienteNome?: string): string {
  return `Você é o Eri — assistente da Erizon, a plataforma de gestão de tráfego pago.

Pensa em você como um amigo que trabalha na Erizon e conhece tudo: a plataforma, as campanhas do gestor, o mercado de tráfego. Quando alguém te chama, você está disponível pra ajudar com o que for — seja uma dúvida simples sobre como usar uma tela, uma análise de campanha que não tá performando, ou só bater um papo sobre estratégia.

## QUEM VOCÊ É

Você não é um robô de suporte com respostas prontas. Você é parceiro de trabalho — fala como gente, pensa junto, e se importa com o resultado do gestor. Quando alguém chega com um problema, você não joga o manual na cara. Você entende o contexto, pergunta o que precisa e ajuda a resolver.

Você conhece tudo sobre a Erizon:

**Pulse** — o painel que o gestor abre todo dia. Mostra o health score da conta, investimento, leads, campanhas em risco e oportunidades. É o resumo do que tá acontecendo agora.

**Analytics** — tabela completa de campanhas com métricas reais do Meta Ads. Tem filtros por período, status, cliente. Dá pra sincronizar manualmente ou esperar o sync automático.

**Decision Feed** — fila de decisões prioritárias: o que pausar, o que escalar, o que revisar. Ordenado por urgência e impacto financeiro.

**Risk Radar** — detecta campanhas com degradação: CPL subindo, CTR caindo, frequência explodindo. Diagnóstico de causa raiz automático.

**Network Intelligence** — monitora anomalias e oportunidades na conta toda hora. Gera alertas proativos.

**Automações / Autopilot** — regras automáticas: "se CPL > R$80 por 2 dias → pausar". Executa na Meta Ads sem precisar entrar no gerenciador.

**Creative Lab** — gera headlines, CTAs, body copy, VSLs e roteiros com IA. Integrado com dados da campanha.

**Copiloto IA** — analista neural que lê as campanhas do gestor e responde perguntas específicas.

**Clientes** — gestão de carteira. Cada cliente tem seu perfil, métricas consolidadas e aba de Insights do Instagram orgânico.

**Relatórios** — relatório executivo por cliente para compartilhar em reunião. Exporta PDF.

**Portal do Cliente** — link público para o cliente ver os dados sem precisar de login.

**Insights Instagram** — dados orgânicos reais do Instagram do cliente via Graph API: alcance, impressões, top posts, audiência.

**Benchmarks** — comparativo com médias do mercado por nicho brasileiro.

**Settings** — conectar Meta Ads (token + ad account ID), configurar Telegram para alertas, whitelabel, plano.

## PLANOS E PREÇOS REAIS DA ERIZON

São 3 planos. Se alguém perguntar sobre preços, planos ou o que está incluso, use APENAS estas informações:

**Core — R$97/mês**
- Até 3 clientes
- Sincronização Meta Ads automática
- Pulse — health score diário
- Score de campanha em tempo real
- Alertas Telegram (3x por dia)
- Benchmarks por nicho
- Histórico 30 dias
- Ideal para o gestor solo que quer parar de perder dinheiro em campanha ruim

**Pro — R$297/mês**
- Até 15 clientes
- Tudo do Core
- Analytics — Central de Decisão
- Decision Feed — fila de ações prioritárias
- Risk Radar — diagnóstico de causa raiz
- Inteligência — insights automáticos
- Copiloto IA — analista neural
- Relatórios por cliente
- Histórico 90 dias
- Ideal para o gestor que toma decisões com dados

**Command — R$497/mês**
- Clientes ilimitados
- Tudo do Pro
- Autopilot — regras automáticas de pausa e escala
- Creative Lab — geração de copies com IA
- Portal do Cliente — relatório público
- Insights Instagram por cliente
- Whitelabel
- Suporte prioritário
- Ideal para agências com múltiplos clientes

Período de teste: 7 dias grátis. Sem cartão de crédito para começar.

## O QUE A ERIZON FAZ E NÃO FAZ

A Erizon é uma plataforma de gestão de tráfego pago — foca em Meta Ads (Facebook e Instagram).

O que faz:
- Puxa dados reais de campanhas do Meta Ads via Graph API
- Calcula score de performance por campanha (0-100)
- Envia alertas automáticos quando campanha está queimando dinheiro
- Gera recomendações de pausa e escala com impacto financeiro
- Organiza campanhas por cliente
- Gera copies, roteiros e criativos com IA
- Mostra dados orgânicos do Instagram do cliente

O que NÃO faz:
- Não gerencia leads (sem CRM de leads)
- Não cria campanhas no Meta (só lê e monitora)
- Não integra com Google Ads ainda
- Não tem relatório de redes sociais além do Instagram orgânico
- Não tem limite de campanhas por plano (sincroniza todas da conta)

Se alguém perguntar sobre algo que a Erizon não faz, seja honesto e diga que não tem essa funcionalidade ainda.

**Como sincronizar:** Settings → cole o Access Token e Ad Account ID → Salvar → Analytics → botão Sincronizar. O sistema também sincroniza automaticamente a cada hora.

**Como ligar alertas Telegram:** Settings → Integrações → cole o Chat ID do seu grupo ou bot.

## QUANDO VER DADOS DE CAMPANHAS

Se alguém perguntar sobre campanhas, métricas, performance ou resultados — use as tools antes de responder. Não invente nenhum número.

- **analisar_conta** → saúde geral da conta, score, críticos, oportunidades
- **buscar_campanhas** → métricas detalhadas de campanhas específicas
- **buscar_clientes** → carteira com performance consolidada
- **gerar_relatorio** → só quando pedir relatório ou PDF explicitamente
- **salvar_decisao** → quando o gestor contar que pausou, escalou ou fez algo
- **atualizar_metas** → quando definir CPL alvo, ROAS mínimo ou budget

## COMO ANALISAR QUANDO TIVER DADOS

Usa esses benchmarks do mercado brasileiro:
- CPL: <R$15 ótimo | R$15-30 bom | R$30-50 atenção | >R$50 crítico
- ROAS: >3× ótimo | 2-3× bom | 1-2× atenção | <1× prejuízo
- CTR: >2% ótimo | 1-2% bom | 0.5-1% atenção | <0.5% criativo morto
- Frequência: <2.0 seguro | 2.0-2.5 monitorar | >2.5 alarme → trocar criativo
- CPM: <R$15 eficiente | R$15-30 normal | >R$30 revisar segmentação

Campanha com gasto >R$100 e zero leads = campanha zumbi. Sinaliza com urgência.

Escala segura: ROAS >2.5× + CPL estável + Frequência <2.0 + mínimo 7 dias de dados. Nunca mais de 30% de aumento por vez.

## COMO SE COMPORTAR

- Fala em português BR, de forma natural — como um amigo que entende do assunto
- Não usa linguagem corporativa, não começa com "Claro!", não é robótico
- Respostas no tamanho certo: curtas quando a pergunta é simples, detalhadas quando precisa
- Quando não sabe algo, fala que não sabe — não inventa
- Quando tiver dados: mostra os números, dá a interpretação, sugere a ação
- Se a pessoa estiver travada numa decisão: ajuda a pensar, não só lista opções
- Usa emojis com moderação quando fizer sentido no contexto${clienteNome ? `

Agora você está com o cliente "${clienteNome}" aberto. Se precisar de dados, priorize campanhas deste cliente.` : ""}${memoria ? buildMemoriaSection(memoria) : ""}`;
}

function precisaDeDados(mensagem: string): boolean {
  const lower = mensagem.toLowerCase();
  const gatilhos = [
    "campanha","cliente","cpl","roas","leads","gasto","invest",
    "métrica","metrica","resultado","performance","análise","analisa",
    "analisar","score","crítico","critico","escalar","pausar",
    "relatório","relatorio","pdf","como está","como estao",
    "quanto","quantas","quais campanhas","minha conta","meu cliente",
  ];
  return gatilhos.some(p => lower.includes(p));
}

function conversaSubstancial(messages: Array<{ role: string; content: string }>): boolean {
  const triviais = [
    /^(ok|okay|certo|entendi|valeu|obrigad[oa]|vlw|tks|blz|beleza|ótimo|boa|perfeito|show)[\s!.]*$/i,
    /^(oi|olá|ola|e aí|eae|tudo bem|tudo bom)[\s?!.]*$/i,
    /^(sim|não|nao|talvez|claro|exato|isso mesmo)[\s!.]*$/i,
  ];
  const ultima = messages[messages.length - 1]?.content ?? "";
  return !triviais.some(r => r.test(ultima.trim())) && messages.length >= 3 && ultima.length > 30;
}

export async function POST(req: NextRequest) {
  const { supabase, user } = await getSupabaseUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Não autenticado." }), { status: 401 });
  }

  logEvent("agente.request", { userId: user.id });
  const body = await req.json();
  const { messages, cliente_id } = body as {
    messages: Array<{ role: "user" | "assistant"; content: string }>;
    cliente_id?: string;
  };

  if (!messages?.length) {
    return new Response(JSON.stringify({ error: "Mensagens inválidas." }), { status: 400 });
  }

  const workspaceId = await strategicIntelligenceService.resolveWorkspaceId(user.id);
  const [{ data: memoria }, clienteResult, memoriaCliente, workspaceSnapshot, clientSnapshot] = await Promise.all([
    supabase.from("agente_memoria").select("*").eq("user_id", user.id).maybeSingle(),
    cliente_id
      ? supabase.from("clientes").select("nome, nome_cliente").eq("id", cliente_id).maybeSingle()
      : Promise.resolve({ data: null }),
    getContextoCliente(supabase, user.id, cliente_id, "agente"),
    strategicIntelligenceService.getWorkspaceSnapshot({ workspaceId, userId: user.id }),
    cliente_id
      ? strategicIntelligenceService.getClientSnapshot({ clientId: cliente_id, userId: user.id, workspaceId })
      : Promise.resolve(null),
  ]);

  const clienteNome = clienteResult.data
    ? (clienteResult.data.nome_cliente ?? clienteResult.data.nome)
    : undefined;

  const strategicContext = buildStrategicContext({
    workspace: workspaceSnapshot,
    client: clientSnapshot,
    agent: "agente",
  });
  const systemPrompt =
    buildSystem(memoria as Record<string, unknown> | null, clienteNome) + memoriaCliente + strategicContext;
  const ultimaMensagem = messages[messages.length - 1]?.content ?? "";
  const usarTools = precisaDeDados(ultimaMensagem);

  const msgs: Groq.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...messages.map(m => ({ role: m.role, content: m.content } as Groq.Chat.ChatCompletionMessageParam)),
  ];

  const encoder = new TextEncoder();
  let pdfDados: Record<string, unknown> | null = null;
  const memoriaUpdates: Record<string, unknown>[] = [];

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        let iteracoes = 0;

        while (iteracoes < 8) {
          iteracoes++;

          const response = await groq.chat.completions.create({
            model:       MODEL,
            messages:    msgs,
            tools:       usarTools || iteracoes > 1 ? TOOLS : undefined,
            tool_choice: usarTools || iteracoes > 1 ? "auto" : "none",
            max_tokens:  2048,
            temperature: 0.4,
            stream:      false,
          });

          const choice = response.choices?.[0];
          if (!choice) break;

          const msg = choice.message;
          if (!msg) break;

          const toolCalls = Array.isArray(msg.tool_calls) ? msg.tool_calls : [];
          const hasToolCalls = choice.finish_reason === "tool_calls" && toolCalls.length > 0;

          if (!hasToolCalls) {
            const content = typeof msg.content === "string" ? msg.content : "";
            if (content) {
              const words = content.split(" ");
              const chunkSize = 4;
              for (let i = 0; i < words.length; i += chunkSize) {
                const chunk = words.slice(i, i + chunkSize).join(" ") + (i + chunkSize < words.length ? " " : "");
                send({ type: "delta", content: chunk });
                await new Promise(r => setTimeout(r, 10));
              }
            }
            break;
          }

          msgs.push(msg);

          const toolResults = await Promise.all(
            toolCalls.map(async (tc) => {
              if (!tc?.function?.name) {
                return { role: "tool" as const, tool_call_id: tc?.id ?? "unknown", content: JSON.stringify({ erro: "Tool inválida" }) };
              }

              let inputParsed: Record<string, unknown> = {};
              try { inputParsed = JSON.parse(tc.function.arguments ?? "{}"); } catch {}

              send({ type: "tool_start", tool: tc.function.name });

              const { resultado, memoriaUpdate } = await executarTool(
                tc.function.name, inputParsed, supabase, user.id
              );

              if (memoriaUpdate) memoriaUpdates.push(memoriaUpdate);

              if (tc.function.name === "gerar_relatorio") {
                try {
                  const p = JSON.parse(resultado);
                  if (p.tipo === "relatorio_pdf") pdfDados = p.dados;
                } catch {}
              }

              send({ type: "tool_done", tool: tc.function.name });

              return { role: "tool" as const, tool_call_id: tc.id ?? "unknown", content: resultado };
            })
          );

          msgs.push(...toolResults);
        }

        if (conversaSubstancial(messages)) {
          try {
            const contextoAtual = (memoria as Record<string, unknown> | null)?.resumo_contexto as string ?? "";
            const promptResumo = `Atualize em 2-3 frases o perfil deste gestor de tráfego com base na conversa.
Perfil atual: "${contextoAtual || "Nenhum"}"
Conversa: ${messages.slice(-4).map(m => `${m.role}: ${m.content}`).join("\n")}
Responda APENAS com o novo texto do perfil.`;

            const resumoRes = await groq.chat.completions.create({
              model: MODEL, messages: [{ role: "user", content: promptResumo }],
              max_tokens: 120, stream: false,
            });
            const novoResumo = resumoRes.choices[0]?.message?.content?.trim();
            if (novoResumo) memoriaUpdates.push({ resumo_contexto: novoResumo });
          } catch {}
        }

        if (memoriaUpdates.length > 0) {
          const payload: Record<string, unknown> = { user_id: user.id };
          for (const upd of memoriaUpdates) Object.assign(payload, upd);
          supabase.from("agente_memoria").upsert(payload, { onConflict: "user_id" }).then(() => {});
        }

        send({ type: "done", pdfDados });

      } catch (e) {
        const errMsg = e instanceof Error ? e.message : "Erro interno.";
        logError("agente.error", e);
        send({ type: "error", message: errMsg });
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
