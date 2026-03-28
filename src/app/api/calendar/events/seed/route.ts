import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST: ダミーイベント一括登録（管理者のみ）
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const events = body.events as Array<{
      title: string;
      startTime: string;
      endTime: string;
      allDay: boolean;
      category: string;
      shareScope: string;
      isPrivate: boolean;
      location?: string;
      color?: string;
      createdBy: string;
    }>;

    if (!events || !Array.isArray(events)) {
      return NextResponse.json({ error: "events array required" }, { status: 400 });
    }

    let created = 0;
    for (const ev of events) {
      await prisma.scheduleEvent.create({
        data: {
          title: ev.title,
          startTime: new Date(ev.startTime),
          endTime: new Date(ev.endTime),
          allDay: ev.allDay || false,
          isPrivate: ev.isPrivate || false,
          category: ev.category || "DEFAULT",
          location: ev.location || null,
          color: ev.color || null,
          shareScope: ev.shareScope || "ALL",
          createdBy: ev.createdBy,
        },
      });
      created++;
    }

    return NextResponse.json({ created });
  } catch (error) {
    console.error("Event seed error:", error);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
