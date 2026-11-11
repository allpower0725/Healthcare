import { UrlResultModal } from '@/components/feedback/url-result-modal';

export type NoticeMessages = Record<string, { tone: 'info' | 'warn' | 'error'; text: string }>;

/** 依網址參數顯示提示訊息；未知的值不顯示 */
export async function Notice({
  searchParams,
  param,
  messages,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  param: string;
  messages: NoticeMessages;
}) {
  const value = (await searchParams)[param];
  const message = typeof value === 'string' && Object.hasOwn(messages, value) ? messages[value] : null;
  if (!message) return null;

  return (
    <UrlResultModal param={param} title={message.tone === 'error' ? '操作未完成' : '操作結果'}
      message={message.text} tone={message.tone === 'info' ? 'success' : message.tone === 'warn' ? 'warning' : 'error'} />
  );
}
