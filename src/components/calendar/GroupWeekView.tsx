"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { EventCategory, Holiday } from "@/types/calendar";

// カテゴリごとの背景色（サイボウズ風の淡い色）
const CATEGORY_BG: Record<string, string> = {
  DEFAULT: "#e8f0fe",
  MEETING: "#e0f2fe",
  TASK: "#fef9c3",
  REMINDER: "#d1fae5",
  OUT_OF_OFFICE: "#fee2e2",
};

const CATEGORY_BORDER: Record<string, string> = {
  DEFAULT: "#3b82f6",
  MEETING: "#0ea5e9",
  TASK: "#eab308",
  REMINDER: "#10b981",
  OUT_OF_OFFICE: "#ef4444",
};

interface EventItem {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  isPrivate: boolean;
  category: string;
  color?: string | null;
  location?: string | null;
}

interface Member {
  id: string;
  name: string;
  role: string;
}

interface GroupWeekViewProps {
  startDate: Date; // 週の開始日
  members: Member[];
  memberEvents: Record<string, EventItem[]>;
  holidays: Holiday[];
  onAddEvent: (date: string) => void;
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

export default function GroupWeekView({
  startDate,
  members,
  memberEvents,
  holidays,
  onAddEvent,
}: GroupWeekViewProps) {
  const router = useRouter();

  // 7日分の日付を生成
  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      days.push({
        date: dateStr,
        day: d.getDate(),
        dayOfWeek: d.getDay(),
        isToday: dateStr === new Date().toISOString().slice(0, 10),
      });
    }
    return days;
  }, [startDate]);

  // 休日マップ
  const holidayMap = useMemo(() => {
    const map: Record<string, Holiday> = {};
    holidays.forEach((h) => { map[h.date] = h; });
    return map;
  }, [holidays]);

  const formatTimeRange = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    return `${s.getHours()}:${String(s.getMinutes()).padStart(2, "0")}-${e.getHours()}:${String(e.getMinutes()).padStart(2, "0")}`;
  };

  // 日付のイベントをフィルタ（複数日にまたがるイベントも表示）
  // 並び順: 終日が上、それ以外は時間順
  const getEventsForDate = (events: EventItem[], dateStr: string) => {
    return events
      .filter((e) => {
        const eventStart = e.startTime.slice(0, 10);
        const eventEnd = e.endTime.slice(0, 10);
        return dateStr >= eventStart && dateStr <= eventEnd;
      })
      .sort((a, b) => {
        // 終日イベントを先に
        if (a.allDay && !b.allDay) return -1;
        if (!a.allDay && b.allDay) return 1;
        // 両方終日なら名前順
        if (a.allDay && b.allDay) return a.title.localeCompare(b.title);
        // 両方時間指定なら開始時刻順
        return a.startTime.localeCompare(b.startTime);
      });
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse min-w-[800px]">
        {/* ヘッダー: 日付行 */}
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-gray-100 border border-gray-300 px-2 py-2 text-left text-xs font-medium text-gray-600 w-[140px] min-w-[140px]">
              メンバー
            </th>
            {weekDays.map((day) => {
              const holiday = holidayMap[day.date];
              const isSunday = day.dayOfWeek === 0;
              const isSaturday = day.dayOfWeek === 6;
              const isHoliday = !!holiday || isSunday;

              return (
                <th
                  key={day.date}
                  className={`border border-gray-300 px-1 py-2 text-center text-xs font-medium min-w-[120px] ${
                    day.isToday
                      ? "bg-yellow-100 border-yellow-400"
                      : isSunday || isHoliday
                      ? "bg-red-100"
                      : isSaturday
                      ? "bg-blue-100"
                      : "bg-gray-100"
                  }`}
                >
                  <div className={`font-bold ${isHoliday || isSunday ? "text-red-600" : isSaturday ? "text-blue-600" : "text-gray-700"}`}>
                    <span className="text-sm">{day.day}</span>
                    <span className="ml-1">（{WEEKDAYS[day.dayOfWeek]}）</span>
                  </div>
                  {holiday && (
                    <div className="text-[10px] text-red-500 font-medium mt-0.5">{holiday.name}</div>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>

        {/* ボディ: メンバー×日付 */}
        <tbody>
          {members.map((member) => {
            const events = memberEvents[member.id] || [];

            return (
              <tr key={member.id} className="border-t-2 border-t-gray-400">
                {/* メンバー名（固定列） */}
                <td className="sticky left-0 z-10 bg-gray-50 border border-gray-300 border-t-2 border-t-gray-400 px-2 py-2 align-top" style={{ minHeight: "110px" }}>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center text-xs font-bold text-indigo-600 flex-shrink-0">
                      {member.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-xs font-medium text-gray-800 leading-tight">{member.name}</div>
                      {member.role === "ADMIN" && (
                        <div className="text-[10px] text-gray-400">管理者</div>
                      )}
                    </div>
                  </div>
                </td>

                {/* 各日付のセル */}
                {weekDays.map((day) => {
                  const dayEvents = getEventsForDate(events, day.date);

                  const isSunday = day.dayOfWeek === 0;
                  const isSaturday = day.dayOfWeek === 6;
                  const isHoliday = !!holidayMap[day.date];
                  let cellBg = "";
                  if (isSunday || isHoliday) cellBg = "bg-red-50";
                  else if (isSaturday) cellBg = "bg-blue-50";
                  if (day.isToday) cellBg = "bg-yellow-50";

                  return (
                    <td
                      key={day.date}
                      className={`border border-gray-300 px-1 py-1 align-top relative group ${cellBg}`}
                      style={{ minHeight: "110px" }}
                    >
                      {/* イベント一覧（最低5段分の高さを確保） */}
                      <div className="space-y-0.5" style={{ minHeight: "95px" }}>
                        {dayEvents.map((event) => {
                          const cat = event.category as EventCategory;
                          const bg = event.color ? `${event.color}20` : (CATEGORY_BG[cat] || CATEGORY_BG.DEFAULT);
                          const border = event.color || CATEGORY_BORDER[cat] || CATEGORY_BORDER.DEFAULT;

                          return (
                            <button
                              key={event.id}
                              onClick={() => router.push(`/calendar/event/${event.id}`)}
                              className="w-full text-left rounded px-1 py-0.5 hover:opacity-80 transition-opacity block"
                              style={{ backgroundColor: bg, borderLeft: `3px solid ${border}`, fontSize: "10px", lineHeight: "15px" }}
                            >
                              {event.allDay ? (
                                <span className="font-medium text-gray-700 truncate block">{event.title}</span>
                              ) : (
                                <span className="truncate block">
                                  <span className="text-gray-400">{formatTimeRange(event.startTime, event.endTime)}</span>
                                  {" "}
                                  <span className="text-gray-700">{event.title}</span>
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* ＋ボタン（ホバー時表示） */}
                      <button
                        onClick={() => onAddEvent(day.date)}
                        className="absolute bottom-0.5 right-0.5 w-5 h-5 bg-green-500 text-white rounded text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-green-600"
                        title="予定を追加"
                      >
                        +
                      </button>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
