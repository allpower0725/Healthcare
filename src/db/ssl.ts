/** Supabase pooler 使用自己的 CA；保留 CA 與 hostname 檢查，不能用 rejectUnauthorized:false。 */
export function databaseSslOptions(url: string, certificate?: string) {
  const hostname = new URL(url).hostname;
  if (!hostname.endsWith('.supabase.com') && !hostname.endsWith('.supabase.co')) return {};
  const ca = certificate?.replaceAll('\\n', '\n').trim();
  if (!ca?.includes('-----BEGIN CERTIFICATE-----')) {
    throw new Error('Supabase 連線須設定 DATABASE_SSL_CA 官方 CA 憑證。');
  }
  return { ssl: { ca, rejectUnauthorized: true } };
}
