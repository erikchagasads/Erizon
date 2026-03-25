// src/app/api/agente/worker/route.ts
// Worker chamado pelo cron.org a cada hora via POST
// Analisa saúde de todas as contas e gera alertas inteligentes
// Protegido por WORKER_SECRET no header Authorization

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Groq from "groq-sdk";

// ─── Clientes ─────────────────────────────────────────────────────────────────
// Service role bypassa RLS — necessário para acessar dados de todos os usuários
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

const WORKER_SECRET = process.env.WORKER_SECRET;
if (!WORKER_SECRET) {
  console.error("[worker] WORKER_SECRET não configurado — endpoint desabilitado em produção.");
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _isAtivo(status: string) {
  return ["ATIVO","ACTIVE","ATIVA"].includes(status?.toUpperCase?.() ?? "");
}

// ─── Analisa um usuário e gera alertas ───────────────────────────────────────
async function analisarUsuario(userId: string): Promise<void> {
  // Busca campanhas ativas
  const { data: campanhas } = await supabaseAdmin
    .from("metricas_ads")
    .select("id, nome_campanha, status, gasto_total, contatos, receita_estimada, cliente_id, dias_ativo")
    .eq("user_id", userId)
    .in("status", ["ATIVO","ACTIVE","ATIVA"]);

  if (!campanhas?.length) return;

  // Busca clientes
  const { data: clientes } = await supabaseAdmin
    .from("clientes")
    .select("id, nome, nome_cliente")
    .eq("user_id", userId)
    .eq("ativo", true);

  const mapaClientes: Record<string, string> = {};
  (clientes ?? []).forEach(c => { mapaClientes[c.id] = c.nome_cliente ?? c.nome; });

  // Busca memória para evitar spam de alertas repetidos
  const { data: memoria } = await supabaseAdmin
    .from("agente_memoria")
    .select("alertas_enviados, metas")
    .eq("user_id", userId)
    .maybeSingle();

  const alertasJaEnviados: Array<{ campanha_id: string; tipo: string; data: string }> =
    (memoria?.alertas_enviados as typeof alertasJaEnviados) ?? [];
  const metas = (memoria?.metas as Record<string, number>) ?? {};

  const cplAlvo   = metas.cpl_alvo   ?? 60;
  const roasMin   = metas.roas_minimo ?? 1.5;

  // Analisa cada campanha
  const novosAlertas: Array<{
    user_id: string;
    tipo: string;
    titulo: string;
    descricao: string;
    impacto_brl: number;
    urgencia: number;
    campanha_id: string;
    campanha_nome: string;
    cliente_id: string;
    cliente_nome: string;
    dados: Record<string, unknown>;
  }> = [];

  const alertasNovasChaves: Array<{ campanha_id: string; tipo: string; data: string }> = [];

  const totalInvest  = campanhas.reduce((s, c) => s + (c.gasto_total ?? 0), 0);
  const totalLeads   = campanhas.reduce((s, c) => s + (c.contatos ?? 0), 0);
  const scoreGlobal  = campanhas.length > 0
    ? Math.round(campanhas.reduce((s, c) => s + calcScore(c.gasto_total, c.contatos, c.receita_estimada ?? 0), 0) / campanhas.length)
    : 0;

  for (const c of campanhas) {
    const score   = calcScore(c.gasto_total, c.contatos, c.receita_estimada ?? 0);
    const cpl     = c.contatos > 0 ? c.gasto_total / c.contatos : 0;
    const roas    = c.gasto_total > 0 ? (c.receita_estimada ?? 0) / c.gasto_total : 0;
    const gdDiario = Math.round(c.gasto_total / Math.max(c.dias_ativo ?? 7, 1));
    const clienteNome = mapaClientes[c.cliente_id] ?? "Cliente";

    function jaAlertado(tipo: string, horasJanela = 6): boolean {
      const janela = Date.now() - horasJanela * 3600 * 1000;
      return alertasJaEnviados.some(a =>
        a.campanha_id === c.id && a.tipo === tipo && new Date(a.data).getTime() > janela
      );
    }

    function registrarAlerta(tipo: string) {
      alertasNovasChaves.push({ campanha_id: c.id, tipo, data: new Date().toISOString() });
    }

    // ── Campanha queimando sem leads ─────────────────────────────────────────
    if (c.contatos === 0 && c.gasto_total > 80 && !jaAlertado("sem_leads")) {
      novosAlertas.push({
        user_id:       userId,
        tipo:          "critico",
        titulo:        `🔴 Campanha queimando sem leads`,
        descricao:     `"${c.nome_campanha}" gastou R$${c.gasto_total.toFixed(0)} sem gerar nenhum lead. Risco de perda de ~R$${(gdDiario * 30).toFixed(0)}/mês.`,
        impacto_brl:   gdDiario * 30,
        urgencia:      3,
        campanha_id:   c.id,
        campanha_nome: c.nome_campanha,
        cliente_id:    c.cliente_id,
        cliente_nome:  clienteNome,
        dados:         { gasto: c.gasto_total, leads: 0, score, gdDiario },
      });
      registrarAlerta("sem_leads");
    }

    // ── CPL acima do alvo ────────────────────────────────────────────────────
    if (cpl > cplAlvo * 1.5 && c.contatos >= 3 && !jaAlertado("cpl_alto")) {
      const excesso = cpl - cplAlvo;
      novosAlertas.push({
        user_id:       userId,
        tipo:          "critico",
        titulo:        `⚠️ CPL crítico — ${c.nome_campanha.substring(0, 40)}`,
        descricao:     `CPL atual R$${cpl.toFixed(0)} vs meta R$${cplAlvo}. Cada lead está custando R$${excesso.toFixed(0)} a mais que o alvo. Com ${c.contatos} leads = R$${(excesso * c.contatos).toFixed(0)} acima do orçado.`,
        impacto_brl:   excesso * c.contatos,
        urgencia:      2,
        campanha_id:   c.id,
        campanha_nome: c.nome_campanha,
        cliente_id:    c.cliente_id,
        cliente_nome:  clienteNome,
        dados:         { cpl, cplAlvo, leads: c.contatos, score },
      });
      registrarAlerta("cpl_alto");
    }

    // ── ROAS abaixo do mínimo ────────────────────────────────────────────────
    if (roas < roasMin && roas > 0 && c.gasto_total > 100 && !jaAlertado("roas_baixo")) {
      novosAlertas.push({
        user_id:       userId,
        tipo:          "anomalia",
        titulo:        `📉 ROAS abaixo do mínimo`,
        descricao:     `"${c.nome_campanha}" com ROAS ${roas.toFixed(2)}× (mínimo: ${roasMin}×). Está gerando R$${((c.receita_estimada ?? 0)).toFixed(0)} para R$${c.gasto_total.toFixed(0)} investidos.`,
        impacto_brl:   (c.gasto_total * roasMin) - (c.receita_estimada ?? 0),
        urgencia:      2,
        campanha_id:   c.id,
        campanha_nome: c.nome_campanha,
        cliente_id:    c.cliente_id,
        cliente_nome:  clienteNome,
        dados:         { roas, roasMin, gasto: c.gasto_total, receita: c.receita_estimada },
      });
      registrarAlerta("roas_baixo");
    }

    // ── Oportunidade de escala ────────────────────────────────────────────────
    if (score >= 80 && roas >= 3 && !jaAlertado("escala", 12)) {
      const ganhoEstimado = Math.round(c.gasto_total * 0.3 * roas);
      novosAlertas.push({
        user_id:       userId,
        tipo:          "oportunidade",
        titulo:        `🚀 Oportunidade de escala`,
        descricao:     `"${c.nome_campanha}" com score ${score}/100 e ROAS ${roas.toFixed(2)}×. Aumentar 30% do budget pode gerar ~R$${ganhoEstimado} extra/período.`,
        impacto_brl:   ganhoEstimado,
        urgencia:      2,
        campanha_id:   c.id,
        campanha_nome: c.nome_campanha,
        cliente_id:    c.cliente_id,
        cliente_nome:  clienteNome,
        dados:         { score, roas, gasto: c.gasto_total, ganhoEstimado },
      });
      registrarAlerta("escala");
    }
  }

  // ── Alerta de score geral da conta ───────────────────────────────────────────
  if (scoreGlobal < 40) {
    const jaTemAlertaGlobal = alertasJaEnviados.some(a =>
      a.tipo === "conta_critica" && Date.now() - new Date(a.data).getTime() < 6 * 3600 * 1000
    );
    if (!jaTemAlertaGlobal) {
      novosAlertas.push({
        user_id:       userId,
        tipo:          "critico",
        titulo:        `🔴 Conta em estado crítico — score ${scoreGlobal}/100`,
        descricao:     `Sua conta tem score geral ${scoreGlobal}/100. Das ${campanhas.length} campanhas ativas, a maioria está abaixo do ideal. R$${totalInvest.toFixed(0)} investidos com retorno insuficiente.`,
        impacto_brl:   totalInvest * 0.3,
        urgencia:      3,
        campanha_id:   "",
        campanha_nome: "",
        cliente_id:    "",
        cliente_nome:  "Conta Geral",
        dados:         { scoreGlobal, totalCampanhas: campanhas.length, totalInvest, totalLeads },
      });
      alertasNovasChaves.push({ campanha_id: "global", tipo: "conta_critica", data: new Date().toISOString() });
    }
  }

  // ── Usa Grok para gerar resumo inteligente dos alertas ────────────────────
  let resumoGrok = "";
  if (novosAlertas.length > 0) {
    try {
      const prompt = `Você é o Erizon AI, parceiro de gestão de tráfego pago.

Analise estes alertas gerados agora e escreva um briefing MUITO conciso (máx 3 linhas) em português para o gestor:

Alertas: ${JSON.stringify(novosAlertas.map(a => ({ tipo: a.tipo, titulo: a.titulo, impacto: a.impacto_brl })))}

Score da conta: ${scoreGlobal}/100
Total investido: R$${totalInvest.toFixed(0)}

Seja direto. Comece com o mais urgente. Termine com uma ação concreta.`;

      const r = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 300,
      });
      resumoGrok = r.choices[0]?.message?.content ?? "";
    } catch {}
  }

  // ── Salva alertas no Supabase ────────────────────────────────────────────────
  if (novosAlertas.length > 0) {
    await supabaseAdmin.from("agente_alertas").insert(
      novosAlertas.map(a => ({
        ...a,
        dados: { ...a.dados, resumo_worker: resumoGrok },
      }))
    );
  }

  // ── Atualiza memória com novos alertas enviados ───────────────────────────
  const alertasAtualizados = [
    ...alertasNovasChaves,
    ...alertasJaEnviados.filter(a => {
      const idade = Date.now() - new Date(a.data).getTime();
      return idade < 48 * 3600 * 1000; // mantém 48h
    }),
  ].slice(0, 200);

  await supabaseAdmin
    .from("agente_memoria")
    .upsert({
      user_id: userId,
      alertas_enviados: alertasAtualizados,
    }, { onConflict: "user_id" });
}

// ─── POST — chamado pelo cron.org ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // Segurança: valida secret
  const auth = req.headers.get("authorization") ?? "";
  const secret = auth.replace("Bearer ", "");
  if (secret !== WORKER_SECRET) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const inicio = Date.now();

  try {
    // Busca todos os usuários ativos (que têm clientes)
    const { data: usuarios } = await supabaseAdmin
      .from("clientes")
      .select("user_id")
      .eq("ativo", true);

    const userIds = [...new Set((usuarios ?? []).map(u => String(u.user_id ?? '')))];

    if (userIds.length === 0) {
      return NextResponse.json({ ok: true, msg: "Nenhum usuário ativo.", alertas: 0 });
    }

    // Analisa cada usuário
    const resultados: Array<{ userId: string; status: string }> = [];

    for (const userId of userIds) {
      try {
        await analisarUsuario(userId);
        resultados.push({ userId: userId.substring(0, 8) + "...", status: "ok" });
      } catch {
        resultados.push({ userId: userId.substring(0, 8) + "...", status: "erro" });
      }
    }

    const duracao = ((Date.now() - inicio) / 1000).toFixed(1);

    return NextResponse.json({
      ok:        true,
      usuarios:  userIds.length,
      duracao:   `${duracao}s`,
      resultados,
      timestamp: new Date().toISOString(),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro interno.";
    console.error("Worker Erizon:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// GET — health check (cron.org pode usar GET também)
export async function GET(req: NextRequest) {
  const auth   = req.headers.get("authorization") ?? "";
  const secret = auth.replace("Bearer ", "");
  if (secret !== WORKER_SECRET) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  return NextResponse.json({ ok: true, msg: "Worker Erizon online.", timestamp: new Date().toISOString() });
}