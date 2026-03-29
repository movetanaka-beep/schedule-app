import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// デフォルトカテゴリ（初回シード用）
const DEFAULT_CATEGORIES = [
  { key: "DEFAULT", label: "予定", color: "#3b82f6", bgColor: "#e8f0fe", isDefault: true, sortOrder: 0 },
  { key: "MEETING", label: "会議", color: "#0ea5e9", bgColor: "#e0f2fe", isDefault: true, sortOrder: 1 },
  { key: "TASK", label: "タスク", color: "#eab308", bgColor: "#fef9c3", isDefault: true, sortOrder: 2 },
  { key: "REMINDER", label: "リマインダー", color: "#10b981", bgColor: "#d1fae5", isDefault: true, sortOrder: 3 },
  { key: "OUT_OF_OFFICE", label: "外出", color: "#ef4444", bgColor: "#fee2e2", isDefault: true, sortOrder: 4 },
];

// GET: カテゴリ一覧
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let categories = await prisma.eventCategory.findMany({
      orderBy: { sortOrder: "asc" },
    });

    // 初回アクセス時にデフォルトカテゴリを作成
    if (categories.length === 0) {
      for (const cat of DEFAULT_CATEGORIES) {
        await prisma.eventCategory.create({ data: cat });
      }
      categories = await prisma.eventCategory.findMany({
        orderBy: { sortOrder: "asc" },
      });
    }

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Categories GET error:", error);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}

// POST: カテゴリ追加
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { label, color, bgColor } = body;

    if (!label || !color) {
      return NextResponse.json({ error: "名前と色は必須です" }, { status: 400 });
    }

    // キーを自動生成（ラベルからアルファベット化）
    const key = "CUSTOM_" + Date.now().toString(36).toUpperCase();

    // 最大sortOrderを取得
    const maxOrder = await prisma.eventCategory.findFirst({
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const category = await prisma.eventCategory.create({
      data: {
        key,
        label,
        color,
        bgColor: bgColor || color + "20",
        isDefault: false,
        sortOrder: (maxOrder?.sortOrder ?? 0) + 1,
      },
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error("Categories POST error:", error);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
