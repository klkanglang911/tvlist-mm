import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  // Docker 部署优化：使用 standalone 输出模式
  output: 'standalone',
};

export default nextConfig;
