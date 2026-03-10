"use client";

// src/components/AgenteProvider.tsx
// Injeta o AgenteChat em todas as pages automaticamente.
// Lê o cliente selecionado da URL para passar ao agente.

import { useEffect, useState } from "react";
import AgenteChat from "@/components/AgenteChat";

export default function AgenteProvider() {
  const [clienteId, setClienteId] = useState<string | undefined>();

  useEffect(() => {
    function lerCliente() {
      const params = new URLSearchParams(window.location.search);
      const id = params.get("cliente") ?? params.get("cliente_id") ?? undefined;
      setClienteId(id ?? undefined);
    }

    lerCliente();

    // Atualiza quando a URL muda (Next.js navigation)
    const observer = new MutationObserver(lerCliente);
    observer.observe(document, { subtree: true, childList: true });

    window.addEventListener("popstate", lerCliente);
    return () => {
      observer.disconnect();
      window.removeEventListener("popstate", lerCliente);
    };
  }, []);

  return <AgenteChat clienteId={clienteId} />;
}