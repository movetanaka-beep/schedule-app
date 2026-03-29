import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET: イベント詳細
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const event = await prisma.scheduleEvent.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, name: true } },
        participants: {
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "イベントが見つかりません" }, { status: 404 });
    }

    return NextResponse.json({
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      participants: event.participants.map((p: any) => ({
        userId: p.userId,
        userName: p.user.name,
        status: p.status,
      })),
      createdAt: event.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("Event GET error:", error);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}

// DELETE: イベント削除
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const event = await prisma.scheduleEvent.findUnique({ where: { id } });
    if (!event) {
      return NextResponse.json({ error: "イベントが見つかりません" }, { status: 404 });
    }

    // 作成者または管理者のみ削除可能
    if (event.createdBy !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "削除権限がありません" }, { status: 403 });
    }

    await prisma.scheduleEvent.delete({ where: { id } });

    return NextResponse.json({ message: "削除しました" });
  } catch (error) {
    console.error("Event DELETE error:", error);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}

// PATCH: イベント更新
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const event = await prisma.scheduleEvent.findUnique({ where: { id } });
    if (!event) {
      return NextResponse.json({ error: "イベントが見つかりません" }, { status: 404 });
    }

    if (event.createdBy !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "編集権限がありません" }, { status: 403 });
    }

    const updated = await prisma.scheduleEvent.update({
      where: { id },
      data: {
        title: body.title ?? event.title,
        description: body.description !== undefined ? body.description : event.description,
        startTime: body.startTime ? new Date(body.startTime) : event.startTime,
        endTime: body.endTime ? new Date(body.endTime) : event.endTime,
        allDay: body.allDay ?? event.allDay,
        isPrivate: body.isPrivate ?? event.isPrivate,
        category: body.category ?? event.category,
        color: body.color !== undefined ? body.color : event.color,
        location: body.location !== undefined ? body.location : event.location,
        shareScope: body.shareScope ?? event.shareScope,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Event PATCH error:", error);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
