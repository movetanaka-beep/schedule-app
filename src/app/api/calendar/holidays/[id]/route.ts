import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// DELETE: 休日削除
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await prisma.companyHoliday.delete({ where: { id } });
    return NextResponse.json({ message: "削除しました" });
  } catch (error) {
    console.error("Holiday DELETE error:", error);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
