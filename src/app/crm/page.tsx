import Image from "next/image";

export default function CrmEntryPage() {
  return (
    <main className="min-h-screen bg-[#080808] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-6">
        <section className="w-full rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center shadow-2xl shadow-black/40">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
            <Image src="/logo-erizon.svg" alt="Erizon" width={34} height={34} priority />
          </div>

          <h1 className="text-xl font-semibold text-white">CRM Erizon</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/65">
            Acesse o link enviado pelo seu gestor para entrar no CRM.
          </p>
        </section>
      </div>
    </main>
  );
}
