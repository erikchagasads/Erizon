import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {},
  async rewrites() {
    return [
      // Subdomínio onboarding.erizonai.com.br → landing de diagnóstico
      {
        source: "/",
        has: [{ type: "host", value: "onboarding.erizonai.com.br" }],
        destination: "/lp/diagnostico",
      },
      {
        source: "/",
        has: [{ type: "host", value: "ads.erizonai.com.br" }],
        destination: "/lp/gestores",
      },
    ];
  },
  async redirects() {
    return [
      // Rotas renomeadas
      { source: "/dados",  destination: "/analytics", permanent: true },
      { source: "/studio", destination: "/copiloto",  permanent: true },
      // Duplicatas removidas
      { source: "/cadastro", destination: "/signup",    permanent: true },
      { source: "/config",   destination: "/settings",  permanent: true },
      // CRM movido
      { source: "/dashboard", destination: "/crm/dashboard", permanent: true },
      { source: "/agencia",   destination: "/crm/agencia",   permanent: true },
    ];
  },
};

export default nextConfig;
