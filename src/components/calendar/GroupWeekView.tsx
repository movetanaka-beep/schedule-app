"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { CATEGORY_COLORS, EventCategory, Holiday } from "@/types/calendar";

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

  const formatTime = (isoStr: string) => {
    const d = new Date(isoStr);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  // 日付のイベントをフィルタ
  const getEventsForDate = (events: EventItem[], dateStr: string) => {
    return events.filter((e) => e.startTime.slice(0, 10) === dateStr);
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
                    day.isToday ? "bg-blue-50" : "bg-gray-100"
                  }`}
                >
                  <div className={`${isHoliday ? "text-red-500" : isSaturday ? "text-blue-500" : "text-gray-700"}`}>
                    <span className="font-bold text-sm">{day.day}</span>
                    <span className="ml-1">（{WEEKDAYS[day.dayOfWeek]}）</span>
                  </div>
                  {holiday && (
                    <div className="text-[10px] text-red-400 mt-0.5">{holiday.name}</div>
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
              <tr key={member.id}>
                {/* メンバー名（固定列） */}
                <td className="sticky left-0 z-10 bg-white border border-gray-300 px-2 py-2 align-top">
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

                  return (
                    <td
                      key={day.date}
                      className={`border border-gray-300 px-1 py-1 align-top min-h-[60px] relative group ${
                        day.isToday ? "bg-blue-50/30" : ""
                      }`}
                    >
                      {/* イベント一覧 */}
                      <div className="space-y-0.5">
                        {dayEvents.map((event) => {
                          const color = event.color || CATEGORY_COLORS[event.category as EventCategory] || "#3b82f6";
                          return (
                            <button
                              key={event.id}
                              onClick={() => router.push(`/calendar/event/${event.id}`)}
                              className="w-full text-left flex items-start gap-1 px-1 py-0.5 rounded hover:bg-gray-100 transition-colors"
                            >
                              <span
                                className="inline-block w-2 h-2 rounded-full flex-shrink-0 mt-1"
                                style={{ backgroundColor: color }}
                              />
                              <span className="text-[11px] text-gray-700 leading-tight line-clamp-2">
                                {!event.allDay && (
                                  <span className="text-gray-400 mr-0.5">{formatTime(event.startTime)}</span>
                                )}
                                {event.title}
                              </span>
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
