export const MAX_APPOINTMENT_RECIPIENTS = 20;

export function isNotificationAddress(value: string) {
  if (value.length > 254 || /\s/.test(value)) return false;
  const [local, domain, extra] = value.split('@');
  if (!local || !domain || extra !== undefined) return false;
  if (!/^[a-z0-9.!#$%&'*+\/=?^_`{|}~-]{1,64}$/i.test(local) || /(^\.|\.$|\.\.)/.test(local)) return false;
  const labels = domain.split('.');
  return labels.length > 1 && labels.every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label));
}
