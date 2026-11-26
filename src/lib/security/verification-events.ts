import 'server-only';
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { securityVerificationEvents } from '@/db/schema';
import { safeDiagnosticDetails, type CaptchaDiagnosticCode, type CaptchaDiagnosticDetails } from './captcha-diagnostics';
import type { PublicCaptchaAction } from './public-protection';

export type VerificationEvent = {
  id: string; action: PublicCaptchaAction | 'unknown_action'; source: 'client' | 'server';
  outcome: 'accepted' | 'rejected' | 'unavailable'; code: CaptchaDiagnosticCode; details: CaptchaDiagnosticDetails;
};
/** 紀錄失敗不得改變驗證結果；不可輸出資料庫錯誤全文或連線憑證。 */
export async function recordVerificationEvent(event: VerificationEvent): Promise<boolean> {
  try {
    const deployment = process.env.VERCEL_DEPLOYMENT_ID;
    const deploymentId = deployment && /^[a-zA-Z0-9_-]{1,80}$/.test(deployment) ? deployment : null;
    await db.transaction(async tx => {
      await tx.execute(sql`set local statement_timeout = '1500ms'`);
      // 全域有界寫入，避免公開拒絕紀錄被利用來無限制灌入資料。
      await tx.execute(sql`select pg_advisory_xact_lock(20261126, 1)`);
      const [budget] = await tx.execute<{ total: number }>(sql`select count(*)::int as total from ${securityVerificationEvents} where occurred_at >= now() - interval '1 minute'`);
      if (budget.total >= 1200) throw new Error('diagnostic_budget');
      await tx.insert(securityVerificationEvents).values({ ...event, details: event.source === 'client' ? {} : safeDiagnosticDetails(event.details), deploymentId }).onConflictDoNothing();
    });
    return true;
  } catch {
    console.error('[reCAPTCHA] diagnostic_storage_failed', { referenceId: event.id });
    return false;
  }
}

/** 由既有受保護的每小時排程清理，不依賴有人送出表單才清理。 */
export async function purgeVerificationEvents() {
  await db.execute(sql`delete from ${securityVerificationEvents} where occurred_at < now() - interval '30 days'`);
}
