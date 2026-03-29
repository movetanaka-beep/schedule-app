import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST: メンバー追加
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: teamId } = await params;
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: "ユーザーIDが必要です" }, { status: 400 });
    }

    // 既に所属していないか確認
    const existing = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });
    if (existing) {
      return NextResponse.json({ error: "既にメンバーです" }, { status: 400 });
    }

    const member = await prisma.teamMember.create({
      data: { teamId, userId },
      include: { user: { select: { id: true, name: true } } },
    });

    return NextResponse.json(member);
  } catch (error) {
    console.error("TeamMember POST error:", error);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}

// DELETE: メンバー削除
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: teamId } = await params;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "ユーザーIDが必要です" }, { status: 400 });
    }

    await prisma.teamMember.delete({
      where: { teamId_userId: { teamId, userId } },
    });

    return NextResponse.json({ message: "削除しました" });
  } catch (error) {
    console.error("TeamMember DELETE error:", error);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
