import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  experimental: {
    serverActions: {
      // A importação de pedidos sobe a planilha inteira por Server Action, e o
      // limite padrão (1 MB) estoura num export de alguns milhares de linhas.
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
