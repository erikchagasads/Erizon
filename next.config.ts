import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Turbopack apenas em dev; produção segue no bundler padrão do build.
  ...(!isProd && { turbopack: {} }),
  async rewrites() {
    return [
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
      { source: "/dados", destination: "/analytics", permanent: true },
      { source: "/studio", destination: "/copiloto", permanent: true },
      { source: "/cadastro", destination: "/signup", permanent: true },
      { source: "/config", destination: "/settings", permanent: true },
      { source: "/dashboard", destination: "/crm/dashboard", permanent: true },
      { source: "/agencia", destination: "/crm/agencia", permanent: true },
    ];
  },
};

export default nextConfig;
