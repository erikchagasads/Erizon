"use client";

// src/components/AgenteProvider.tsx
// Injeta o AgenteChat apenas em páginas autenticadas.
// Oculta na landing page (/) e páginas públicas.

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import AgenteChat from "@/components/AgenteChat";

// Rotas onde o agente NÃO deve aparecer
const ROTAS_PUBLICAS = [
  "/", "/login", "/signup", "/register", "/onboarding",
  "/lp", "/blog", "/privacidade", "/termos", "/sucesso",
  "/share", "/billing",
];

export default function AgenteProvider() {
  const pathname = usePathname();
  const [clienteId, setClienteId] = useState<string | undefined>();

  const isPublica = ROTAS_PUBLICAS.some(
    r => pathname === r || pathname.startsWith(r + "/")
  );

  useEffect(() => {
    if (isPublica) return;

    function lerCliente() {
      const params = new URLSearchParams(window.location.search);
      const id = params.get("cliente") ?? params.get("cliente_id") ?? undefined;
      setClienteId(id ?? undefined);
    }

    lerCliente();

    const observer = new MutationObserver(lerCliente);
    observer.observe(document, { subtree: true, childList: true });
    window.addEventListener("popstate", lerCliente);
    return () => {
      observer.disconnect();
      window.removeEventListener("popstate", lerCliente);
    };
  }, [isPublica]);

  if (isPublica) return null;

  return <AgenteChat clienteId={clienteId} />;
}