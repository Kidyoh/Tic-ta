/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  basePath: '/tic-tac',
  reactStrictMode: true,
};

module.exports = nextConfig;
