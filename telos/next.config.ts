import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Netlify define NETLIFY=true al compilar; queda fijo en el código del servidor para elegir el almacén de fotos.
  env: { TELOS_BUILT_ON_NETLIFY: process.env.NETLIFY === "true" ? "1" : "0" },
  // Las fotos originales del inventario inicial viajan con la función del dashboard
  // (botón "Cargar inventario inicial").
  outputFileTracingIncludes: { "/admin": ["./fotos-productos/**/*"] },
  experimental: {
    serverActions: { bodySizeLimit: "8mb" },
  },
};

export default nextConfig;
