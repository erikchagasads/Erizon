"use client";

import { useEffect, useState } from "react";
import { Users, Plus, Trash2, Phone, Mail, Loader2, CheckCircle, AlertTriangle, X } from "lucide-react";
import Sidebar from "@/components/Sidebar";

interface Corretor {
  id: string;
  nome: string;
  telefone?: string;
  email?: string;
  created_at: string;
}

export default function CorretoresPage() {
  const [corretores, setCorretores] = useState<Corretor[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ nome: "", telefone: "", email: "" });

  async function carregar() {
    setLoading(true);
    const res = await fetch("/api/corretores");
    const json = await res.json();
    setCorretores(json.corretores ?? []);
    setLoading(false);
  }

  // Hidrata a lista inicial de corretores ao montar a página.
  useEffect(() => { carregar(); }, []);

  async function salvar() {
    if (!form.nome.trim()) { setErro("Nome obrigatório"); return; }
    setSalvando(true);
    const res = await fetch("/api/corretores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    if (json.error) { setErro(json.error); setSalvando(false); return; }
    setSucesso("Corretor cadastrado!");
    setTimeout(() => setSucesso(""), 3000);
    setForm({ nome: "", telefone: "", email: "" });
    setShowModal(false);
    carregar();
    setSalvando(false);
  }

  async function excluir(id: string) {
    if (!confirm("Excluir corretor?")) return;
    await fetch("/api/corretores", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    carregar();
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c]">
      <Sidebar />
      <main className="flex flex-col min-h-screen ml-24">

        {/* Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.05] bg-[#0c0c0f]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <Users size={13} className="text-white" />
            </div>
            <span className="text-[15px] font-bold text-white tracking-tight">Corretores</span>
            <span className="text-[10px] text-white/20 font-medium px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06]">ERIZON</span>
          </div>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-[12px] font-semibold text-white transition-all">
            <Plus size={13} /> Novo Corretor
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64 gap-3">
              <Loader2 size={18} className="animate-spin text-white/20" />
              <span className="text-[13px] text-white/20">Carregando...</span>
            </div>
          ) : corretores.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <Users size={32} className="text-white/10" />
              <p className="text-[14px] text-white/25">Nenhum corretor cadastrado</p>
              <button onClick={() => setShowModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-[12px] font-semibold text-white transition-all">
                <Plus size={13} /> Cadastrar primeiro corretor
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {corretores.map(c => (
                <div key={c.id} className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.07] hover:border-white/15 transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/20 flex items-center justify-center">
                      <span className="text-[14px] font-bold text-blue-400">{c.nome.charAt(0).toUpperCase()}</span>
                    </div>
                    <button onClick={() => excluir(c.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/[0.03] border border-white/[0.06] hover:bg-red-500/10 hover:border-red-500/20 transition-all">
                      <Trash2 size={11} className="text-white/20 hover:text-red-400" />
                    </button>
                  </div>
                  <p className="text-[14px] font-bold text-white mb-2">{c.nome}</p>
                  {c.telefone && (
                    <div className="flex items-center gap-1.5 mb-1">
                      <Phone size={10} className="text-white/20" />
                      <span className="text-[11px] text-white/40">{c.telefone}</span>
                    </div>
                  )}
                  {c.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail size={10} className="text-white/20" />
                      <span className="text-[11px] text-white/40">{c.email}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Novo Corretor */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowModal(false)}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="relative w-full max-w-md bg-[#0c0c0f] border border-white/[0.08] rounded-2xl p-6 shadow-2xl"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[15px] font-bold text-white">Novo Corretor</h2>
                <button onClick={() => setShowModal(false)}
                  className="w-7 h-7 rounded-xl flex items-center justify-center bg-white/[0.04] border border-white/[0.07] hover:bg-white/[0.08] transition-all">
                  <X size={13} className="text-white/40" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-1.5 block">Nome *</label>
                  <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                    placeholder="Nome do corretor"
                    className="w-full px-3 py-2.5 bg-white/[0.04] border border-white/[0.07] rounded-xl text-[13px] text-white placeholder-white/20 focus:outline-none focus:border-white/20 transition-all" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-1.5 block">Telefone</label>
                  <input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
                    placeholder="5519999999999"
                    className="w-full px-3 py-2.5 bg-white/[0.04] border border-white/[0.07] rounded-xl text-[13px] text-white placeholder-white/20 focus:outline-none focus:border-white/20 transition-all" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-1.5 block">Email</label>
                  <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="corretor@email.com"
                    className="w-full px-3 py-2.5 bg-white/[0.04] border border-white/[0.07] rounded-xl text-[13px] text-white placeholder-white/20 focus:outline-none focus:border-white/20 transition-all" />
                </div>
              </div>

              {erro && <p className="text-[11px] text-red-400 mt-3">{erro}</p>}

              <div className="flex gap-2 mt-5">
                <button onClick={salvar} disabled={salvando}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-[13px] font-semibold text-white transition-all disabled:opacity-50">
                  {salvando ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                  Cadastrar
                </button>
                <button onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-white/[0.07] text-[12px] text-white/30 hover:text-white transition-all">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toasts */}
        {erro && !showModal && (
          <div className="fixed bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 px-5 py-3 bg-red-500/90 backdrop-blur rounded-2xl text-[13px] text-white font-medium shadow-2xl z-50">
            <AlertTriangle size={14} /> {erro}
          </div>
        )}
        {sucesso && (
          <div className="fixed bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 px-5 py-3 bg-emerald-500/90 backdrop-blur rounded-2xl text-[13px] text-white font-medium shadow-2xl z-50">
            <CheckCircle size={14} /> {sucesso}
          </div>
        )}
      </main>
    </div>
  );
}
