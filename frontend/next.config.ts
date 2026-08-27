import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Wardrobe photos will be user-uploaded, likely from S3/CDN once storage
  // is wired up. Configure remotePatterns here when that lands — leaving
  // this empty for now so `next/image` fails loudly (not silently) on
  // untrusted hosts.
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
