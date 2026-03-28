"use client";

import { CalendarEvent, Holiday, CATEGORY_COLORS, CATEGORY_LABELS, EventCategory } from "@/types/calendar";
import { useRouter } from "next/navigation";

interface DayDetailProps {
  date: string; // YYYY-MM-DD
  events: CalendarEvent[];
  holiday?: Holiday;
  onClose: () => void;
}

export default function DayDetail({ date, events, holiday, onClose }: DayDetailProps) {
  const router = useRouter();
  const dateObj = new Date(date + "T00:00:00");
  const dayOfWeek = ["日", "月", "火", "水", "木", "金", "土"][dateObj.getDay()];
  const isSunday = dateObj.getDay() === 0;
  const isSaturday = dateObj.getDay() === 6;

  const formatTime = (isoStr: string) => {
    const d = new Date(isoStr);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* 背景オーバーレイ */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* ボトムシート */}
      <div className="relative bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-y-auto animate-slide-up">
        {/* ハンドル */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* ヘッダー */}
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className={`text-xl font-bold ${isSunday || holiday ? "text-red-500" : isSaturday ? "text-blue-500" : "text-gray-800"}`}>
              {dateObj.getMonth() + 1}月{dateObj.getDate()}日（{dayOfWeek}）
            </h3>
            {holiday && (
              <p className="text-sm text-red-400 mt-0.5">{holiday.name}</p>
            )}
          </div>
          <button
            onClick={() => router.push(`/calendar/event/new?date=${date}`)}
            className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            + 追加
          </button>
        </div>

        {/* イベント一覧 */}
        <div className="px-5 py-3">
          {events.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p className="text-3xl mb-2">📅</p>
              <p className="text-sm">予定はありません</p>
            </div>
          ) : (
            <div className="space-y-2">
              {events.map((event) => {
                const color = event.color || CATEGORY_COLORS[event.category as EventCategory] || "#3b82f6";
                return (
                  <button
                    key={event.id}
                    onClick={() => router.push(`/calendar/event/${event.id}`)}
                    className="w-full text-left flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div
                      className="w-1 min-h-[40px] rounded-full flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {event.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {event.allDay ? (
                          <span className="text-xs text-gray-400">終日</span>
                        ) : (
                          <span className="text-xs text-gray-400">
                            {formatTime(event.startTime)} - {formatTime(event.endTime)}
                          </span>
                        )}
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full text-white"
                          style={{ backgroundColor: color }}
                        >
                          {CATEGORY_LABELS[event.category as EventCategory] || event.category}
                        </span>
                      </div>
                      {event.location && (
                        <p className="text-xs text-gray-400 mt-0.5">📍 {event.location}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 閉じるボタン */}
        <div className="px-5 pb-5 pt-2">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
