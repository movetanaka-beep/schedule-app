import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET: グループメンバー全員のイベントを取得（最適化版）
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    const teamId = searchParams.get("teamId");

    if (!start || !end) {
      return NextResponse.json({ error: "start and end are required" }, { status: 400 });
    }

    const startDate = new Date(start + "T00:00:00Z");
    const endDate = new Date(end + "T23:59:59Z");

    // メンバー取得と休日・チームを全て並列実行
    const [membersRaw, holidays, teams] = await Promise.all([
      teamId
        ? prisma.teamMember.findMany({
            where: { teamId },
            include: { user: { select: { id: true, name: true, role: true } } },
            orderBy: { user: { name: "asc" } },
          })
        : prisma.user.findMany({
            select: { id: true, name: true, role: true },
            orderBy: { name: "asc" },
          }),
      prisma.companyHoliday.findMany({
        where: { date: { gte: start!, lte: end! } },
        orderBy: { date: "asc" },
      }),
      prisma.team.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const members = teamId ? (membersRaw as any[]).map((tm) => tm.user) : membersRaw;
    const memberIds = members.map((m: { id: string }) => m.id);

    // イベント取得
    const events = await prisma.scheduleEvent.findMany({
      where: {
        startTime: { lte: endDate },
        endTime: { gte: startDate },
        OR: [
          { createdBy: { in: memberIds } },
          { participants: { some: { userId: { in: memberIds } } } },
        ],
      },
      select: {
        id: true,
        title: true,
        startTime: true,
        endTime: true,
        allDay: true,
        isPrivate: true,
        category: true,
        color: true,
        location: true,
        createdBy: true,
        participants: { select: { userId: true } },
      },
      orderBy: { startTime: "asc" },
    });

    // メンバーごとにイベントをグルーピング（軽量化）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const memberEvents: Record<string, any[]> = {};
    memberIds.forEach((id: string) => { memberEvents[id] = []; });

    const myId = session.user.id;

    for (const event of events) {
      const masked = event.isPrivate && event.createdBy !== myId;
      const item = masked
        ? {
            id: event.id,
            title: "予定あり",
            startTime: event.startTime.toISOString(),
            endTime: event.endTime.toISOString(),
            allDay: event.allDay,
            isPrivate: true,
            category: "DEFAULT",
            color: "#9ca3af",
          }
        : {
            id: event.id,
            title: event.title,
            startTime: event.startTime.toISOString(),
            endTime: event.endTime.toISOString(),
            allDay: event.allDay,
            isPrivate: event.isPrivate,
            category: event.category,
            color: event.color,
            location: event.location,
          };

      // 作成者
      if (memberEvents[event.createdBy]) {
        memberEvents[event.createdBy].push(item);
      }

      // 参加者
      for (const p of event.participants) {
        if (memberEvents[p.userId] && p.userId !== event.createdBy) {
          memberEvents[p.userId].push(item);
        }
      }
    }

    return NextResponse.json({ members, memberEvents, holidays, teams });
  } catch (error) {
    console.error("Group events GET error:", error);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
