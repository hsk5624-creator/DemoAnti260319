import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // dev 프록시 타임아웃 — build_all_tables (32MB 배치파일 등) 처리 시간 확보
  experimental: {
    proxyTimeout: 300_000, // 5분
  },
  async rewrites() {
    return [
      { source: "/api/:path*", destination: "http://localhost:8000/api/:path*" },
    ];
  },
};

export default nextConfig;
