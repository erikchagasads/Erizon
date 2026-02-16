"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { 
  Zap, BarChart3, RefreshCw, Target, AlertCircle, 
  AlertTriangle, Check, X, Wallet, TrendingUp, 
  Clock, ZapOff, Pause, DollarSign, Eye, Power,
  Activity
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

// --- COMPONENTE DO LINK LATERAL ---
function SideLink({ href, icon, active, label }: { href: string, icon: any, active?: boolean, label: string }) {
  return (
    <Link href={href} className="group relative flex flex-col items-center">
      <div className={`
        p-4 rounded-2xl transition-all duration-500 relative z-10
        ${active 
          ? 'bg-purple-600 text-white shadow-[0_0_25px_rgba(168,85,247,0.5)]' 
          : 'text-gray-500 hover:text-white hover:bg-white/5'}
      `}>
        {icon}
      </div>
      <span className="absolute left-20 bg-purple-600 text-white text-[9px] font-black uppercase px-3 py-1.5 rounded-lg opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 pointer-events-none tracking-widest z-50 whitespace-nowrap">
        {label}
      </span>
      {active && (
        <div className="absolute -left-10 w-1.5 h-8 bg-purple-600 rounded-r-full shadow-[5px_0_15px_#a855f7]"></div>
      )}
    </Link>
  );
}

export default function PulseWarRoom() {
  const router = useRouter();
  const [dados, setDados] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [statsIA, setStatsIA] = useState({ total: 0, acertos: 0 });
  const [autopilot, setAutopilot] = useState(false);
  const [modoGuerra, setModoGuerra] = useState(false);
  const [historicoAcoes, setHistoricoAcoes] = useState<any[]>([]);
  const [alertasNotificados, setAlertasNotificados] = useState<Set<string>>(new Set());

  // --- CONFIG BOT TELEGRAM ---
  const BOT_TOKEN = "8531098413:AAHXJvJ5dpfF7dr7ZNPGq5FpGnO9UUf0BW0";
  const CHAT_ID = "6638448595";

  // --- NOTIFICAÇÃO DINÂMICA REESCRITA ---
  const notificarTelegram = async (alerta: any, c: any) => {
    const icon = alerta.tipo === "CRÍTICO" ? "⚠️" : (alerta.tipo === "OPORTUNIDADE" ? "🔥" : "🔔");
    
    // Cálculos em Tempo Real para o Relatório
    const cpl = c.contatos > 0 ? (c.gasto_total / c.contatos).toFixed(2) : "0.00";
    const ctr = c.impressoes > 0 ? ((c.cliques / c.impressoes) * 100).toFixed(2) : "0.00";
    const budgetUsado = c.orcamento > 0 ? ((c.gasto_total / c.orcamento) * 100).toFixed(1) : "0.0";
    
    // Formata a lista de motivos que a IA detectou
    const motivosRelatorio = alerta.reasons?.map((r: string) => `• ${r}`).join('\n') || "Análise de métricas padrão.";

    const texto = `${icon} *PULSE DETECTOU: ${alerta.tipo}*\n\n` +
                  `*Campanha:* \`${c.nome_campanha}\`\n` +
                  `---------------------------\n` +
                  `💰 *Gasto:* \`R$ ${c.gasto_total.toFixed(2)}\` | *Uso:* \`${budgetUsado}%\` \n` +
                  `🎯 *CPL:* \`R$ ${cpl}\` | ⚡ *CTR:* \`${ctr}%\` \n` +
                  `👤 *Leads:* \`${c.contatos}\` \n` +
                  `---------------------------\n\n` +
                  `💡 *INSIGHT IA:* \n_${alerta.msg}_\n\n` +
                  `📊 *DADOS DO ALERTA:* \n\`${motivosRelatorio}\` \n\n` +
                  `🚀 _Erizon Growth Intelligence_`;

    try {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: texto,
          parse_mode: 'Markdown',
        }),
      });
    } catch (e) { console.error("Erro bot:", e); }
  };

  const [mensagemDoDia] = useState(() => {
    const mensagens = [
      "“Consagre ao Senhor tudo o que você faz, e os seus planos serão bem-sucedidos.” — Provérbios 16:3.",
      "“Tudo o que fizerem, façam de todo o coração.” — Colossenses 3:23.",
      "“Não fui eu que ordenei a você? Seja forte e corajoso!” — Josué 1:9.",
      "“Onde não há visão, o povo perece.” — Provérbios 29:18.",
      "“Os planos bem elaborados levam à fartura; mas a pressa desmedida leva à pobreza.” — Provérbios 21:5."
    ];
    return mensagens[new Date().getDate() % mensagens.length];
  });

  const encerrarSessao = async () => {
    const confirmar = window.confirm("⚠ DESEJA TERMINAR A CONEXÃO NEURAL E ENCERRAR SESSÃO?");
    if (!confirmar) return;
    try {
      await supabase.auth.signOut();
      sessionStorage.clear();
      router.push("/login");
    } catch (e) { console.error(e); }
  };

  async function carregarDados() {
    setLoading(true);
    try {
      await fetch('/api/ads-sync');
      const { data } = await supabase.from("metricas_ads").select("*");
      if (data) {
        setDados(data);
        data.forEach(c => {
          const alerta = processarAlertas(c);
          const idAlerta = `${c.campanha_id}-${alerta?.tipo}`;
          if (alerta && c.status === 'ATIVO' && !alertasNotificados.has(idAlerta)) {
            notificarTelegram(alerta, c);
            setAlertasNotificados(prev => new Set(prev).add(idAlerta));
          }
        });
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  useEffect(() => {
    carregarDados();
    const interval = setInterval(carregarDados, 60000);
    return () => clearInterval(interval);
  }, [alertasNotificados]);

  const processarAlertas = (c: any) => {
    const cpl = c.contatos > 0 ? (c.gasto_total / c.contatos) : 0;
    const ctr = c.cliques > 0 ? (c.cliques / (c.impressoes || 1)) * 100 : 0;
    const usoBudget = (c.gasto_total / (c.orcamento || 100)) * 100;
    let reasons: string[] = [];

    if (c.gasto_total > 50 && c.contatos === 0) {
      reasons = [`Gasto: R$${c.gasto_total.toFixed(2)}`, "Conversões: 0", `CTR: ${ctr.toFixed(2)}%` ];
      return { tipo: "CRÍTICO", label: "Sem Conversão", cor: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20", icon: <AlertCircle size={24}/>, economia: c.gasto_total * 0.4, msg: "R$ 50 gastos com 0 leads. IA sugere pausa imediata.", reasons };
    }
    
    if (usoBudget > 90) {
      reasons = [`Consumo: ${usoBudget.toFixed(1)}%`, `Gasto: R$${c.gasto_total.toFixed(2)}`, `Limite: R$${c.orcamento}`];
      return { tipo: "CRÍTICO", label: "Budget no Limite", cor: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20", icon: <Wallet size={24}/>, economia: 0, msg: "Campanha atingiu 90% do budget diário.", reasons };
    }

    if (cpl > 0 && cpl < 12 && c.contatos > 5) {
      reasons = [`CPL: R$${cpl.toFixed(2)}`, `Leads: ${c.contatos}`, `CTR: ${ctr.toFixed(2)}%` ];
      return { tipo: "OPORTUNIDADE", label: "Escalar", cor: "text-green-500", bg: "bg-green-500/10", border: "border-green-500/20", icon: <TrendingUp size={24}/>, oportunidade: 500, msg: "CPL excelente. IA sugere escala horizontal e aumento de budget.", reasons };
    }

    if (cpl > 25) {
      reasons = [`CPL: R$${cpl.toFixed(2)}`, `Meta: R$20.00`, `Desvio: +${((cpl/20-1)*100).toFixed(0)}%` ];
      return { tipo: "ATENÇÃO", label: "CPL Elevado", cor: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/20", icon: <AlertTriangle size={24}/>, economia: c.gasto_total * 0.2, msg: "CPL acima da meta estabelecida.", reasons };
    }

    return null;
  };

  const alertasAtivos = dados.map(c => ({ ...c, alerta: processarAlertas(c) })).filter(c => c.alerta !== null && c.status === 'ATIVO');

  const registrarAcaoTimeline = (label: string, camp: string, color: string) => {
    const agora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    setHistoricoAcoes(prev => [{ time: agora, label, camp, color }, ...prev].slice(0, 5));
  };

  const executarAcaoMeta = async (id: string, action: string, value?: number, nomeCampanha?: string) => {
    if (action === "VIEW_CREATIVE") {
      window.open(`https://www.facebook.com/ads/library/?id=${id}`, '_blank');
      registrarAcaoTimeline("Análise de Criativo", nomeCampanha || "Campanha", "bg-blue-500");
      return;
    }
    const confirmacao = window.confirm(`Deseja executar ${action}?`);
    if (!confirmacao) return;
    try {
      const res = await fetch('/api/meta-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: id, action, value })
      });
      if (res.ok) {
        registrarAcaoTimeline(`Executou: ${action}`, nomeCampanha || "Campanha", "bg-purple-600");
        carregarDados();
        setStatsIA(prev => ({ ...prev, total: prev.total + 1, acertos: prev.acertos + 1 }));
      }
    } catch (e) { console.error(e); }
  };

  const totalGerenciadoBM = dados.reduce((acc, c) => acc + (c.gasto_total || 0), 0);
  const gastoHoje = dados.filter(c => c.status === "ATIVO").reduce((acc, c) => acc + (c.gasto_total || 0), 0);
  const economiaTotal = alertasAtivos.reduce((acc, c) => acc + (c.alerta.economia || 0), 0);
  const healthScore = Math.max(0, 100 - (alertasAtivos.filter(a => a.alerta.tipo === "CRÍTICO").length * 15));
  const accuracy = statsIA.total > 0 ? ((statsIA.acertos / statsIA.total) * 100).toFixed(0) + "%" : "0%";

  return (
    <div className={`min-h-screen ${modoGuerra ? 'bg-black' : 'bg-[#050505]'} text-white font-sans flex transition-all duration-700`}>
      {!modoGuerra && (
        <aside className="w-24 border-r border-white/[0.03] flex flex-col items-center py-10 fixed h-full bg-black/40 backdrop-blur-3xl z-50">
          <div className="mb-16 relative group cursor-pointer">
            <div className="absolute -inset-4 bg-purple-600/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-all duration-700"></div>
            <div className="relative text-3xl font-black italic text-purple-600 tracking-tighter">E.</div>
          </div>
          <nav className="flex flex-col gap-10 flex-1">
            <SideLink href="/pulse" icon={<Zap size={22}/>} active label="Pulse" />
            <SideLink href="/dados" icon={<BarChart3 size={22}/>} label="Dados" />
            <SideLink href="/config" icon={<RefreshCw size={22}/>} label="Sincronizar" />
          </nav>
          <div className="mt-auto flex flex-col gap-8 items-center pb-6">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 p-[1px]">
              <div className="w-full h-full rounded-[15px] bg-black flex items-center justify-center text-[10px] font-bold italic">ER</div>
            </div>
            <button onClick={encerrarSessao} className="p-4 rounded-2xl text-gray-600 hover:text-red-500 hover:bg-red-500/10 transition-all duration-300 group relative">
              <Power size={22} />
              <span className="absolute left-20 bg-red-600 text-white text-[9px] font-black uppercase px-3 py-1.5 rounded-lg opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 whitespace-nowrap z-50">TERMINATE SESSION</span>
            </button>
          </div>
        </aside>
      )}

      <main className={`flex-1 ${modoGuerra ? 'ml-0' : 'ml-24'} p-12 transition-all`}>
        <header className="max-w-7xl mx-auto flex justify-between items-start mb-12">
          <div>
            <p className="text-[10px] font-black text-gray-600 tracking-[0.5em] uppercase text-left">Growth OS / Pulse Terminal</p>
            <h1 className="text-7xl font-black italic tracking-tighter uppercase text-left">PULSE<span className="text-purple-600">.</span></h1>
          </div>
          <div className="flex gap-4">
            <button onClick={() => setModoGuerra(!modoGuerra)} className={`px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${modoGuerra ? 'bg-red-600 animate-pulse text-white shadow-[0_0_20px_#dc2626]' : 'bg-white/5 border border-white/10 text-gray-400'}`}>MODO GUERRA</button>
            <button onClick={() => setAutopilot(!autopilot)} className={`px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest ${autopilot ? 'bg-purple-600 shadow-[0_0_15px_#a855f7]' : 'bg-white/5 border border-white/10'}`}>AUTOPILOT: {autopilot ? 'ON' : 'OFF'}</button>
          </div>
        </header>

        <div className="max-w-7xl mx-auto grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-8 space-y-8">
            <div className="relative bg-[#0A0A0A] border border-white/5 p-10 rounded-[45px] text-left">
              <span className="bg-purple-600 text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest">Mensagem do Dia</span>
              <p className="text-2xl font-medium italic mt-6 text-gray-200 leading-tight">"{mensagemDoDia}"</p>
            </div>
            <div className="grid grid-cols-3 gap-6">
               <FinanceCard label="Gerenciado BM" value={`R$ ${totalGerenciadoBM.toLocaleString('pt-BR')}`} icon={<Target className="text-blue-500" size={18}/>} sub="Histórico Total" />
               <FinanceCard label="Gasto Hoje" value={`R$ ${gastoHoje.toLocaleString('pt-BR')}`} icon={<Wallet className="text-orange-500" size={18}/>} sub="Live Spend" live={true} />
               <FinanceCard label="Economia IA" value={`R$ ${economiaTotal.toFixed(2)}`} icon={<ZapOff className="text-red-500" size={18}/>} sub="Potencial de Corte" />
            </div>
            <div className="space-y-6">
              {alertasAtivos.map((c) => {
                const isEscala = c.alerta.tipo === "OPORTUNIDADE";
                return (
                  <div key={c.nome_campanha} className={`bg-[#0A0A0A] border ${c.alerta.border} p-10 rounded-[45px] transition-all hover:scale-[1.01] duration-500 shadow-2xl`}>
                    <div className="flex justify-between items-start mb-8 text-left">
                      <div className="flex gap-6">
                        <div className={`p-5 ${c.alerta.bg} ${c.alerta.cor} rounded-3xl ${isEscala ? 'animate-pulse' : ''}`}>{c.alerta.icon}</div>
                        <div>
                          <span className={`text-[9px] font-black uppercase tracking-widest ${c.alerta.cor}`}>{isEscala ? "🔥 SINAL DE ESCALA DETECTADO" : c.alerta.tipo}</span>
                          <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white block mt-1">{c.nome_campanha}</h3>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-gray-600 uppercase mb-1">CPL Atual</p>
                        <p className={`text-3xl font-black ${c.alerta.cor} italic tracking-tighter`}>R$ {(c.gasto_total/c.contatos || 0).toFixed(2)}</p>
                      </div>
                    </div>
                    <div className={`border ${isEscala ? 'border-green-500/20 bg-green-500/5' : 'border-white/5 bg-white/[0.02]'} p-8 rounded-[35px] flex flex-col gap-6 mb-8 text-left`}>
                       <div className="flex justify-between items-start">
                         <p className={`text-sm italic ${isEscala ? 'text-green-100' : 'text-gray-400'} font-medium leading-relaxed flex-1`}>"{c.alerta.msg}"</p>
                         <p className="text-[10px] font-black text-purple-500 uppercase tracking-widest">IA CONFIDENCE: {accuracy}</p>
                       </div>
                       <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                         {c.alerta.reasons?.map((reason: string, idx: number) => (
                           <div key={idx} className="bg-black/40 border border-white/10 px-4 py-2 rounded-xl flex items-center gap-2 whitespace-nowrap">
                             <div className={`w-1 h-1 rounded-full ${isEscala ? 'bg-green-500' : 'bg-red-500'}`}></div>
                             <span className="text-[9px] font-mono text-gray-500 uppercase tracking-tighter">{reason}</span>
                           </div>
                         ))}
                       </div>
                    </div>
                    <div className="grid grid-cols-5 gap-3 pt-4 border-t border-white/5">
                      <button onClick={() => executarAcaoMeta(c.campanha_id, "PAUSE", 0, c.nome_campanha)} className="flex items-center justify-center gap-2 py-4 bg-red-600/10 text-red-600 rounded-2xl text-[8px] font-black uppercase tracking-tighter hover:bg-red-600 hover:text-white transition-all"><Pause size={14}/> Pausar</button>
                      <button onClick={() => { const v = prompt("Novo Budget?"); if(v) executarAcaoMeta(c.campanha_id, "UPDATE_BUDGET", Number(v), c.nome_campanha); }} className="flex items-center justify-center gap-2 py-4 bg-white/5 text-white rounded-2xl text-[8px] font-black uppercase tracking-tighter hover:bg-white/10 transition-all"><DollarSign size={14}/> Budget</button>
                      <button onClick={() => executarAcaoMeta(c.ad_id || c.campanha_id, "VIEW_CREATIVE", 0, c.nome_campanha)} className="flex items-center justify-center gap-2 py-4 bg-white/5 text-white rounded-2xl text-[8px] font-black uppercase tracking-tighter hover:bg-white/10 transition-all"><Eye size={14}/> Criativo</button>
                      <button onClick={() => { setStatsIA(prev => ({ ...prev, total: prev.total + 1 })); registrarAcaoTimeline("IA Recusada", c.nome_campanha, "bg-gray-700"); }} className="flex items-center justify-center gap-2 py-4 bg-white/5 text-gray-500 hover:text-red-400 rounded-2xl text-[8px] font-black uppercase tracking-tighter transition-all"><X size={14}/> Recusar</button>
                      <button onClick={() => { setStatsIA(prev => ({ total: prev.total+1, acertos: prev.acertos+1 })); registrarAcaoTimeline(isEscala ? "Escala Aprovada" : "IA Aprovada", c.nome_campanha, isEscala ? "bg-green-500" : "bg-purple-600"); }} className={`flex items-center justify-center gap-2 py-4 text-white rounded-2xl text-[8px] font-black uppercase tracking-tighter transition-all ${isEscala ? 'bg-green-600 hover:bg-green-500 shadow-[0_0_15px_#22c55e]' : 'bg-purple-600 hover:bg-purple-500 shadow-[0_0_15px_#a855f7]'}`}><Check size={14}/> Aceitar</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="col-span-12 lg:col-span-4 space-y-8">
            <div className="bg-[#0A0A0A] border border-white/5 p-10 rounded-[45px] text-center shadow-2xl">
              <p className="text-[10px] font-black text-gray-600 uppercase mb-8">Health Score</p>
              <div className="relative inline-flex items-center justify-center mb-8">
                <svg className="w-40 h-40">
                  <circle className="text-white/5" strokeWidth="10" stroke="currentColor" fill="transparent" r="70" cx="80" cy="80" />
                  <circle className="text-purple-600" strokeWidth="10" strokeDasharray={440} strokeDashoffset={440 - (440 * healthScore) / 100} strokeLinecap="round" stroke="currentColor" fill="transparent" r="70" cx="80" cy="80" />
                </svg>
                <span className="absolute text-5xl font-black italic">{healthScore}</span>
              </div>
            </div>
            <div className="bg-[#0A0A0A] border border-white/5 p-8 rounded-[45px]">
              <h3 className="text-[10px] font-black text-gray-500 uppercase mb-8 flex items-center gap-2 text-left"><Clock size={14}/> Timeline de Decisões</h3>
              <div className="space-y-8 relative before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-[1px] before:bg-white/5">
                {historicoAcoes.map((item, i) => <TimelineItem key={`hist-${i}`} {...item} />)}
                {alertasAtivos.slice(0, 3).map((c, i) => (
                  <TimelineItem key={`alerta-${i}`} time="AGORA" label={`IA: ${c.alerta.label}`} camp={c.nome_campanha} color={c.alerta.tipo === "CRÍTICO" ? "bg-red-500 shadow-[0_0_10px_#ef4444]" : (c.alerta.tipo === "OPORTUNIDADE" ? "bg-green-500 shadow-[0_0_10px_#22c55e]" : "bg-yellow-500")} />
                ))}
              </div>
            </div>
            <div className="bg-purple-600/5 border border-purple-600/20 p-8 rounded-[40px] text-left">
               <p className="text-[10px] font-black uppercase text-white mb-2 flex items-center gap-2"><Activity size={12}/> IA PERFORMANCE</p>
               <p className="text-3xl font-black italic tracking-tighter">{accuracy}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function FinanceCard({ label, value, icon, sub, live }: any) {
  return (
    <div className="bg-[#0A0A0A] border border-white/5 p-8 rounded-[40px] flex items-center gap-6">
      <div className="p-4 bg-white/5 rounded-2xl">{icon}</div>
      <div className="text-left">
        <p className="text-[9px] font-black text-gray-600 uppercase mb-1">{label}</p>
        <p className="text-2xl font-black italic text-white">{value}</p>
        <div className="flex items-center gap-2 mt-2">
          {live && <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-ping"></div>}
          <p className="text-[9px] font-black text-gray-500 uppercase">{sub}</p>
        </div>
      </div>
    </div>
  );
}

function TimelineItem({ time, label, camp, color }: any) {
  return (
    <div className="flex gap-6 items-start relative pl-6 text-left">
      <div className={`absolute left-0 top-1.5 w-3 h-3 rounded-full border-2 border-black ${color}`}></div>
      <div>
        <p className="text-[10px] font-black text-white uppercase tracking-wide">{label}</p>
        <p className="text-[9px] font-bold text-gray-600 uppercase">{camp}</p>
        <p className="text-[8px] text-gray-700 mt-1 font-mono tracking-widest">{time}</p>
      </div>
    </div>
  );
}