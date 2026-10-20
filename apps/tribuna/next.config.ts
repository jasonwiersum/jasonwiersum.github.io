import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // La app vive dentro del repositorio del portfolio: su raíz es esta carpeta.
  outputFileTracingRoot: __dirname,
  turbopack: { root: __dirname },
  images: {
    // Fotos de jugadores, escudos y logos de competiciones de API-Football.
    remotePatterns: [{ protocol: 'https', hostname: 'media.api-sports.io' }],
  },
};

export default nextConfig;
