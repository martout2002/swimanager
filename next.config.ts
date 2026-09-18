import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['postgres', 'bcryptjs'],
  experimental: { optimizePackageImports: ['framer-motion'] },
};

export default nextConfig;
