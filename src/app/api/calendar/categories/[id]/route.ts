import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// DELETE: カテゴリ削除（デフォルトは削除不可）
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const category = await prisma.eventCategory.findUnique({ where: { id } });

    if (!category) {
      return NextResponse.json({ error: "カテゴリが見つかりません" }, { status: 404 });
    }
    if (category.isDefault) {
      return NextResponse.json({ error: "デフォルトカテゴリは削除できません" }, { status: 400 });
    }

    await prisma.eventCategory.delete({ where: { id } });
    return NextResponse.json({ message: "削除しました" });
  } catch (error) {
    console.error("Category DELETE error:", error);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
