/**
 * Escape text for Telegram messages sent with `parse_mode: 'HTML'`.
 * Telegram rejects the whole message if user text contains raw `<`, `>` or `&`.
 */
export function escapeHtml(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
