import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET: 休日一覧取得
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    const year = searchParams.get("year");

    let where = {};
    if (start && end) {
      where = { date: { gte: start, lte: end } };
    } else if (year) {
      where = { date: { startsWith: year } };
    }

    const holidays = await prisma.companyHoliday.findMany({
      where,
      orderBy: { date: "asc" },
    });

    return NextResponse.json(holidays);
  } catch (error) {
    console.error("Holidays GET error:", error);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}

// POST: 休日追加（管理者のみ）
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { date, name, type } = body;

    if (!date || !name) {
      return NextResponse.json({ error: "日付と名称は必須です" }, { status: 400 });
    }

    // 重複チェック
    const existing = await prisma.companyHoliday.findUnique({ where: { date } });
    if (existing) {
      return NextResponse.json({ error: "この日付の休日は既に登録されています" }, { status: 400 });
    }

    const holiday = await prisma.companyHoliday.create({
      data: {
        date,
        name,
        type: type || "COMPANY",
        createdBy: session.user.id,
      },
    });

    return NextResponse.json(holiday);
  } catch (error) {
    console.error("Holidays POST error:", error);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
