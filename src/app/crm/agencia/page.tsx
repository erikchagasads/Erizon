"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Users, Plus, Trash2, Phone, Mail, Loader2, CheckCircle,
  AlertTriangle, X, Link2, Copy, Search, Building2,
  UserCheck, Zap,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";

interface Corretor {
  id: string;
  nome: string;
  telefone?: string;
  email?: string;
  created_at: string;
}

interface CampanhaVinculo {
  id: string;
  nome: string;
  corretor_id?: string;
  codigo_unico?: string;
  corretores?: { id: string; nome: string; telefone?: string };
}

interface CampanhaAds {
  id: string;
  nome_campanha: string;
  status: string;
  cliente_nome?: string;
}

const WHATSAPP_NUMBER = "5519992078842";

export default function SalaDeControle() {
  const [aba, setAba] = useState<"corretores" | "vinculos">("corretores");
  const [corretores, setCorretores] = useState<Corretor[]>([]);
  const [campanhasAds, setCampanhasAds] = useState<CampanhaAds[]>([]);
  const [vinculos, setVinculos] = useState<CampanhaVinculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showVinculo, setShowVinculo] = useState<CampanhaAds | null>(null);
  const [corretorSelecionado, setCorretorSelecionado] = useState("");
  const [busca, setBusca] = useState("");
  const [form, setForm] = useState({ nome: "", telefone: "", email: "" });
  const [copiado, setCopiado] = useState<string | null>(null);

  async function carregarCorretores() {
    const res = await fetch("/api/corretores");
    const json = await res.json();
    setCorretores(json.corretores ?? []);
  }

  async function carregarCampanhas() {
    const res = await fetch("/api/relatorio-pdf");
    const json = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const camps: CampanhaAds[] = (json.relatorio?.campanhas ?? []).map((c: any) => ({
      id: String(c.id ?? ""),
      nome_campanha: String(c.nome ?? "—"),
      status: String(c.status ?? ""),
      cliente_nome: String(c.cliente_nome ?? ""),
    }));
    setCampanhasAds(camps);
  }

  async function carregarVinculos() {
    const res = await fetch("/api/campanhas-vincular");
    const json = await res.json();
    setVinculos(json.campanhas ?? []);
  }

  async function carregar() {
    setLoading(true);
    await Promise.all([carregarCorretores(), carregarCampanhas(), carregarVinculos()]);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  async function salvarCorretor() {
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
    carregarCorretores();
    setSalvando(false);
  }

  async function excluirCorretor(id: string) {
    if (!confirm("Excluir corretor?")) return;
    await fetch("/api/corretores", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    carregarCorretores();
  }

  async function vincularCampanha() {
    if (!showVinculo || !corretorSelecionado) { setErro("Selecione um corretor"); return; }
    setSalvando(true);
    const res = await fetch("/api/campanhas-vincular", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campanha_id: showVinculo.id,
        corretor_id: corretorSelecionado,
        nome_campanha: showVinculo.nome_campanha,
      }),
    });
    const json = await res.json();
    if (json.error) { setErro(json.error); setSalvando(false); return; }
    setSucesso("Corretor vinculado! Link gerado.");
    setTimeout(() => setSucesso(""), 3000);
    setShowVinculo(null);
    setCorretorSelecionado("");
    carregarVinculos();
    setSalvando(false);
  }

  function copiarLink(codigo: string) {
    const link = `https://wa.me/${WHATSAPP_NUMBER}?text=${codigo}`;
    navigator.clipboard.writeText(link);
    setCopiado(codigo);
    setTimeout(() => setCopiado(null), 2000);
  }

  const campanhasFiltradas = useMemo(() => {
    if (!busca.trim()) return campanhasAds;
    const b = busca.toLowerCase();
    return campanhasAds.filter(c =>
      c.nome_campanha.toLowerCase().includes(b) ||
      (c.cliente_nome ?? "").toLowerCase().includes(b)
    );
  }, [campanhasAds, busca]);

  const vinculoMap = useMemo(() => {
    const map: Record<string, CampanhaVinculo> = {};
    vinculos.forEach(v => { map[v.id] = v; });
    return map;
  }, [vinculos]);

  return (
    <div className="min-h-screen bg-[#0a0a0c]">
      <Sidebar />
      <main className="flex flex-col min-h-screen ml-24">

        {/* Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.05] bg-[#0c0c0f]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-purple-600 flex items-center justify-center">
              <Building2 size={13} className="text-white" />
            </div>
            <span className="text-[15px] font-bold text-white tracking-tight">Sala de Controle</span>
            <span className="text-[10px] text-white/20 font-medium px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06]">
              ERIZON
            </span>
          </div>
          <div className="flex items-center gap-2">
            {aba === "corretores" && (
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-[12px] font-semibold text-white transition-all"
              >
                <Plus size={13} /> Novo Corretor
              </button>
            )}
          </div>
        </div>

        {/* Abas */}
        <div className="flex items-center gap-1 px-6 py-3 border-b border-white/[0.05] bg-[#0c0c0e]">
          {([
            { value: "corretores", label: "Corretores", icon: Users },
            { value: "vinculos", label: "Campanhas & Links", icon: Link2 },
          ] as const).map(a => (
            <button
              key={a.value}
              onClick={() => setAba(a.value)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-medium transition-all ${
                aba === a.value
                  ? "bg-white/[0.08] text-white border border-white/[0.10]"
                  : "text-white/30 hover:text-white/60"
              }`}
            >
              <a.icon size={13} />
              {a.label}
            </button>
          ))}
        </div>

        {/* Conteúdo */}
        {loading ? (
          <div className="flex items-center justify-center h-64 gap-3">
            <Loader2 size={18} className="animate-spin text-white/20" />
            <span className="text-[13px] text-white/20">Carregando...</span>
          </div>
        ) : (
          <div className="p-6 flex-1">

            {/* ── ABA CORRETORES ── */}
            {aba === "corretores" && (
              corretores.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 gap-3">
                  <Users size={32} className="text-white/10" />
                  <p className="text-[14px] text-white/25">Nenhum corretor cadastrado</p>
                  <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-[12px] font-semibold text-white transition-all"
                  >
                    <Plus size={13} /> Cadastrar primeiro corretor
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {corretores.map(c => (
                    <div
                      key={c.id}
                      className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.07] hover:border-white/15 transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/20 flex items-center justify-center">
                          <span className="text-[14px] font-bold text-purple-400">
                            {c.nome.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <button
                          onClick={() => excluirCorretor(c.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/[0.03] border border-white/[0.06] hover:bg-red-500/10 hover:border-red-500/20 transition-all"
                        >
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
              )
            )}

            {/* ── ABA VÍNCULOS & LINKS ── */}
            {aba === "vinculos" && (
              <div className="space-y-4">
                <div className="relative max-w-[400px]">
                  <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20" />
                  <input
                    value={busca}
                    onChange={e => setBusca(e.target.value)}
                    placeholder="Buscar campanha..."
                    className="w-full pl-10 pr-4 py-2 bg-white/[0.04] border border-white/[0.07] rounded-xl text-[12px] text-white placeholder-white/20 focus:outline-none focus:border-white/15 transition-all"
                  />
                </div>

                <div className="rounded-2xl border border-white/[0.07] overflow-hidden">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-[#0f0f12] border-b border-white/[0.06]">
                        <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-white/30">Campanha</th>
                        <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-white/30">Cliente</th>
                        <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-white/30">Corretor Vinculado</th>
                        <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-white/30">Link WhatsApp</th>
                        <th className="px-4 py-3 w-[110px]"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03]">
                      {campanhasFiltradas.map(camp => {
                        const vinculo = vinculoMap[camp.id];
                        const link = vinculo?.codigo_unico
                          ? `https://wa.me/${WHATSAPP_NUMBER}?text=${vinculo.codigo_unico}`
                          : null;
                        return (
                          <tr key={camp.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="px-4 py-3">
                              <span className="text-[12px] font-medium text-white/80 truncate block max-w-[250px]">
                                {camp.nome_campanha}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-[11px] text-white/40">{camp.cliente_nome || "—"}</span>
                            </td>
                            <td className="px-4 py-3">
                              {vinculo?.corretores ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-lg bg-purple-600/20 flex items-center justify-center">
                                    <span className="text-[10px] font-bold text-purple-400">
                                      {vinculo.corretores.nome.charAt(0)}
                                    </span>
                                  </div>
                                  <span className="text-[11px] font-medium text-white/70">
                                    {vinculo.corretores.nome}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[11px] text-white/20">Não vinculado</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {link ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-mono text-emerald-400/70 truncate max-w-[180px]">
                                    {link}
                                  </span>
                                  <button
                                    onClick={() => copiarLink(vinculo.codigo_unico!)}
                                    className="w-6 h-6 rounded-lg flex items-center justify-center bg-white/[0.04] border border-white/[0.07] hover:bg-emerald-500/10 hover:border-emerald-500/20 transition-all shrink-0"
                                  >
                                    {copiado === vinculo.codigo_unico
                                      ? <CheckCircle size={10} className="text-emerald-400" />
                                      : <Copy size={10} className="text-white/30" />
                                    }
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[11px] text-white/20">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => {
                                  setShowVinculo(camp);
                                  setCorretorSelecionado(vinculo?.corretor_id ?? "");
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.07] hover:bg-purple-500/10 hover:border-purple-500/20 text-[11px] text-white/40 hover:text-purple-400 transition-all whitespace-nowrap"
                              >
                                <UserCheck size={11} />
                                {vinculo?.corretores ? "Trocar" : "Vincular"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal Novo Corretor */}
        {showModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            onClick={() => setShowModal(false)}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div
              className="relative w-full max-w-md bg-[#0c0c0f] border border-white/[0.08] rounded-2xl p-6 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[15px] font-bold text-white">Novo Corretor</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="w-7 h-7 rounded-xl flex items-center justify-center bg-white/[0.04] border border-white/[0.07] hover:bg-white/[0.08] transition-all"
                >
                  <X size={13} className="text-white/40" />
                </button>
              </div>
              <div className="space-y-3">
                {[
                  { key: "nome", label: "Nome *", placeholder: "Nome do corretor" },
                  { key: "telefone", label: "Telefone", placeholder: "5519999999999" },
                  { key: "email", label: "Email", placeholder: "corretor@email.com" },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-1.5 block">
                      {f.label}
                    </label>
                    <input
                      value={form[f.key as keyof typeof form]}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full px-3 py-2.5 bg-white/[0.04] border border-white/[0.07] rounded-xl text-[13px] text-white placeholder-white/20 focus:outline-none focus:border-white/20 transition-all"
                    />
                  </div>
                ))}
              </div>
              {erro && <p className="text-[11px] text-red-400 mt-3">{erro}</p>}
              <div className="flex gap-2 mt-5">
                <button
                  onClick={salvarCorretor}
                  disabled={salvando}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-[13px] font-semibold text-white transition-all disabled:opacity-50"
                >
                  {salvando ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                  Cadastrar
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-white/[0.07] text-[12px] text-white/30 hover:text-white transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Vincular Corretor */}
        {showVinculo && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            onClick={() => setShowVinculo(null)}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div
              className="relative w-full max-w-md bg-[#0c0c0f] border border-white/[0.08] rounded-2xl p-6 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-[15px] font-bold text-white">Vincular Corretor</h2>
                <button
                  onClick={() => setShowVinculo(null)}
                  className="w-7 h-7 rounded-xl flex items-center justify-center bg-white/[0.04] border border-white/[0.07] hover:bg-white/[0.08] transition-all"
                >
                  <X size={13} className="text-white/40" />
                </button>
              </div>
              <p className="text-[11px] text-white/30 mb-5 truncate">{showVinculo.nome_campanha}</p>

              <label className="text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-1.5 block">
                Selecionar Corretor
              </label>
              <select
                value={corretorSelecionado}
                onChange={e => setCorretorSelecionado(e.target.value)}
                className="w-full px-3 py-2.5 bg-white/[0.04] border border-white/[0.07] rounded-xl text-[13px] text-white focus:outline-none focus:border-white/20 transition-all appearance-none mb-4"
              >
                <option value="">Selecione um corretor...</option>
                {corretores.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>

              {corretores.length === 0 && (
                <p className="text-[11px] text-amber-400 mb-4">
                  Nenhum corretor cadastrado. Cadastre um corretor primeiro na aba Corretores.
                </p>
              )}

              {erro && <p className="text-[11px] text-red-400 mb-3">{erro}</p>}

              <div className="flex gap-2">
                <button
                  onClick={vincularCampanha}
                  disabled={salvando || !corretorSelecionado}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-[13px] font-semibold text-white transition-all disabled:opacity-50"
                >
                  {salvando ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
                  Vincular e Gerar Link
                </button>
                <button
                  onClick={() => setShowVinculo(null)}
                  className="px-4 py-2.5 rounded-xl border border-white/[0.07] text-[12px] text-white/30 hover:text-white transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toasts */}
        {erro && !showModal && !showVinculo && (
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