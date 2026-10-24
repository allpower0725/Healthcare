// 執行時才讀環境變數（測試可在執行中更換）

function read(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export function appUrl() {
  return (read('APP_URL') ?? 'http://localhost:3000').replace(/\/+$/, '');
}

/** 最高管理者首次登入用的帳密；任一項未設定時回傳 null */
export function adminCredentials() {
  const username = read('ADMIN_USERNAME');
  const passwordHash = read('ADMIN_PASSWORD_HASH');
  return username && passwordHash ? { username, passwordHash } : null;
}

/** Google OAuth 用戶端；未設定時回傳 null */
export function googleCredentials() {
  const clientId = read('GOOGLE_CLIENT_ID');
  const clientSecret = read('GOOGLE_CLIENT_SECRET');
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}
