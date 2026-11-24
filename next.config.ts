import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.vercel.run"],
  experimental: {
    agentUpgrade: "security",
  },
};

export default nextConfig;
