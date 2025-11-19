import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    ppr: true,
  },
  // Webpack config pour exclure opik-vercel du bundle client
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Exclure les packages server-only du bundle client
      config.resolve.alias = {
        ...config.resolve.alias,
        'opik-vercel': false,
        'opik': false,
      };
    }
    return config;
  },
  images: {
    remotePatterns: [
      {
        hostname: "avatar.vercel.sh",
      },
    ],
  },
};

export default nextConfig;
