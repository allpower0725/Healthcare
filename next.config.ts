import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // 院所區一次暫存可能帶多個簽名（成人預防保健最多 4 個，每個上限 300KB），超過預設的 1MB
    serverActions: { bodySizeLimit: "2mb" },
  },
  async redirects() {
    // 後台首頁為「表單管理」（與 src/lib/auth/dal.ts 的 ADMIN_HOME 相同）
    return [
      { source: "/", destination: "/admin/forms", permanent: false },
      { source: "/admin", destination: "/admin/forms", permanent: false },
    ];
  },
};

export default nextConfig;
