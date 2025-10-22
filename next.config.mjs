/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['mysql2'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'epamigsistema.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
    ],
  },
  // Otimizações para produção
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false,
  },
  // Configuração de output para evitar problemas em produção
  output: 'standalone',
};

export default nextConfig;
