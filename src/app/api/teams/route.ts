import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET: チーム一覧
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teams = await prisma.team.findMany({
      include: {
        members: {
          include: { user: { select: { id: true, name: true, role: true } } },
        },
        _count: { select: { members: true } },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(teams);
  } catch (error) {
    console.error("Teams GET error:", error);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}

// POST: チーム作成
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, color } = body;

    if (!name) {
      return NextResponse.json({ error: "チーム名は必須です" }, { status: 400 });
    }

    const team = await prisma.team.create({
      data: {
        name,
        description: description || null,
        color: color || "#3b82f6",
      },
    });

    return NextResponse.json(team);
  } catch (error) {
    console.error("Teams POST error:", error);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
