// 最高管理者的 Google 帳號遺失時使用：npm run admin:unbind
// 解除綁定並登出所有裝置，之後可再用 .env 的帳密登入一次並綁定新的 Google 帳號
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

async function main() {
  // 環境變數載入後才載入資料庫模組
  const { pgClient } = await import('../src/db');
  const { unbindSuperadmin } = await import('../src/lib/auth/service');

  try {
    const done = await unbindSuperadmin();
    console.log(
      done
        ? '已解除最高管理者的 Google 綁定，並登出所有裝置。現在可以用 .env 的帳密登入，重新綁定 Google 帳號。'
        : '找不到最高管理者帳號（尚未以帳密首次登入）。',
    );
  } finally {
    await pgClient.end();
  }
}

main();
