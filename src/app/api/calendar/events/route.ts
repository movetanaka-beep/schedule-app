import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET: イベント一覧取得（日付範囲フィルタ）
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    if (!start || !end) {
      return NextResponse.json({ error: "start and end are required" }, { status: 400 });
    }

    const startDate = new Date(start + "T00:00:00Z");
    const endDate = new Date(end + "T23:59:59Z");

    // ユーザーのチームIDを取得
    const userTeams = await prisma.teamMember.findMany({
      where: { userId: session.user.id },
      select: { teamId: true },
    });
    const teamIds = userTeams.map((t: { teamId: string }) => t.teamId);

    // 表示可能なイベントを取得
    const events = await prisma.scheduleEvent.findMany({
      where: {
        startTime: { lte: endDate },
        endTime: { gte: startDate },
        OR: [
          // 自分が作成したイベント
          { createdBy: session.user.id },
          // 自分が参加者のイベント
          { participants: { some: { userId: session.user.id } } },
          // 全員共有のイベント（プライベートでない）
          { shareScope: "ALL", isPrivate: false },
          // チーム共有のイベント（プライベートでない、自分のチーム）
          {
            shareScope: "TEAM",
            isPrivate: false,
            shareTeamId: { in: teamIds },
          },
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

    // プライベートイベントは他人のものをマスク
    const result = events.map((event) => {
      if (event.isPrivate && event.createdBy !== session.user.id) {
        return {
          id: event.id,
          title: "予定あり",
          description: null,
          startTime: event.startTime.toISOString(),
          endTime: event.endTime.toISOString(),
          allDay: event.allDay,
          isPrivate: true,
          category: event.category,
          color: null,
          location: null,
          shareScope: event.shareScope,
          createdBy: event.createdBy,
          creatorName: event.creator.name,
          participants: [],
        };
      }

      return {
        id: event.id,
        title: event.title,
        description: event.description,
        startTime: event.startTime.toISOString(),
        endTime: event.endTime.toISOString(),
        allDay: event.allDay,
        isPrivate: event.isPrivate,
        category: event.category,
        color: event.color,
        location: event.location,
        shareScope: event.shareScope,
        createdBy: event.createdBy,
        creatorName: event.creator.name,
        participants: event.participants.map((p) => ({
          userId: p.userId,
          userName: p.user.name,
          status: p.status,
        })),
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Events GET error:", error);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}

// POST: イベント作成
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      title, description, startTime, endTime, allDay,
      isPrivate, category, color, location,
      shareScope, shareTeamId, participantIds, reminderMinutes,
    } = body;

    if (!title || !startTime || !endTime) {
      return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
    }

    const event = await prisma.scheduleEvent.create({
      data: {
        title,
        description: description || null,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        allDay: allDay || false,
        isPrivate: isPrivate || false,
        category: category || "DEFAULT",
        color: color || null,
        location: location || null,
        shareScope: shareScope || "PRIVATE",
        shareTeamId: shareTeamId || null,
        createdBy: session.user.id,
        participants: participantIds?.length
          ? {
              create: participantIds.map((userId: string) => ({
                userId,
                status: "PENDING",
              })),
            }
          : undefined,
        reminders: reminderMinutes
          ? {
              create: {
                userId: session.user.id,
                minutesBefore: reminderMinutes,
              },
            }
          : undefined,
      },
      include: {
        creator: { select: { id: true, name: true } },
        participants: {
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });

    return NextResponse.json(event);
  } catch (error) {
    console.error("Events POST error:", error);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
