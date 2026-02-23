"use client";

// /components/SeletorCliente.tsx
// Dropdown de seleção de cliente no header
// Inclui botão para criar novo cliente

import { useState } from "react";
import { ChevronDown, Plus, Users, Loader2, Check, AlertCircle } from "lucide-react";
import type { Cliente } from "@/app/hooks/useCliente";

interface Props {
  clientes: Cliente[];
  clienteAtual: Cliente | null;
  loading: boolean;
  onSelecionar: (cliente: Cliente) => void;
  onCriar: (dados: { nome: string; meta_account_id?: string; ticket_medio?: number }) => Promise<Cliente | null>;
}

function AvatarCliente({ cliente, size = "sm" }: { cliente: Cliente; size?: "sm" | "md" }) {
  const s = size === "sm" ? "w-6 h-6 text-[10px]" : "w-8 h-8 text-[12px]";
  return (
    <div
      className={`${s} rounded-lg flex items-center justify-center font-bold text-white shrink-0`}
      style={{ backgroundColor: cliente.cor || "#6366f1" }}
    >
      {cliente.nome.charAt(0).toUpperCase()}
    </div>
  );
}

function ModalNovoCliente({ onCriar, onFechar }: {
  onCriar: (dados: { nome: string; meta_account_id?: string; ticket_medio?: number }) => Promise<Cliente | null>;
  onFechar: () => void;
}) {
  const [nome, setNome]             = useState("");
  const [accountId, setAccountId]   = useState("");
  const [ticket, setTicket]         = useState("");
  const [loading, setLoading]       = useState(false);
  const [erro, setErro]             = useState("");

  async function handleCriar() {
    if (!nome.trim()) { setErro("Nome é obrigatório."); return; }
    setLoading(true);
    const novo = await onCriar({
      nome: nome.trim(),
      meta_account_id: accountId.trim() || undefined,
      ticket_medio: parseFloat(ticket) || undefined,
    });
    if (!novo) setErro("Erro ao criar cliente. Tente novamente.");
    else onFechar();
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onFechar()}>
      <div className="w-full max-w-[380px] bg-[#111113] border border-white/[0.08] rounded-[20px] p-6">
        <h3 className="text-[15px] font-bold text-white mb-5">Novo cliente</h3>

        <div className="space-y-4">
          <div>
            <p className="text-[11px] text-white/30 mb-1.5">Nome do cliente *</p>
            <input
              autoFocus
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Ex: Clínica Dr. Silva"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-[13px] text-white placeholder-white/20 focus:outline-none focus:border-white/20"
            />
          </div>
          <div>
            <p className="text-[11px] text-white/30 mb-1.5">Account ID Meta <span className="text-white/15">(opcional)</span></p>
            <input
              value={accountId}
              onChange={e => setAccountId(e.target.value)}
              placeholder="act_xxxxxxxxxx"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-[13px] text-white placeholder-white/20 focus:outline-none focus:border-white/20 font-mono"
            />
          </div>
          <div>
            <p className="text-[11px] text-white/30 mb-1.5">Ticket médio R$ <span className="text-white/15">(opcional)</span></p>
            <input
              type="number"
              value={ticket}
              onChange={e => setTicket(e.target.value)}
              placeholder="450"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-[13px] text-white placeholder-white/20 focus:outline-none focus:border-white/20"
            />
          </div>

          {erro && (
            <div className="flex items-center gap-2 p-2.5 bg-red-500/[0.06] border border-red-500/15 rounded-xl">
              <AlertCircle size={12} className="text-red-400 shrink-0" />
              <p className="text-[11px] text-red-400">{erro}</p>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={onFechar}
            className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-[12px] text-white/40 hover:text-white transition-colors">
            Cancelar
          </button>
          <button onClick={handleCriar} disabled={loading}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/[0.07] border border-white/[0.12] text-[12px] font-semibold text-white hover:bg-white/[0.10] transition-all disabled:opacity-50">
            {loading ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
            {loading ? "Criando..." : "Criar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SeletorCliente({ clientes, clienteAtual, loading, onSelecionar, onCriar }: Props) {
  const [aberto, setAberto]         = useState(false);
  const [modalNovo, setModalNovo]   = useState(false);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
        <Loader2 size={13} className="animate-spin text-white/20" />
        <span className="text-[12px] text-white/20">Carregando...</span>
      </div>
    );
  }

  if (clientes.length === 0) {
    return (
      <>
        <button onClick={() => setModalNovo(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] transition-all">
          <Plus size={13} className="text-white/40" />
          <span className="text-[12px] text-white/50">Adicionar cliente</span>
        </button>
        {modalNovo && <ModalNovoCliente onCriar={onCriar} onFechar={() => setModalNovo(false)} />}
      </>
    );
  }

  return (
    <>
      <div className="relative">
        <button onClick={() => setAberto(a => !a)}
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] transition-all">
          {clienteAtual ? (
            <>
              <AvatarCliente cliente={clienteAtual} />
              <span className="text-[13px] font-medium text-white max-w-[140px] truncate">{clienteAtual.nome}</span>
            </>
          ) : (
            <>
              <Users size={14} className="text-white/30" />
              <span className="text-[13px] text-white/40">Selecionar cliente</span>
            </>
          )}
          <ChevronDown size={13} className={`text-white/25 transition-transform ${aberto ? "rotate-180" : ""}`} />
        </button>

        {aberto && (
          <div className="absolute top-full mt-2 left-0 w-[260px] bg-[#111113] border border-white/[0.08] rounded-[16px] overflow-hidden shadow-2xl z-50">
            <div className="p-2 max-h-[280px] overflow-y-auto">
              {clientes.map(c => (
                <button key={c.id}
                  onClick={() => { onSelecionar(c); setAberto(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.05] transition-colors text-left">
                  <AvatarCliente cliente={c} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-white truncate">{c.nome}</p>
                    <p className="text-[10px] text-white/25">
                      {c.campanhas_ativas} ativas · R${Math.round(c.gasto_total).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  {clienteAtual?.id === c.id && <Check size={13} className="text-emerald-400 shrink-0" />}
                </button>
              ))}
            </div>
            <div className="border-t border-white/[0.05] p-2">
              <button onClick={() => { setAberto(false); setModalNovo(true); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-white/[0.05] transition-colors text-left">
                <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] border-dashed flex items-center justify-center">
                  <Plus size={13} className="text-white/30" />
                </div>
                <span className="text-[12px] text-white/40">Adicionar cliente</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {modalNovo && <ModalNovoCliente onCriar={onCriar} onFechar={() => setModalNovo(false)} />}
    </>
  );
}
