import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Next 開發模式預設列印 Server Action 參數，可能包含問卷或驗證 token。
  logging: { serverFunctions: false },
  experimental: {
    // 院所區一次暫存可能帶多個簽名（成人預防保健最多 4 個，每個上限 300KB），超過預設的 1MB
    serverActions: { bodySizeLimit: "2mb" },
  },
  async redirects() {
    // 後台首頁為「表單管理」（與 src/lib/auth/dal.ts 的 ADMIN_HOME 相同）
    return [
      { source: "/", destination: "/admin/forms", permanent: false },
      { source: "/admin", destination: "/admin/forms", permanent: false },
      // 操作手冊是 public/manual/ 的靜態網頁，系統畫面不連結
      { source: "/manual", destination: "/manual/index.html", permanent: false },
    ];
  },
};

export default nextConfig;
