import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// 日本の祝日データ（2025-2027）
function getJapaneseHolidays(year: number): { date: string; name: string }[] {
  const holidays: { date: string; name: string }[] = [];
  const y = String(year);

  // 固定祝日
  holidays.push({ date: `${y}-01-01`, name: "元日" });
  holidays.push({ date: `${y}-02-11`, name: "建国記念の日" });
  holidays.push({ date: `${y}-02-23`, name: "天皇誕生日" });
  holidays.push({ date: `${y}-04-29`, name: "昭和の日" });
  holidays.push({ date: `${y}-05-03`, name: "憲法記念日" });
  holidays.push({ date: `${y}-05-04`, name: "みどりの日" });
  holidays.push({ date: `${y}-05-05`, name: "こどもの日" });
  holidays.push({ date: `${y}-08-11`, name: "山の日" });
  holidays.push({ date: `${y}-11-03`, name: "文化の日" });
  holidays.push({ date: `${y}-11-23`, name: "勤労感謝の日" });

  // ハッピーマンデー（第N月曜日）
  holidays.push({ date: getNthMonday(year, 1, 2), name: "成人の日" });       // 1月第2月曜
  holidays.push({ date: getNthMonday(year, 7, 3), name: "海の日" });         // 7月第3月曜
  holidays.push({ date: getNthMonday(year, 9, 3), name: "敬老の日" });       // 9月第3月曜
  holidays.push({ date: getNthMonday(year, 10, 2), name: "スポーツの日" });  // 10月第2月曜

  // 春分の日・秋分の日（年ごとに計算）
  holidays.push({ date: `${y}-03-${getShunbun(year)}`, name: "春分の日" });
  holidays.push({ date: `${y}-09-${getShubun(year)}`, name: "秋分の日" });

  // 振替休日を計算
  const holidayDates = new Set(holidays.map((h) => h.date));
  const substitutes: { date: string; name: string }[] = [];

  for (const h of holidays) {
    const d = new Date(h.date + "T00:00:00");
    if (d.getDay() === 0) {
      // 日曜なら翌日以降で祝日でない日を振替休日にする
      let sub = new Date(d);
      do {
        sub.setDate(sub.getDate() + 1);
      } while (holidayDates.has(sub.toISOString().slice(0, 10)));
      const subStr = sub.toISOString().slice(0, 10);
      if (!holidayDates.has(subStr)) {
        substitutes.push({ date: subStr, name: `振替休日（${h.name}）` });
        holidayDates.add(subStr);
      }
    }
  }

  // 国民の休日（祝日に挟まれた平日）
  const allDates = [...holidays, ...substitutes].map((h) => h.date).sort();
  for (let i = 0; i < allDates.length - 1; i++) {
    const d1 = new Date(allDates[i] + "T00:00:00");
    const d2 = new Date(allDates[i + 1] + "T00:00:00");
    const diff = (d2.getTime() - d1.getTime()) / 86400000;
    if (diff === 2) {
      const between = new Date(d1);
      between.setDate(between.getDate() + 1);
      const betweenStr = between.toISOString().slice(0, 10);
      if (!holidayDates.has(betweenStr) && between.getDay() !== 0) {
        substitutes.push({ date: betweenStr, name: "国民の休日" });
      }
    }
  }

  return [...holidays, ...substitutes].sort((a, b) => a.date.localeCompare(b.date));
}

// 第N月曜日を取得
function getNthMonday(year: number, month: number, n: number): string {
  let count = 0;
  for (let day = 1; day <= 31; day++) {
    const d = new Date(year, month - 1, day);
    if (d.getMonth() !== month - 1) break;
    if (d.getDay() === 1) {
      count++;
      if (count === n) {
        return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      }
    }
  }
  return "";
}

// 春分の日（簡易計算）
function getShunbun(year: number): string {
  const day = Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
  return String(day).padStart(2, "0");
}

// 秋分の日（簡易計算）
function getShubun(year: number): string {
  const day = Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
  return String(day).padStart(2, "0");
}

// POST: 指定年の祝日を一括登録
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const year = body.year || new Date().getFullYear();

    const holidays = getJapaneseHolidays(year);
    let created = 0;
    let skipped = 0;

    for (const h of holidays) {
      const existing = await prisma.companyHoliday.findUnique({ where: { date: h.date } });
      if (existing) {
        skipped++;
        continue;
      }
      await prisma.companyHoliday.create({
        data: {
          date: h.date,
          name: h.name,
          type: "NATIONAL",
          createdBy: session.user.id,
        },
      });
      created++;
    }

    return NextResponse.json({
      message: `${year}年の祝日を登録しました`,
      created,
      skipped,
      total: holidays.length,
    });
  } catch (error) {
    console.error("Holiday seed error:", error);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
