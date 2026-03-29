import { NextResponse } from "next/server";

// ヘルスチェック（コールドスタート回避用）
export async function GET() {
  return NextResponse.json({ ok: true, time: new Date().toISOString() });
}
