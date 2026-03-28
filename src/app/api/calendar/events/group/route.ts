import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET: グループメンバー全員のイベントを取得
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

    // メンバー一覧を取得
    let members;
    if (teamId) {
      const teamMembers = await prisma.teamMember.findMany({
        where: { teamId },
        include: { user: { select: { id: true, name: true, role: true } } },
        orderBy: { user: { name: "asc" } },
      });
      members = teamMembers.map((tm: { user: { id: string; name: string; role: string } }) => tm.user);
    } else {
      // チーム指定なしは全ユーザー
      members = await prisma.user.findMany({
        select: { id: true, name: true, role: true },
        orderBy: { name: "asc" },
      });
    }

    // 全メンバーのイベントを取得
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const events = await prisma.scheduleEvent.findMany({
      where: {
        startTime: { lte: endDate },
        endTime: { gte: startDate },
        OR: [
          { createdBy: { in: members.map((m: { id: string }) => m.id) } },
          { participants: { some: { userId: { in: members.map((m: { id: string }) => m.id) } } } },
        ],
      },
      include: {
        creator: { select: { id: true, name: true } },
        participants: {
          include: { user: { select: { id: true, name: true } } },
        },
      },
      orderBy: { startTime: "asc" },
    });

    // メンバーごとにイベントをグルーピング
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const memberEvents: Record<string, any[]> = {};
    members.forEach((m: { id: string }) => {
      memberEvents[m.id] = [];
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    events.forEach((event: any) => {
      // 作成者
      if (memberEvents[event.createdBy]) {
        // プライベートイベントは他人にはマスク
        if (event.isPrivate && event.createdBy !== session.user.id) {
          memberEvents[event.createdBy].push({
            id: event.id,
            title: "予定あり",
            startTime: event.startTime.toISOString(),
            endTime: event.endTime.toISOString(),
            allDay: event.allDay,
            isPrivate: true,
            category: "DEFAULT",
            color: "#9ca3af",
          });
        } else {
          memberEvents[event.createdBy].push({
            id: event.id,
            title: event.title,
            startTime: event.startTime.toISOString(),
            endTime: event.endTime.toISOString(),
            allDay: event.allDay,
            isPrivate: event.isPrivate,
            category: event.category,
            color: event.color,
            location: event.location,
          });
        }
      }

      // 参加者
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      event.participants.forEach((p: any) => {
        if (memberEvents[p.userId] && p.userId !== event.createdBy) {
          if (event.isPrivate && event.createdBy !== session.user.id) {
            memberEvents[p.userId].push({
              id: event.id,
              title: "予定あり",
              startTime: event.startTime.toISOString(),
              endTime: event.endTime.toISOString(),
              allDay: event.allDay,
              isPrivate: true,
              category: "DEFAULT",
              color: "#9ca3af",
            });
          } else {
            memberEvents[p.userId].push({
              id: event.id,
              title: event.title,
              startTime: event.startTime.toISOString(),
              endTime: event.endTime.toISOString(),
              allDay: event.allDay,
              isPrivate: event.isPrivate,
              category: event.category,
              color: event.color,
              location: event.location,
            });
          }
        }
      });
    });

    // 休日とチーム一覧も同時取得（API呼び出し回数を減らす）
    const [holidays, teams] = await Promise.all([
      prisma.companyHoliday.findMany({
        where: { date: { gte: start!, lte: end! } },
        orderBy: { date: "asc" },
      }),
      prisma.team.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

    return NextResponse.json({ members, memberEvents, holidays, teams });
  } catch (error) {
    console.error("Group events GET error:", error);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
