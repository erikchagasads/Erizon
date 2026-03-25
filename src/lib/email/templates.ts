// ─── Templates de email para eventos do CRM ──────────────────────────────────

const base = (content: string) => `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { margin: 0; padding: 0; background: #0f0f0f; font-family: Inter, sans-serif; color: #e5e5e5; }
    .wrap { max-width: 560px; margin: 40px auto; background: #1a1a1a; border-radius: 12px; overflow: hidden; border: 1px solid #2a2a2a; }
    .header { background: linear-gradient(135deg, #6d28d9, #4f46e5); padding: 28px 32px; }
    .header h1 { margin: 0; font-size: 22px; color: #fff; font-weight: 700; }
    .header p  { margin: 4px 0 0; font-size: 13px; color: rgba(255,255,255,0.7); }
    .body { padding: 28px 32px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .badge-novo      { background: #1e3a5f; color: #60a5fa; }
    .badge-contato   { background: #1f2937; color: #a3a3a3; }
    .badge-proposta  { background: #3d2b00; color: #fbbf24; }
    .badge-fechado   { background: #14352a; color: #34d399; }
    .badge-perdido   { background: #3d1a1a; color: #f87171; }
    table.info { width: 100%; border-collapse: collapse; margin-top: 16px; }
    table.info td { padding: 8px 0; font-size: 14px; border-bottom: 1px solid #2a2a2a; vertical-align: top; }
    table.info td:first-child { color: #a3a3a3; width: 130px; }
    .btn { display: inline-block; margin-top: 24px; padding: 12px 24px; background: #6d28d9; color: #fff !important; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; }
    .footer { padding: 16px 32px; font-size: 12px; color: #666; border-top: 1px solid #2a2a2a; }
  </style>
</head>
<body>
  <div class="wrap">
    ${content}
    <div class="footer">Erizon · Plataforma de Inteligência em Tráfego Pago · <a href="{{appUrl}}" style="color:#6d28d9">acessar painel</a></div>
  </div>
</body>
</html>
`;

function fill(tpl: string, vars: Record<string, string>): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://erizon.app";
  return tpl.replace(/\{\{appUrl\}\}/g, appUrl).replace(
    /\{\{(\w+)\}\}/g,
    (_, k) => vars[k] ?? ""
  );
}

// ─── 1. Novo lead capturado ───────────────────────────────────────────────────
export function novoLeadHtml(vars: {
  nome: string;
  email?: string;
  telefone?: string;
  campanha?: string;
  plataforma?: string;
  clienteNome?: string;
}): string {
  const tpl = base(`
    <div class="header">
      <h1>Novo lead capturado 🎯</h1>
      <p>Um lead acabou de entrar pelo webhook do CRM</p>
    </div>
    <div class="body">
      <span class="badge badge-novo">novo</span>
      <table class="info">
        <tr><td>Nome</td><td><strong>{{nome}}</strong></td></tr>
        <tr><td>E-mail</td><td>{{email}}</td></tr>
        <tr><td>Telefone</td><td>{{telefone}}</td></tr>
        <tr><td>Campanha</td><td>{{campanha}}</td></tr>
        <tr><td>Plataforma</td><td>{{plataforma}}</td></tr>
        <tr><td>Cliente</td><td>{{clienteNome}}</td></tr>
      </table>
      <a href="{{appUrl}}/crm" class="btn">Ver no CRM →</a>
    </div>
  `);
  return fill(tpl, {
    nome: vars.nome,
    email: vars.email ?? "—",
    telefone: vars.telefone ?? "—",
    campanha: vars.campanha ?? "—",
    plataforma: vars.plataforma ?? "—",
    clienteNome: vars.clienteNome ?? "—",
  });
}

// ─── 2. Lead mudou de estágio ─────────────────────────────────────────────────
type Estagio = "novo" | "contato" | "proposta" | "fechado" | "perdido";

export function estagioMudouHtml(vars: {
  leadNome: string;
  estagioAnterior: string;
  estagioNovo: Estagio;
  valor?: number;
  anotacao?: string;
}): string {
  const badgeClass = `badge-${vars.estagioNovo}`;
  const valorStr =
    vars.valor != null
      ? `R$ ${vars.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
      : "—";

  const tpl = base(`
    <div class="header">
      <h1>Lead atualizado</h1>
      <p>Mudança de estágio no pipeline de vendas</p>
    </div>
    <div class="body">
      <span class="badge ${badgeClass}">{{estagioNovo}}</span>
      <table class="info">
        <tr><td>Lead</td><td><strong>{{leadNome}}</strong></td></tr>
        <tr><td>De → Para</td><td>{{estagioAnterior}} → <strong>{{estagioNovo}}</strong></td></tr>
        <tr><td>Valor</td><td>{{valor}}</td></tr>
        <tr><td>Anotação</td><td>{{anotacao}}</td></tr>
      </table>
      <a href="{{appUrl}}/crm" class="btn">Ver no CRM →</a>
    </div>
  `);
  return fill(tpl, {
    leadNome: vars.leadNome,
    estagioAnterior: vars.estagioAnterior,
    estagioNovo: vars.estagioNovo,
    valor: valorStr,
    anotacao: vars.anotacao ?? "—",
  });
}

// ─── 3. Deal fechado ──────────────────────────────────────────────────────────
export function dealFechadoHtml(vars: {
  leadNome: string;
  valor: number;
  campanha?: string;
}): string {
  const valorStr = `R$ ${vars.valor.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
  })}`;
  const tpl = base(`
    <div class="header">
      <h1>🏆 Deal fechado!</h1>
      <p>Conversão confirmada no CRM</p>
    </div>
    <div class="body">
      <span class="badge badge-fechado">fechado</span>
      <table class="info">
        <tr><td>Lead</td><td><strong>{{leadNome}}</strong></td></tr>
        <tr><td>Valor</td><td><strong style="color:#34d399; font-size:18px">{{valor}}</strong></td></tr>
        <tr><td>Campanha</td><td>{{campanha}}</td></tr>
      </table>
      <a href="{{appUrl}}/crm" class="btn">Ver analytics de CRM →</a>
    </div>
  `);
  return fill(tpl, {
    leadNome: vars.leadNome,
    valor: valorStr,
    campanha: vars.campanha ?? "—",
  });
}

// ─── 4. Proposta vencida ──────────────────────────────────────────────────────
export function propostaVencidaHtml(vars: {
  leads: Array<{ nome: string; diasSemMovimento: number }>;
}): string {
  const rows = vars.leads
    .map(
      (l) =>
        `<tr><td>${l.nome}</td><td style="color:#fbbf24">${l.diasSemMovimento} dias sem movimento</td></tr>`
    )
    .join("");

  const tpl = base(`
    <div class="header">
      <h1>⚠️ Propostas vencidas</h1>
      <p>Leads em proposta há mais de 7 dias sem atualização</p>
    </div>
    <div class="body">
      <table class="info">
        <tr><td colspan="2" style="color:#a3a3a3; font-size:12px; padding-bottom:12px">LEAD · TEMPO PARADO</td></tr>
        ${rows}
      </table>
      <a href="{{appUrl}}/crm" class="btn">Agir agora →</a>
    </div>
  `);
  return fill(tpl, {});
}
