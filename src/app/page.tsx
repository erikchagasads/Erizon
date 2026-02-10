export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-erizon-black p-24">
      <div className="text-center space-y-6">
        <h1 className="text-6xl font-extrabold tracking-tighter text-erizon-white">
          ERIZON <span className="text-erizon-purple italic">SPACE</span>
        </h1>
        <p className="text-erizon-lunar text-xl max-w-md">
          Growth Intelligence Platform: A nova era do marketing data-driven.
        </p>
        <button className="bg-erizon-ia px-8 py-4 rounded-lg font-bold text-erizon-black shadow-[0_0_20px_rgba(108,75,255,0.5)] hover:scale-105 transition-all">
          ACESSAR DASHBOARD
        </button>
      </div>
    </main>
  );
}