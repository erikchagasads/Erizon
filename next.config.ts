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
  // adiciona uma config vazia para turbopack para silenciar o erro
  turbopack: {},
  // suas outras configurações do Next.js aqui...
};

export default withPWA(nextConfig);