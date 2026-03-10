"use client";

// app/lp/[codigo]/page.tsx
// NOVO: Landing page que captura leads vindos dos anúncios do Meta Ads
// Fluxo: visitante clica no anúncio → acessa /lp/{codigo} → preenche formulário
//        → lead entra no CRM automaticamente → redireciona para WhatsApp do corretor

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Campanha {
  id: string;
  user_id: string;        // gestor_id
  corretor_id: string;
  corretor_tel: string;
  nome: string;
  badge: string;
  titulo: string;
  subtitulo: string;
  status: string;
}

// Renderiza o título com <span> colorido em verde
function TituloHTML({ html }: { html: string }) {
  return (
    <h1
      style={s.titulo}
      dangerouslySetInnerHTML={{
        __html: html.replace(
          /<span>(.*?)<\/span>/g,
          '<span style="color:#10b981">$1</span>'
        ),
      }}
    />
  );
}

export default function LandingPage({ params }: { params: { codigo: string } }) {
  const { codigo } = params;

  const [campanha, setCampanha]   = useState<Campanha | null>(null);
  const [loading, setLoading]     = useState(true);
  const [enviando, setEnviando]   = useState(false);
  const [enviado, setEnviado]     = useState(false);
  const [notFound, setNotFound]   = useState(false);
  const [form, setForm]           = useState({ nome: "", telefone: "", mensagem: "" });
  const [erroForm, setErroForm]   = useState("");

  useEffect(() => {
    async function buscarCampanha() {
      const { data, error } = await supabase
        .from("campanhas_crm")
        .select("id, user_id, corretor_id, corretor_tel, nome, badge, titulo, subtitulo, status")
        .eq("codigo_unico", codigo)
        .single();

      if (error || !data) {
        setNotFound(true);
      } else if (data.status === "encerrada") {
        setNotFound(true);
      } else {
        setCampanha(data as Campanha);
      }
      setLoading(false);
    }
    buscarCampanha();
  }, [codigo]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErroForm("");

    // Validação mínima
    const tel = form.telefone.replace(/\D/g, "");
    if (tel.length < 10) {
      setErroForm("Digite um número de telefone válido com DDD.");
      return;
    }
    if (!campanha) return;

    setEnviando(true);
    try {
      // Inserir lead no CRM
      const { error } = await supabase.from("leads").insert({
        user_id: campanha.corretor_id,   // corretor responsável
        gestor_id: campanha.user_id,     // gestor dono da campanha
        campanha_id: campanha.id,
        campanha_nome: campanha.nome,
        telefone: tel,
        mensagem_original: form.mensagem || `Lead via campanha: ${campanha.nome}`,
        canal: "landing_page",
        status: "novo",
      });

      if (error) throw error;

      setEnviado(true);

      // Redirecionar para WhatsApp do corretor após 1.5s
      if (campanha.corretor_tel) {
        const msg = encodeURIComponent(
          form.mensagem ||
          `Olá! Vim pelo anúncio "${campanha.nome}" e tenho interesse. Meu nome é ${form.nome || "cliente"}.`
        );
        const waUrl = `https://wa.me/55${campanha.corretor_tel.replace(/\D/g, "")}?text=${msg}`;
        setTimeout(() => { window.location.href = waUrl; }, 1500);
      }
    } catch {
      setErroForm("Erro ao enviar. Tente novamente.");
    }
    setEnviando(false);
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={s.fullCenter}>
      <div style={s.spinner} />
    </div>
  );

  // ── Not found / encerrada ───────────────────────────────────────────────────
  if (notFound || !campanha) return (
    <div style={s.fullCenter}>
      <div style={s.notFound}>
        <span style={{ fontSize: 48 }}>🔍</span>
        <h2 style={{ color: "#fff", fontSize: 20, fontWeight: 700, margin: "16px 0 8px" }}>
          Campanha não encontrada
        </h2>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>
          Este link pode ter expirado ou sido encerrado.
        </p>
      </div>
    </div>
  );

  // ── Enviado com sucesso ─────────────────────────────────────────────────────
  if (enviado) return (
    <div style={s.fullCenter}>
      <div style={s.successCard}>
        <div style={s.successIcon}>✅</div>
        <h2 style={s.successTitulo}>Mensagem recebida!</h2>
        <p style={s.successSub}>
          Nossa equipe vai entrar em contato em breve.
          {campanha.corretor_tel && " Redirecionando para o WhatsApp..."}
        </p>
        {campanha.corretor_tel && (
          <a
            href={`https://wa.me/55${campanha.corretor_tel.replace(/\D/g, "")}`}
            style={s.btnWhatsApp}
          >
            💬 Abrir WhatsApp agora
          </a>
        )}
      </div>
    </div>
  );

  // ── Landing Page ────────────────────────────────────────────────────────────
  return (
    <div style={s.root}>
      {/* Background */}
      <div style={s.bg} />
      <div style={s.bgGlow} />

      <div style={s.container}>
        {/* Conteúdo principal */}
        <div style={s.content}>
          {/* Badge */}
          {campanha.badge && (
            <span style={s.badge}>{campanha.badge}</span>
          )}

          {/* Título */}
          <TituloHTML html={campanha.titulo} />

          {/* Subtítulo */}
          {campanha.subtitulo && (
            <p style={s.subtitulo}>{campanha.subtitulo}</p>
          )}

          {/* Prova social / diferenciais */}
          <div style={s.bullets}>
            {[
              "✅ Atendimento rápido e personalizado",
              "✅ Sem compromisso, apenas uma conversa",
              "✅ Nossa equipe responde em minutos",
            ].map((item, i) => (
              <p key={i} style={s.bulletItem}>{item}</p>
            ))}
          </div>
        </div>

        {/* Formulário */}
        <div style={s.formCard}>
          <h3 style={s.formTitulo}>
            {campanha.corretor_tel
              ? "Quero ser atendido pelo WhatsApp"
              : "Quero mais informações"}
          </h3>
          <p style={s.formSub}>Preencha abaixo e nossa equipe entra em contato</p>

          <form onSubmit={handleSubmit} style={s.form}>
            <div style={s.campo}>
              <label style={s.label}>Nome</label>
              <input
                type="text"
                value={form.nome}
                onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                placeholder="Seu nome completo"
                style={s.input}
              />
            </div>

            <div style={s.campo}>
              <label style={s.label}>
                WhatsApp <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="tel"
                value={form.telefone}
                onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
                placeholder="(11) 99999-9999"
                required
                style={s.input}
              />
            </div>

            <div style={s.campo}>
              <label style={s.label}>Mensagem (opcional)</label>
              <textarea
                value={form.mensagem}
                onChange={e => setForm(f => ({ ...f, mensagem: e.target.value }))}
                placeholder="O que você está procurando?"
                rows={3}
                style={{ ...s.input, resize: "vertical" as const }}
              />
            </div>

            {erroForm && (
              <div style={s.erroBox}>⚠️ {erroForm}</div>
            )}

            <button
              type="submit"
              disabled={enviando}
              style={enviando ? { ...s.btnSubmit, opacity: 0.6, cursor: "not-allowed" } : s.btnSubmit}
            >
              {enviando ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <span style={s.spinnerBtn} /> Enviando...
                </span>
              ) : (
                campanha.corretor_tel
                  ? "💬 Quero ser atendido agora"
                  : "Enviar mensagem →"
              )}
            </button>

            <p style={s.disclaimer}>
              Ao enviar, você concorda em ser contatado sobre esta oferta.
              Seus dados não serão compartilhados com terceiros.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  root: {
    minHeight: "100vh",
    backgroundColor: "#0a0a0f",
    fontFamily: "'DM Sans', 'Outfit', system-ui, sans-serif",
    position: "relative",
    overflow: "hidden",
  },
  bg: {
    position: "fixed", inset: 0,
    backgroundImage: "linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)",
    backgroundSize: "48px 48px",
    pointerEvents: "none",
  },
  bgGlow: {
    position: "fixed", top: -200, left: "50%", transform: "translateX(-50%)",
    width: 800, height: 600, borderRadius: "50%",
    background: "radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 65%)",
    pointerEvents: "none",
  },
  container: {
    position: "relative", zIndex: 1,
    maxWidth: 1100,
    margin: "0 auto",
    padding: "60px 24px",
    display: "grid",
    gridTemplateColumns: "1fr 480px",
    gap: 60,
    alignItems: "center",
    // Mobile handled via CSS — Next.js + Tailwind would be cleaner but staying inline for consistency
  },
  content: { display: "flex", flexDirection: "column" as const, gap: 24 },
  badge: {
    display: "inline-block",
    fontSize: 11, fontWeight: 700,
    color: "#10b981",
    background: "rgba(16,185,129,0.12)",
    border: "1px solid rgba(16,185,129,0.25)",
    padding: "4px 14px",
    borderRadius: 100,
    width: "fit-content",
    letterSpacing: "0.05em",
    textTransform: "uppercase" as const,
  },
  titulo: {
    fontSize: "clamp(28px, 4vw, 48px)",
    fontWeight: 900,
    color: "#fff",
    lineHeight: 1.15,
    letterSpacing: -1,
    margin: 0,
  },
  subtitulo: {
    fontSize: 17,
    color: "rgba(255,255,255,0.5)",
    lineHeight: 1.7,
    margin: 0,
    maxWidth: 480,
  },
  bullets: { display: "flex", flexDirection: "column" as const, gap: 8 },
  bulletItem: { fontSize: 15, color: "rgba(255,255,255,0.6)", margin: 0 },

  // Formulário
  formCard: {
    backgroundColor: "rgba(15,15,20,0.95)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 24,
    padding: "36px 32px",
    backdropFilter: "blur(20px)",
    boxShadow: "0 0 0 1px rgba(16,185,129,0.06), 0 32px 64px rgba(0,0,0,0.4)",
  },
  formTitulo: { fontSize: 20, fontWeight: 800, color: "#fff", margin: "0 0 6px", letterSpacing: -0.3 },
  formSub: { fontSize: 13, color: "rgba(255,255,255,0.3)", margin: "0 0 24px" },
  form: { display: "flex", flexDirection: "column" as const, gap: 16 },
  campo: { display: "flex", flexDirection: "column" as const, gap: 6 },
  label: { fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase" as const, letterSpacing: "0.1em" },
  input: {
    padding: "12px 14px",
    backgroundColor: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 12, fontSize: 14, color: "#fff",
    outline: "none", fontFamily: "inherit",
    width: "100%", boxSizing: "border-box" as const,
  },
  erroBox: {
    padding: "10px 14px", borderRadius: 10,
    background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
    color: "#f87171", fontSize: 12,
  },
  btnSubmit: {
    width: "100%", padding: "15px",
    background: "linear-gradient(135deg, #10b981, #059669)",
    border: "none", borderRadius: 14, color: "#fff",
    fontSize: 15, fontWeight: 800, cursor: "pointer",
    boxShadow: "0 8px 24px rgba(16,185,129,0.35)",
    letterSpacing: -0.2,
  },
  spinnerBtn: {
    display: "inline-block", width: 14, height: 14,
    border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff",
    borderRadius: "50%", animation: "spin 0.7s linear infinite",
  },
  disclaimer: { fontSize: 10, color: "rgba(255,255,255,0.2)", textAlign: "center" as const, lineHeight: 1.6, margin: 0 },

  // Estados
  fullCenter: {
    minHeight: "100vh", display: "flex", alignItems: "center",
    justifyContent: "center", backgroundColor: "#0a0a0f",
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  spinner: {
    width: 36, height: 36, borderRadius: "50%",
    border: "3px solid rgba(255,255,255,0.08)", borderTopColor: "#10b981",
    animation: "spin 0.8s linear infinite",
  },
  notFound: { textAlign: "center" as const, padding: 40 },
  successCard: {
    textAlign: "center" as const, padding: "48px 40px", maxWidth: 440,
    backgroundColor: "rgba(15,15,20,0.95)",
    border: "1px solid rgba(52,211,153,0.2)", borderRadius: 24,
  },
  successIcon: { fontSize: 56, marginBottom: 16 },
  successTitulo: { fontSize: 24, fontWeight: 800, color: "#fff", margin: "0 0 8px" },
  successSub: { fontSize: 14, color: "rgba(255,255,255,0.4)", margin: "0 0 24px", lineHeight: 1.6 },
  btnWhatsApp: {
    display: "inline-block", padding: "12px 28px",
    background: "#25d366", borderRadius: 12, color: "#fff",
    fontSize: 14, fontWeight: 700, textDecoration: "none",
  },
};