"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Header from "@/components/Header";
import { CATEGORY_COLORS, CATEGORY_LABELS, EventCategory } from "@/types/calendar";

const categories: EventCategory[] = ["DEFAULT", "MEETING", "TASK", "REMINDER", "OUT_OF_OFFICE"];

function NewEventForm() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateParam = searchParams.get("date");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // フォーム状態
  const today = new Date();
  const defaultDate = dateParam || `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(defaultDate);
  const [endDate, setEndDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [allDay, setAllDay] = useState(false);
  const [multiDay, setMultiDay] = useState(false);
  const [category, setCategory] = useState<EventCategory>("DEFAULT");
  const [location, setLocation] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [shareScope, setShareScope] = useState("PRIVATE");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("タイトルを入力してください");
      return;
    }

    setLoading(true);
    setError("");

    const actualEndDate = multiDay ? endDate : startDate;
    const startDateTime = allDay
      ? `${startDate}T00:00:00`
      : `${startDate}T${startTime}:00`;
    const endDateTime = allDay
      ? `${actualEndDate}T23:59:59`
      : `${actualEndDate}T${endTime}:00`;

    try {
      const res = await fetch("/api/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          startTime: startDateTime,
          endTime: endDateTime,
          allDay,
          category,
          location: location.trim() || null,
          isPrivate,
          shareScope,
        }),
      });

      if (res.ok) {
        router.push("/calendar");
      } else {
        const data = await res.json();
        setError(data.error || "エラーが発生しました");
      }
    } catch {
      setError("通信エラーが発生しました");
    }
    setLoading(false);
  };

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center">読み込み中...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-lg mx-auto px-4 py-4">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => router.back()}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            ← 戻る
          </button>
          <h2 className="text-lg font-bold text-gray-800">予定を作成</h2>
          <div className="w-10" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* タイトル */}
          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="タイトル"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-base focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              autoFocus
            />
          </div>

          {/* カテゴリ */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  category === cat
                    ? "text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
                style={category === cat ? { backgroundColor: CATEGORY_COLORS[cat] } : {}}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>

          {/* 終日・複数日 */}
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            <div className="px-4 py-3 flex items-center gap-3">
              <label className="text-sm text-gray-700 flex-1">終日</label>
              <input
                type="checkbox"
                checked={allDay}
                onChange={(e) => setAllDay(e.target.checked)}
                className="w-5 h-5 rounded text-indigo-600"
              />
            </div>
            <div className="px-4 py-3 flex items-center gap-3">
              <label className="text-sm text-gray-700 flex-1">複数日</label>
              <input
                type="checkbox"
                checked={multiDay}
                onChange={(e) => {
                  setMultiDay(e.target.checked);
                  if (!e.target.checked) setEndDate(startDate);
                }}
                className="w-5 h-5 rounded text-indigo-600"
              />
            </div>
          </div>

          {/* 日付・時間 */}
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            <div className="px-4 py-3 flex items-center gap-3">
              <span className="text-sm text-gray-500 w-16">{multiDay ? "開始日" : "日付"}</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (!multiDay || endDate < e.target.value) setEndDate(e.target.value);
                }}
                className="flex-1 text-sm text-gray-800 bg-transparent"
              />
            </div>
            {multiDay && (
              <div className="px-4 py-3 flex items-center gap-3">
                <span className="text-sm text-gray-500 w-16">終了日</span>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="flex-1 text-sm text-gray-800 bg-transparent"
                />
              </div>
            )}
            {!allDay && (
              <>
                <div className="px-4 py-3 flex items-center gap-3">
                  <span className="text-sm text-gray-500 w-16">開始時刻</span>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="flex-1 text-sm text-gray-800 bg-transparent"
                  />
                </div>
                <div className="px-4 py-3 flex items-center gap-3">
                  <span className="text-sm text-gray-500 w-16">終了時刻</span>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="flex-1 text-sm text-gray-800 bg-transparent"
                  />
                </div>
              </>
            )}
          </div>

          {/* 場所 */}
          <div>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="場所（任意）"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* メモ */}
          <div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="メモ（任意）"
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
          </div>

          {/* 公開設定 */}
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            <div className="px-4 py-3 flex items-center gap-3">
              <span className="text-sm text-gray-500 w-20">公開範囲</span>
              <select
                value={shareScope}
                onChange={(e) => setShareScope(e.target.value)}
                className="flex-1 text-sm text-gray-800 bg-transparent"
              >
                <option value="PRIVATE">自分のみ</option>
                <option value="TEAM">チーム</option>
                <option value="ALL">全員</option>
              </select>
            </div>
            <div className="px-4 py-3 flex items-center gap-3">
              <label className="text-sm text-gray-500 flex-1">プライベート（他の人には「予定あり」と表示）</label>
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="w-5 h-5 rounded text-indigo-600"
              />
            </div>
          </div>

          {/* エラー */}
          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          {/* 送信ボタン */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors text-base"
          >
            {loading ? "作成中..." : "予定を作成"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function NewEventPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">読み込み中...</div>}>
      <NewEventForm />
    </Suspense>
  );
}
