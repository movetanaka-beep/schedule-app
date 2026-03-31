import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendReminderEmail } from "@/lib/mail";

export const dynamic = "force-dynamic";

// GET: 未送信リマインダーをチェックしてメール送信（cronから呼び出し）
export async function GET() {
  try {
    const now = new Date();

    // sent=falseのリマインダーをイベント・ユーザー情報と一緒に取得
    const pendingReminders = await prisma.eventReminder.findMany({
      where: { sent: false },
      include: {
        event: { select: { title: true, startTime: true, endTime: true, allDay: true } },
        user: { select: { name: true, email: true } },
      },
    });

    let sent = 0;
    let skipped = 0;

    for (const reminder of pendingReminders) {
      // 通知時刻 = イベント開始時刻 - minutesBefore分
      const notifyAt = new Date(
        reminder.event.startTime.getTime() - reminder.minutesBefore * 60 * 1000
      );

      // まだ通知時刻に達していない
      if (now < notifyAt) {
        skipped++;
        continue;
      }

      // イベントが既に終了している場合はスキップ（sent=trueに更新）
      if (now > reminder.event.endTime) {
        await prisma.eventReminder.update({
          where: { id: reminder.id },
          data: { sent: true },
        });
        skipped++;
        continue;
      }

      // 日時フォーマット
      const startDate = reminder.event.startTime.toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "short",
        timeZone: "Asia/Tokyo",
      });
      const startTime = reminder.event.allDay
        ? "終日"
        : reminder.event.startTime.toLocaleTimeString("ja-JP", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Tokyo",
          });

      try {
        await sendReminderEmail({
          to: reminder.user.email,
          userName: reminder.user.name,
          eventTitle: reminder.event.title,
          eventDate: startDate,
          eventTime: startTime,
          minutesBefore: reminder.minutesBefore,
        });

        await prisma.eventReminder.update({
          where: { id: reminder.id },
          data: { sent: true },
        });
        sent++;
      } catch (err) {
        console.error(`Failed to send reminder ${reminder.id}:`, err);
      }
    }

    return NextResponse.json({ checked: pendingReminders.length, sent, skipped });
  } catch (error) {
    console.error("Reminder check error:", error);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
