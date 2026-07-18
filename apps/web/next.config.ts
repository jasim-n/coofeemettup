import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Consume the workspace TS packages directly (no prebuild step).
  transpilePackages: ['@jrst/api-client', '@jrst/types'],
};

export default nextConfig;
