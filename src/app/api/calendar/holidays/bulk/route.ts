import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST: 指定年の休日を一括保存（既存を削除して新規作成）
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { year, holidays } = body as {
      year: number;
      holidays: Array<{ date: string; name: string; type: string }>;
    };

    if (!year || !holidays || !Array.isArray(holidays)) {
      return NextResponse.json({ error: "year and holidays are required" }, { status: 400 });
    }

    // 指定年の既存休日をすべて削除
    await prisma.companyHoliday.deleteMany({
      where: {
        date: {
          gte: `${year}-01-01`,
          lte: `${year}-12-31`,
        },
      },
    });

    // 一括作成
    let created = 0;
    for (const h of holidays) {
      try {
        await prisma.companyHoliday.create({
          data: {
            date: h.date,
            name: h.name,
            type: h.type || "COMPANY",
            createdBy: session.user.id,
          },
        });
        created++;
      } catch {
        // skip duplicates
      }
    }

    return NextResponse.json({ created, total: holidays.length });
  } catch (error) {
    console.error("Holiday bulk save error:", error);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
