import type { NextConfig } from "next";
// @ts-ignore
import nextPWA from "next-pwa";

const withPWA = nextPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {},
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

export default withPWA(nextConfig);
