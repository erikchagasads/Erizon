export default function Dashboard() {
  return (
    <div className="flex h-screen bg-erizon-black text-erizon-white">
      {/* Sidebar - Menu Lateral */}
      <aside className="w-64 border-r border-white/10 bg-erizon-cosmic/30 p-6">
        <h1 className="text-2xl font-bold text-erizon-purple mb-10 italic">ERIZON</h1>
        <nav className="space-y-4">
          <div className="p-3 bg-white/5 rounded-lg text-erizon-mint border border-erizon-mint/20">📊 Overview</div>
          <div className="p-3 hover:bg-white/5 rounded-lg transition-colors cursor-pointer text-erizon-lunar">⚡ Pulse (Ads)</div>
          <div className="p-3 hover:bg-white/5 rounded-lg transition-colors cursor-pointer text-erizon-lunar">🌀 Orbit (CRM)</div>
          <div className="p-3 hover:bg-white/5 rounded-lg transition-colors cursor-pointer text-erizon-lunar">🛠️ Forge (AI)</div>
        </nav>
      </aside>

      {/* Main Content - Conteúdo Principal */}
      <main className="flex-1 p-10 overflow-y-auto">
        <header className="flex justify-between items-center mb-10">
          <h2 className="text-3xl font-bold">Growth Command</h2>
          <div className="flex items-center gap-4">
            <span className="text-erizon-lunar">Tripulante: <span className="text-erizon-purple">Admin</span></span>
            <div className="w-10 h-10 rounded-full bg-erizon-ia shadow-[0_0_10px_rgba(108,75,255,0.3)]"></div>
          </div>
        </header>

        {/* Grid de Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard title="ROAS Médio" value="4.8x" change="+12%" color="text-erizon-mint" />
          <StatCard title="Leads Gerados" value="1,240" change="+5%" color="text-erizon-plasma" />
          <StatCard title="Custo por Lead" value="R$ 12,40" change="-8%" color="text-erizon-mint" />
        </div>

        {/* Placeholder para Gráfico */}
        <div className="mt-10 h-64 rounded-2xl border border-white/10 bg-erizon-cosmic/20 flex items-center justify-center text-erizon-lunar italic">
          [ Gráfico de Performance Neural sendo carregado... ]
        </div>
      </main>
    </div>
  );
}

// Componente de Cartão de Estatística
function StatCard({ title, value, change, color }: any) {
  return (
    <div className="p-6 rounded-2xl border border-white/10 bg-erizon-cosmic/30 backdrop-blur-sm">
      <p className="text-erizon-lunar text-sm">{title}</p>
      <div className="flex items-end justify-between mt-2">
        <h3 className="text-3xl font-bold">{value}</h3>
        <span className={`${color} text-sm font-bold`}>{change}</span>
      </div>
    </div>
  );
}