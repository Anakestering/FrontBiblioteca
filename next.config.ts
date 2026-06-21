import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['jspdf', 'canvg', 'html2canvas'],
};

export default nextConfig;
