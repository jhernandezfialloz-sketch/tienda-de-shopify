import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Las fotos originales del inventario inicial viajan con la función del dashboard
  // (botón "Cargar inventario inicial").
  outputFileTracingIncludes: { "/admin": ["./fotos-productos/**/*"] },
  experimental: {
    serverActions: { bodySizeLimit: "8mb" },
  },
};

export default nextConfig;
