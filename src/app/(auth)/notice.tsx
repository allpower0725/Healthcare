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
    <p className={`notice notice--${message.tone}`} role={message.tone === 'error' ? 'alert' : 'status'}>
      {message.text}
    </p>
  );
}
