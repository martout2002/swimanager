import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: { optimizePackageImports: ['framer-motion'] },
  ignoreWarnings: [
    {
      module: /node_modules\/jose\/dist\/webapi\/lib\/deflate\.js/,
    },
  ],
};


export default nextConfig;
