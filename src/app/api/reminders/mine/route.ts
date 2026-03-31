import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET: 自分の通知時刻に達した未送信リマインダーを返す（ブラウザ通知用）
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();

    const reminders = await prisma.eventReminder.findMany({
      where: {
        userId: session.user.id,
        sent: false,
      },
      include: {
        event: { select: { id: true, title: true, startTime: true, allDay: true } },
      },
    });

    // 通知時刻に達したものだけ返す
    const due = reminders.filter((r) => {
      const notifyAt = new Date(r.event.startTime.getTime() - r.minutesBefore * 60 * 1000);
      return now >= notifyAt && now <= r.event.startTime;
    });

    return NextResponse.json(
      due.map((r) => ({
        id: r.id,
        eventId: r.event.id,
        eventTitle: r.event.title,
        startTime: r.event.startTime.toISOString(),
        minutesBefore: r.minutesBefore,
      }))
    );
  } catch (error) {
    console.error("My reminders error:", error);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
