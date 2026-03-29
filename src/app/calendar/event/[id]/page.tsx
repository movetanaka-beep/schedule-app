"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { CATEGORY_COLORS, CATEGORY_LABELS, EventCategory } from "@/types/calendar";

const CATEGORY_BG: Record<string, string> = {
  DEFAULT: "#e8f0fe",
  MEETING: "#e0f2fe",
  TASK: "#fef9c3",
  REMINDER: "#d1fae5",
  OUT_OF_OFFICE: "#fee2e2",
};

interface EventDetail {
  id: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  allDay: boolean;
  isPrivate: boolean;
  category: string;
  color: string | null;
  location: string | null;
  shareScope: string;
  createdBy: string;
  creatorName: string;
  participants: { userId: string; userName: string; status: string }[];
  createdAt: string;
}

export default function EventDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (!session || !eventId) return;
    fetch(`/api/calendar/events/${eventId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setEvent(data);
      })
      .catch(() => setError("読み込みに失敗しました"))
      .finally(() => setLoading(false));
  }, [session, eventId]);

  const handleDelete = async () => {
    if (!confirm("この予定を削除しますか？")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/calendar/events/${eventId}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/calendar");
      } else {
        const data = await res.json();
        alert(data.error || "削除に失敗しました");
      }
    } catch {
      alert("通信エラー");
    }
    setDeleting(false);
  };

  const formatDate = (isoStr: string) => {
    const d = new Date(isoStr);
    const weekday = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${weekday}）`;
  };

  const formatTime = (isoStr: string) => {
    const d = new Date(isoStr);
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const isMultiDay = event ? event.startTime.slice(0, 10) !== event.endTime.slice(0, 10) : false;
  const isOwner = event?.createdBy === session?.user?.id;
  const isAdmin = session?.user?.role === "ADMIN";
  const canEdit = isOwner || isAdmin;

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center py-20 gap-3">
          <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-500">読み込み中...</span>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-lg mx-auto px-4 py-8 text-center">
          <p className="text-red-500 mb-4">{error || "イベントが見つかりません"}</p>
          <button onClick={() => router.push("/calendar")} className="text-indigo-600 text-sm">
            ← カレンダーに戻る
          </button>
        </div>
      </div>
    );
  }

  const cat = event.category as EventCategory;
  const catColor = CATEGORY_COLORS[cat] || "#3b82f6";
  const catBg = CATEGORY_BG[cat] || CATEGORY_BG.DEFAULT;
  const catLabel = CATEGORY_LABELS[cat] || event.category;

  const scopeLabel = event.shareScope === "ALL" ? "全員" : event.shareScope === "TEAM" ? "チーム" : "自分のみ";

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-lg mx-auto px-4 py-4">
        {/* 戻るボタン */}
        <button onClick={() => router.push("/calendar")} className="text-gray-500 hover:text-gray-700 text-sm mb-4">
          ← カレンダーに戻る
        </button>

        {/* カテゴリバー + タイトル */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
          <div className="px-5 py-4" style={{ borderLeft: `5px solid ${catColor}`, backgroundColor: catBg }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2 py-0.5 rounded-full text-white font-medium" style={{ backgroundColor: catColor }}>
                {catLabel}
              </span>
              {event.isPrivate && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">🔒 プライベート</span>
              )}
            </div>
            <h1 className="text-xl font-bold text-gray-800">{event.title}</h1>
          </div>
        </div>

        {/* 日時 */}
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 mb-4 space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-gray-400 text-lg mt-0.5">📅</span>
            <div>
              {event.allDay ? (
                isMultiDay ? (
                  <p className="text-sm text-gray-800">
                    {formatDate(event.startTime)} 〜 {formatDate(event.endTime)}
                    <span className="text-gray-400 ml-2">（終日）</span>
                  </p>
                ) : (
                  <p className="text-sm text-gray-800">
                    {formatDate(event.startTime)}
                    <span className="text-gray-400 ml-2">（終日）</span>
                  </p>
                )
              ) : (
                <p className="text-sm text-gray-800">
                  {formatDate(event.startTime)}
                  <span className="text-gray-700 ml-2 font-medium">
                    {formatTime(event.startTime)} - {formatTime(event.endTime)}
                  </span>
                </p>
              )}
            </div>
          </div>

          {event.location && (
            <div className="flex items-start gap-3">
              <span className="text-gray-400 text-lg mt-0.5">📍</span>
              <p className="text-sm text-gray-800">{event.location}</p>
            </div>
          )}

          <div className="flex items-start gap-3">
            <span className="text-gray-400 text-lg mt-0.5">👁</span>
            <p className="text-sm text-gray-600">公開範囲: {scopeLabel}</p>
          </div>
        </div>

        {/* 参加者 */}
        {event.participants.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 mb-4">
            <h3 className="text-sm font-medium text-gray-600 mb-2">参加者</h3>
            <div className="space-y-2">
              {/* 作成者 */}
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center text-xs font-bold text-indigo-600">
                  {event.creatorName.charAt(0)}
                </div>
                <span className="text-sm text-gray-800">{event.creatorName}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-600">作成者</span>
              </div>
              {/* 参加者リスト */}
              {event.participants.map((p) => (
                <div key={p.userId} className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">
                    {p.userName.charAt(0)}
                  </div>
                  <span className="text-sm text-gray-800">{p.userName}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* メモ */}
        {event.description && (
          <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 mb-4">
            <h3 className="text-sm font-medium text-gray-600 mb-1">メモ</h3>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{event.description}</p>
          </div>
        )}

        {/* 作成情報 */}
        <div className="text-xs text-gray-400 mb-4 px-1">
          作成者: {event.creatorName} ・ 作成日: {formatDate(event.createdAt)}
        </div>

        {/* アクションボタン */}
        {canEdit && (
          <div className="space-y-2">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="w-full py-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors border border-red-200 disabled:opacity-50"
            >
              {deleting ? "削除中..." : "この予定を削除"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
