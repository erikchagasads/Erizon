"use client";

import { useMemo, useRef, useState } from "react";
import { DM_Mono, Sora } from "next/font/google";

const sora = Sora({
  subsets: ["latin"],
  weight: ["300", "400", "600"],
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400"],
});

type FormularioLandingProps = {
  userId?: string;
  clienteId?: string;
  enabled: boolean;
};

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function TrustItem({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex items-center gap-1.5 text-[11px] text-[#3A3950] ${dmMono.className}`}>
      {children}
      <span>{label}</span>
    </div>
  );
}

export default function FormularioLanding({
  userId,
  clienteId,
  enabled,
}: FormularioLandingProps) {
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [fieldError, setFieldError] = useState<"nome" | "telefone" | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  const primeiroNome = useMemo(() => nome.trim().split(" ")[0] || "voce", [nome]);

  const actionUrl = useMemo(() => {
    if (!enabled || !userId || !clienteId) return "";
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams(window.location.search);
    if (!params.has("plataforma")) params.set("plataforma", "lp_formulario");
    return `/api/crm/webhook/${userId}/${clienteId}?${params.toString()}`;
  }, [clienteId, enabled, userId]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const numero = whatsapp.replace(/\D/g, "");
    if (!nome.trim()) {
      event.preventDefault();
      setFieldError("nome");
      return;
    }
    if (numero.length < 10) {
      event.preventDefault();
      setFieldError("telefone");
      return;
    }

    event.preventDefault();
    setFieldError(null);
    setSubmitting(true);
    setShowSuccess(true);

    window.setTimeout(() => {
      formRef.current?.submit();
    }, 700);
  }

  const inputBase =
    "w-full box-border rounded-[10px] border border-white/10 bg-[#0A0A0F] px-4 py-[13px] text-[15px] text-[#E8E7F0] outline-none transition placeholder:text-[#2E2D3A] focus:border-[rgba(127,119,221,0.5)]";

  const errorClass = "border-[rgba(226,75,74,0.5)]";

  return (
    <main
      className={`relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#0A0A0F] px-5 py-12 text-white ${sora.className}`}
    >
      <div className="pointer-events-none absolute left-1/2 top-[-160px] h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(83,74,183,0.18)_0%,transparent_70%)]" />
      <div className="pointer-events-none absolute bottom-[-100px] right-[-100px] h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle,rgba(29,158,117,0.10)_0%,transparent_70%)]" />

      <div className="relative z-10 flex w-full max-w-[420px] flex-col items-center">
        <div
          className={`mb-7 inline-flex items-center gap-1.5 rounded-full border border-[rgba(83,74,183,0.4)] bg-[rgba(83,74,183,0.15)] px-3 py-[5px] text-[11px] uppercase tracking-[0.12em] text-[#AFA9EC] ${dmMono.className}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[#7F77DD] animate-pulse" />
          Atendimento via WhatsApp
        </div>

        <h1 className="mx-auto mb-3 max-w-[520px] text-center text-[clamp(28px,5vw,44px)] font-semibold leading-[1.15] tracking-[-0.02em] text-[#F0EFF8]">
          O imóvel certo
          <br />
          não espera.
          <br />
          <span className="text-[#F0B24F]">Você também não.</span>
        </h1>

        <p className="mb-11 max-w-[360px] text-center text-[15px] font-light leading-[1.6] text-[#6B6A7A]">
          Preencha em segundos. O atendimento é imediato, e continua no WhatsApp.
        </p>

        <div className="relative w-full rounded-[20px] border border-white/10 bg-[#12121A] px-8 py-9">
          <div className="pointer-events-none absolute inset-0 rounded-[20px] border border-transparent bg-[linear-gradient(135deg,rgba(127,119,221,0.2),transparent_60%)] [mask-composite:exclude] [-webkit-mask-composite:destination-out] [mask:linear-gradient(#fff_0_0)_padding-box,linear-gradient(#fff_0_0)] [-webkit-mask:linear-gradient(#fff_0_0)_padding-box,linear-gradient(#fff_0_0)]" />

          {!enabled ? (
            <div className={`rounded-2xl border border-[rgba(83,74,183,0.35)] bg-[rgba(83,74,183,0.08)] px-4 py-4 text-center text-xs leading-6 text-[#AFA9EC] ${dmMono.className}`}>
              Abra esta pagina no formato
              <div className="mt-2 break-all text-[#F0EFF8]">/lp/formulario/USER_ID/CLIENTE_ID</div>
            </div>
          ) : (
            <>
              <form
                ref={formRef}
                action={actionUrl}
                method="POST"
                onSubmit={handleSubmit}
                className={showSuccess ? "hidden" : ""}
              >
                <div className="mb-5">
                  <div className={`mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#4A4960] ${dmMono.className}`}>
                    Nome
                  </div>
                  <input
                    name="nome"
                    type="text"
                    value={nome}
                    onChange={(event) => {
                      setNome(event.target.value);
                      if (fieldError === "nome") setFieldError(null);
                    }}
                    placeholder="Como prefere ser chamado?"
                    autoComplete="given-name"
                    className={`${inputBase} ${fieldError === "nome" ? errorClass : ""}`}
                  />
                </div>

                <div className="mb-5">
                  <div className={`mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#4A4960] ${dmMono.className}`}>
                    WhatsApp
                  </div>
                  <input
                    name="telefone"
                    type="tel"
                    value={whatsapp}
                    onChange={(event) => {
                      setWhatsapp(formatPhone(event.target.value));
                      if (fieldError === "telefone") setFieldError(null);
                    }}
                    placeholder="(11) 99999-9999"
                    autoComplete="tel"
                    className={`${inputBase} ${fieldError === "telefone" ? errorClass : ""}`}
                  />
                </div>

                <input type="hidden" name="platform" value="lp_formulario" />

                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-[10px] bg-[linear-gradient(135deg,#534AB7,#7F77DD)] px-4 py-[15px] text-[15px] font-semibold tracking-[-0.01em] text-white transition hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-[18px] w-[18px]">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                    <path d="M11.996 0C5.373 0 0 5.373 0 12c0 2.127.562 4.122 1.539 5.852L0 24l6.335-1.658A11.956 11.956 0 0011.996 24C18.619 24 24 18.627 24 12S18.619 0 11.996 0zm0 21.818a9.822 9.822 0 01-5.028-1.378l-.36-.213-3.762.986 1.003-3.664-.235-.376A9.821 9.821 0 012.182 12c0-5.422 4.392-9.818 9.814-9.818 5.422 0 9.818 4.396 9.818 9.818S17.418 21.818 11.996 21.818z" />
                  </svg>
                  {submitting ? "Abrindo..." : "Falar no WhatsApp"}
                </button>
              </form>

              {showSuccess ? (
                <div className="flex flex-col items-center gap-3 py-3 text-center">
                  <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full border border-[rgba(29,158,117,0.4)] bg-[rgba(29,158,117,0.15)]">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2.5">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </div>
                  <div className="text-center text-[18px] font-semibold text-[#E8E7F0]">
                    Perfeito, {primeiroNome}!
                  </div>
                  <div className={`text-center text-[13px] text-[#4A4960] ${dmMono.className}`}>
                    Redirecionando para o WhatsApp...
                  </div>
                </div>
              ) : (
                <div className="mt-5 flex items-center justify-center gap-5">
                  <TrustItem label="Dados protegidos">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3 shrink-0">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  </TrustItem>
                  <div className="h-3 w-px bg-white/5" />
                  <TrustItem label="Resposta rapida">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3 shrink-0">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                  </TrustItem>
                  <div className="h-3 w-px bg-white/5" />
                  <TrustItem label="Sem spam">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3 shrink-0">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <path d="M22 4L12 14.01l-3-3" />
                    </svg>
                  </TrustItem>
                </div>
              )}
            </>
          )}
        </div>

        <div className={`mt-4 text-center text-[12px] tracking-[0.04em] text-[#2E2D3A] ${dmMono.className}`}>
          O atendimento continua no WhatsApp
        </div>
        <div className={`mt-9 text-[11px] uppercase tracking-[0.15em] text-[#2A2940] ${dmMono.className}`}>
          Erizon Â· AI Marketing OS
        </div>
      </div>
    </main>
  );
}
