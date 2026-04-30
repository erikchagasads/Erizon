"use client";

import { useState } from "react";
import { ArrowRight, Loader2, Mail } from "lucide-react";

export default function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/blog/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não foi possível entrar na lista.");
      setStatus("success");
      setMessage(data.message || "Inscrição confirmada. Você receberá os próximos artigos da Erizon.");
      setEmail("");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Erro inesperado.");
    }
  }

  return (
    <div className="border border-cyan-200/20 bg-cyan-200/[0.055] p-7">
      <Mail className="mb-4 text-cyan-100" size={22} />
      <h2 className="text-[21px] font-black">Receba análises da Erizon</h2>
      <p className="mt-3 text-[14px] leading-relaxed text-white/58">
        Insights sobre IA, tráfego pago, criativos e performance direto para sua rotina de decisão.
      </p>
      <form onSubmit={submit} className="mt-6 flex flex-col gap-3 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="seu@email.com"
          className="min-h-11 flex-1 rounded-[8px] border border-white/10 bg-[#071014] px-4 text-[14px] text-white outline-none placeholder:text-white/30 focus:border-cyan-200/45"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[8px] bg-cyan-200 px-5 text-[13px] font-black text-[#041016] disabled:opacity-60"
        >
          {status === "loading" ? <Loader2 className="animate-spin" size={15} /> : "Entrar na lista"}
          {status !== "loading" && <ArrowRight size={15} />}
        </button>
      </form>
      {message && (
        <p className={`mt-3 text-[12px] ${status === "error" ? "text-red-200" : "text-cyan-50/75"}`}>
          {message}
        </p>
      )}
    </div>
  );
}

