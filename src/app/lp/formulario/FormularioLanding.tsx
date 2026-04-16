"use client";

import { useMemo, useState } from "react";
import { ArrowRight, MessageCircle, ShieldCheck, Sparkles } from "lucide-react";

type FormularioLandingProps = {
  userId?: string;
  clienteId?: string;
  enabled: boolean;
};

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export default function FormularioLanding({
  userId,
  clienteId,
  enabled,
}: FormularioLandingProps) {
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const actionUrl = useMemo(() => {
    if (!enabled || !userId || !clienteId || typeof window === "undefined") return "";
    const params = new URLSearchParams(window.location.search);
    if (!params.has("plataforma")) params.set("plataforma", "lp_formulario");
    return `/api/crm/webhook/${userId}/${clienteId}?${params.toString()}`;
  }, [clienteId, enabled, userId]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const numero = whatsapp.replace(/\D/g, "");
    if (!nome.trim() || numero.length < 10) {
      event.preventDefault();
      window.alert("Preencha seu nome e WhatsApp corretamente.");
      return;
    }
    setSubmitting(true);
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#07111f] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(73,180,255,0.18),_transparent_32%),radial-gradient(circle_at_80%_20%,_rgba(31,214,168,0.14),_transparent_26%),linear-gradient(180deg,_#07111f_0%,_#091628_52%,_#050a13_100%)]" />
      <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:36px_36px]" />

      <section className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-between px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between">
          <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-400/15 text-cyan-300">
              <Sparkles size={16} />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/70">Formulario</p>
              <p className="text-[11px] text-white/35">Captação direta para campanhas</p>
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs text-emerald-200 sm:flex">
            <ShieldCheck size={14} />
            Seus dados ficam protegidos
          </div>
        </header>

        <div className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.28em] text-cyan-200">
              <MessageCircle size={14} />
              Contato rapido
            </div>

            <h1 className="max-w-3xl text-4xl font-semibold leading-[1.02] text-white sm:text-5xl lg:text-7xl">
              Um formulario simples,
              <span className="block bg-gradient-to-r from-cyan-200 via-white to-emerald-200 bg-clip-text text-transparent">
                pronto para qualquer cliente.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-8 text-white/66 sm:text-lg">
              A pessoa preenche nome e WhatsApp, o lead entra no CRM e o navegador segue direto
              para o WhatsApp configurado para esse cliente.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                "Usa o cliente certo pela propria URL",
                "Mantem UTMs para identificar a campanha",
                "Redireciona via webhook para o WhatsApp do cliente",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-sm leading-6 text-white/72 backdrop-blur"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-3 rounded-[2rem] bg-gradient-to-br from-cyan-400/20 via-transparent to-emerald-400/20 blur-2xl" />
            <div className="relative rounded-[2rem] border border-white/10 bg-[#0b1628]/90 p-5 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-7">
              <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/45">Receba contato</p>
                <h2 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">Preencha e continue no WhatsApp</h2>
                <p className="mt-3 text-sm leading-7 text-white/55">
                  O atendimento continua no canal oficial do cliente logo depois do envio.
                </p>
              </div>

              {!enabled ? (
                <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-4 text-sm leading-7 text-amber-100">
                  Esta rota precisa ser aberta com identificador do usuario e do cliente.
                  Use o formato <span className="font-mono text-amber-50">/lp/formulario/USER_ID/CLIENTE_ID</span>.
                </div>
              ) : (
                <form action={actionUrl} method="POST" onSubmit={handleSubmit} className="space-y-4">
                  <label className="block">
                    <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.24em] text-white/40">
                      Nome
                    </span>
                    <input
                      name="nome"
                      value={nome}
                      onChange={(event) => setNome(event.target.value)}
                      placeholder="Como podemos te chamar?"
                      autoComplete="name"
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-base text-white placeholder:text-white/22 outline-none transition focus:border-cyan-300/50 focus:bg-white/[0.06]"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.24em] text-white/40">
                      WhatsApp
                    </span>
                    <input
                      name="telefone"
                      value={whatsapp}
                      onChange={(event) => setWhatsapp(formatPhone(event.target.value))}
                      placeholder="(11) 99999-9999"
                      autoComplete="tel"
                      inputMode="numeric"
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-base text-white placeholder:text-white/22 outline-none transition focus:border-emerald-300/50 focus:bg-white/[0.06]"
                    />
                  </label>

                  <input type="hidden" name="platform" value="lp_formulario" />

                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-300 via-cyan-400 to-emerald-300 px-5 py-4 text-sm font-semibold uppercase tracking-[0.24em] text-slate-950 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? "Abrindo WhatsApp" : "Continuar"}
                    <ArrowRight size={16} />
                  </button>
                </form>
              )}

              <p className="mt-4 text-center text-xs leading-6 text-white/35">
                Fluxo pensado para campanhas pagas com o minimo de friccao.
              </p>
            </div>
          </div>
        </div>

        <footer className="flex flex-col gap-3 border-t border-white/10 pt-5 text-xs text-white/30 sm:flex-row sm:items-center sm:justify-between">
          <p>Rota base: /lp/formulario/USER_ID/CLIENTE_ID</p>
          <p>Template generico ligado ao CRM e ao WhatsApp do cliente.</p>
        </footer>
      </section>
    </main>
  );
}
