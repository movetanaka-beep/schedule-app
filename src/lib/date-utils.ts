/**
 * サーバーサイドでJST (UTC+9) の日付文字列を取得する
 */
export function getJSTToday(): string {
  const now = new Date();
  const jstOffset = 9 * 60 * 60 * 1000;
  const jstDate = new Date(now.getTime() + jstOffset);
  return jstDate.toISOString().slice(0, 10);
}

/**
 * JST の現在時刻を取得
 */
export function getJSTNow(): Date {
  return new Date();
}
