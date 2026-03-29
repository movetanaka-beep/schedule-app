/**
 * 日本の国民の祝日を生成するユーティリティ
 * DB非依存の純粋関数
 */

export interface NationalHoliday {
  date: string; // YYYY-MM-DD
  name: string;
}

/**
 * 指定年の春分の日を計算（天文計算による近似式）
 * 1980-2099年に対応
 */
function getVernalEquinoxDay(year: number): number {
  if (year >= 1980 && year <= 2099) {
    return Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
  }
  return 20; // フォールバック
}

/**
 * 指定年の秋分の日を計算（天文計算による近似式）
 * 1980-2099年に対応
 */
function getAutumnalEquinoxDay(year: number): number {
  if (year >= 1980 && year <= 2099) {
    return Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
  }
  return 23; // フォールバック
}

/**
 * 指定月の第n月曜日の日付を取得（ハッピーマンデー用）
 */
function getNthMonday(year: number, month: number, n: number): number {
  const first = new Date(year, month - 1, 1);
  const firstDay = first.getDay(); // 0=日, 1=月, ...
  // 第1月曜日の日付
  const firstMonday = firstDay <= 1 ? 1 + (1 - firstDay) : 1 + (8 - firstDay);
  return firstMonday + (n - 1) * 7;
}

/**
 * 指定年の国民の祝日一覧を生成
 */
export function generateNationalHolidays(year: number): NationalHoliday[] {
  const holidays: NationalHoliday[] = [];

  const pad = (n: number) => String(n).padStart(2, "0");
  const makeDate = (m: number, d: number) => `${year}-${pad(m)}-${pad(d)}`;

  // 固定祝日
  holidays.push({ date: makeDate(1, 1), name: "元日" });
  holidays.push({ date: makeDate(2, 11), name: "建国記念の日" });
  holidays.push({ date: makeDate(2, 23), name: "天皇誕生日" });
  holidays.push({ date: makeDate(4, 29), name: "昭和の日" });
  holidays.push({ date: makeDate(5, 3), name: "憲法記念日" });
  holidays.push({ date: makeDate(5, 4), name: "みどりの日" });
  holidays.push({ date: makeDate(5, 5), name: "こどもの日" });
  holidays.push({ date: makeDate(8, 11), name: "山の日" });
  holidays.push({ date: makeDate(11, 3), name: "文化の日" });
  holidays.push({ date: makeDate(11, 23), name: "勤労感謝の日" });

  // ハッピーマンデー制度
  holidays.push({ date: makeDate(1, getNthMonday(year, 1, 2)), name: "成人の日" });
  holidays.push({ date: makeDate(7, getNthMonday(year, 7, 3)), name: "海の日" });
  holidays.push({ date: makeDate(9, getNthMonday(year, 9, 3)), name: "敬老の日" });
  holidays.push({ date: makeDate(10, getNthMonday(year, 10, 2)), name: "スポーツの日" });

  // 天文計算
  holidays.push({ date: makeDate(3, getVernalEquinoxDay(year)), name: "春分の日" });
  holidays.push({ date: makeDate(9, getAutumnalEquinoxDay(year)), name: "秋分の日" });

  // 日付順にソート
  holidays.sort((a, b) => a.date.localeCompare(b.date));

  // 振替休日を追加
  // 祝日が日曜の場合、その翌日以降の最初の平日（既存祝日でない日）が振替休日
  const holidayDates = new Set(holidays.map((h) => h.date));
  const substitutes: NationalHoliday[] = [];

  for (const holiday of holidays) {
    const d = new Date(holiday.date + "T00:00:00");
    if (d.getDay() === 0) {
      // 日曜日 → 振替休日を探す
      const sub = new Date(d);
      sub.setDate(sub.getDate() + 1);
      while (true) {
        const subStr = sub.toISOString().split("T")[0];
        if (sub.getDay() !== 0 && sub.getDay() !== 6 && !holidayDates.has(subStr)) {
          substitutes.push({ date: subStr, name: `振替休日（${holiday.name}）` });
          holidayDates.add(subStr);
          break;
        }
        sub.setDate(sub.getDate() + 1);
      }
    }
  }

  // 国民の休日：祝日に挟まれた平日（前後が祝日なら休日）
  // 主に9月の敬老の日と秋分の日の間に発生しうる
  const allDates = [...holidays, ...substitutes].sort((a, b) => a.date.localeCompare(b.date));
  const nationalRestDays: NationalHoliday[] = [];
  for (let i = 0; i < allDates.length - 1; i++) {
    const curr = new Date(allDates[i].date + "T00:00:00");
    const next = new Date(allDates[i + 1].date + "T00:00:00");
    const diff = (next.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);
    if (diff === 2) {
      const between = new Date(curr);
      between.setDate(between.getDate() + 1);
      const betweenStr = between.toISOString().split("T")[0];
      if (!holidayDates.has(betweenStr) && between.getDay() !== 0 && between.getDay() !== 6) {
        nationalRestDays.push({ date: betweenStr, name: "国民の休日" });
        holidayDates.add(betweenStr);
      }
    }
  }

  const result = [...holidays, ...substitutes, ...nationalRestDays];
  result.sort((a, b) => a.date.localeCompare(b.date));
  return result;
}

/**
 * 指定期間の休日日付セットを取得（DB問い合わせ用ヘルパー）
 */
export function isHolidayInSet(dateStr: string, holidays: Set<string>): boolean {
  return holidays.has(dateStr);
}
