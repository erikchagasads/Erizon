"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";

export default function CRMClienteLoginPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [modo, setModo] = useState<"verificando" | "login" | "registro">("verificando");
  const [nomeCliente, setNomeCliente] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  // Verifica se já está autenticado ou se precisa registrar
  useEffect(() => {
    if (!token) return;

    (async () => {
      // Testa se já tem sessão ativa
      const meRes = await fetch("/api/crm-cliente/auth/me");
      if (meRes.ok) {
        const me = await meRes.json() as { authenticated: boolean; crm_token: string };
        if (me.authenticated && me.crm_token === token) {
          router.replace(`/crm/cliente/${token}`);
          return;
        }
      }

      // Verifica se o token existe e se já tem conta criada
      // Tenta fazer um "ping" no endpoint de leads — se retornar 401 com redirect, está em login
      // Se retornar 404, token inválido
      const leadsRes = await fetch(`/api/crm-cliente/${token}/leads`);
      if (leadsRes.status === 404) {
        setErro("Link inválido. Solicite um novo link ao seu gestor.");
        setModo("login");
        return;
      }

      // Verifica se já tem conta criada (tenta fazer login sem credenciais — se der 401, precisamos login ou registro)
      // Usa um endpoint auxiliar para verificar existência de conta
      const checkRes = await fetch(`/api/crm-cliente/auth/check?token=${token}`);
      if (checkRes.ok) {
        const check = await checkRes.json() as { temConta: boolean; nome: string };
        setNomeCliente(check.nome);
        setModo(check.temConta ? "login" : "registro");
      } else {
        setModo("login");
      }
    })();
  }, [token, router]);

  async function handleSubmit() {
    setErro("");
    if (!email.trim() || !senha.trim()) {
      setErro("Preencha email e senha");
      return;
    }
    if (modo === "registro" && senha.length < 6) {
      setErro("Senha deve ter pelo menos 6 caracteres");
      return;
    }

    setCarregando(true);

    const endpoint = modo === "registro"
      ? "/api/crm-cliente/auth/register"
      : "/api/crm-cliente/auth/login";

    const body = modo === "registro"
      ? { crm_token: token, email, senha }
      : { email, senha };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json() as { ok?: boolean; error?: string; crm_token?: string };

    if (!res.ok) {
      setErro(data.error ?? "Erro ao autenticar");
      setCarregando(false);
      return;
    }

    // Redireciona para o CRM
    router.replace(`/crm/cliente/${data.crm_token ?? token}`);
  }

  if (modo === "verificando") {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-400" size={28} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] flex flex-col items-center justify-center p-4">

      {/* Card */}
      <div className="w-full max-w-sm">

        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={28} className="text-indigo-400" />
          </div>
          {nomeCliente && (
            <p className="text-white/40 text-sm mb-1">Bem-vindo,</p>
          )}
          <h1 className="text-white font-semibold text-xl">
            {nomeCliente || "Acesso ao CRM"}
          </h1>
          <p className="text-white/30 text-sm mt-1">
            {modo === "registro"
              ? "Crie sua senha para acessar seu painel de leads"
              : "Entre com seu email e senha"}
          </p>
        </div>

        {/* Form */}
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-4">

          {/* Email */}
          <div>
            <label className="text-xs text-white/40 mb-1.5 block">Email</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                placeholder="seu@email.com"
                autoComplete="email"
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50 transition-colors"
              />
            </div>
          </div>

          {/* Senha */}
          <div>
            <label className="text-xs text-white/40 mb-1.5 block">
              {modo === "registro" ? "Criar senha" : "Senha"}
            </label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
              <input
                type={mostrarSenha ? "text" : "password"}
                value={senha}
                onChange={e => setSenha(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                placeholder={modo === "registro" ? "Mínimo 6 caracteres" : "••••••••"}
                autoComplete={modo === "registro" ? "new-password" : "current-password"}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-10 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50 transition-colors"
              />
              <button
                type="button"
                onClick={() => setMostrarSenha(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors"
              >
                {mostrarSenha ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {modo === "registro" && (
              <p className="text-[10px] text-white/20 mt-1">Você usará essa senha para acessar seu CRM</p>
            )}
          </div>

          {/* Erro */}
          {erro && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
              <p className="text-red-400 text-xs">{erro}</p>
            </div>
          )}

          {/* Botão */}
          <button
            onClick={handleSubmit}
            disabled={carregando}
            className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            {carregando
              ? <><Loader2 size={15} className="animate-spin" /> Aguarde...</>
              : modo === "registro" ? "Criar conta e entrar" : "Entrar"
            }
          </button>

          {/* Trocar modo */}
          <div className="text-center pt-1">
            {modo === "login" ? (
              <button
                onClick={() => { setModo("registro"); setErro(""); }}
                className="text-xs text-white/30 hover:text-white/60 transition-colors"
              >
                Primeiro acesso? Criar senha
              </button>
            ) : (
              <button
                onClick={() => { setModo("login"); setErro(""); }}
                className="text-xs text-white/30 hover:text-white/60 transition-colors"
              >
                Já tenho senha → Entrar
              </button>
            )}
          </div>
        </div>

        {/* Rodapé */}
        <p className="text-center text-white/15 text-[11px] mt-6">
          Powered by Erizon · Seus dados são seguros
        </p>
      </div>
    </div>
  );
}
