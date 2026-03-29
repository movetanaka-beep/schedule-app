"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { CalendarEvent, Holiday, CATEGORY_COLORS, EventCategory } from "@/types/calendar";

interface PersonalMonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  holidays: Holiday[];
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

// カテゴリごとの背景色（サイボウズ風の淡い色）
const CATEGORY_BG: Record<string, string> = {
  DEFAULT: "#e8f0fe",      // 淡い青
  MEETING: "#e0f2fe",      // 淡い水色
  TASK: "#fef9c3",         // 淡い黄
  REMINDER: "#d1fae5",     // 淡い緑
  OUT_OF_OFFICE: "#fee2e2", // 淡い赤/ピンク
};

const CATEGORY_BORDER: Record<string, string> = {
  DEFAULT: "#3b82f6",
  MEETING: "#0ea5e9",
  TASK: "#eab308",
  REMINDER: "#10b981",
  OUT_OF_OFFICE: "#ef4444",
};

export default function PersonalMonthView({ currentDate, events, holidays }: PersonalMonthViewProps) {
  const router = useRouter();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  // カレンダーグリッド
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const days: { date: string; day: number; isCurrentMonth: boolean; dayOfWeek: number }[] = [];

    for (let i = firstDay - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const m = month === 0 ? 12 : month;
      const y = month === 0 ? year - 1 : year;
      days.push({ date: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`, day: d, isCurrentMonth: false, dayOfWeek: days.length % 7 });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({ date: `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`, day: d, isCurrentMonth: true, dayOfWeek: days.length % 7 });
    }
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const m = month + 2 > 12 ? 1 : month + 2;
      const y = month + 2 > 12 ? year + 1 : year;
      days.push({ date: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`, day: d, isCurrentMonth: false, dayOfWeek: days.length % 7 });
    }
    return days;
  }, [currentDate]);

  // イベントマップ（複数日対応）
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    events.forEach((event) => {
      const startDate = event.startTime.slice(0, 10);
      const endDate = event.endTime.slice(0, 10);
      // 各日にイベントを割り当て
      const current = new Date(startDate + "T00:00:00");
      const end = new Date(endDate + "T00:00:00");
      while (current <= end) {
        const dateStr = current.toISOString().slice(0, 10);
        if (!map[dateStr]) map[dateStr] = [];
        map[dateStr].push(event);
        current.setDate(current.getDate() + 1);
      }
    });
    // ソート: 終日→時間順
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => {
        if (a.allDay && !b.allDay) return -1;
        if (!a.allDay && b.allDay) return 1;
        if (a.allDay && b.allDay) return a.title.localeCompare(b.title);
        return a.startTime.localeCompare(b.startTime);
      });
    }
    return map;
  }, [events]);

  const holidayMap = useMemo(() => {
    const map: Record<string, Holiday> = {};
    holidays.forEach((h) => { map[h.date] = h; });
    return map;
  }, [holidays]);

  const formatTime = (isoStr: string) => {
    const d = new Date(isoStr);
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const formatTimeRange = (start: string, end: string) => {
    return `${formatTime(start)}-${formatTime(end)}`;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse min-w-[700px]">
        <thead>
          <tr>
            {WEEKDAYS.map((day, i) => (
              <th
                key={day}
                className={`border border-gray-300 px-1 py-2 text-center text-xs font-bold ${
                  i === 0 ? "text-red-600 bg-red-200 text-sm" : i === 6 ? "text-blue-600 bg-blue-200 text-sm" : "text-gray-600 bg-gray-100 text-sm"
                }`}
              >
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: Math.ceil(calendarDays.length / 7) }).map((_, weekIdx) => (
            <tr key={weekIdx}>
              {calendarDays.slice(weekIdx * 7, weekIdx * 7 + 7).map((cell) => {
                const holiday = holidayMap[cell.date];
                const isSunday = cell.dayOfWeek === 0;
                const isSaturday = cell.dayOfWeek === 6;
                const isHoliday = !!holiday;
                const isToday = cell.date === todayStr;
                const dayEvents = eventsByDate[cell.date] || [];

                let cellBg = "";
                if (isSunday || isHoliday) cellBg = "bg-red-100";
                else if (isSaturday) cellBg = "bg-blue-100";
                if (isToday) cellBg = "bg-yellow-200";

                return (
                  <td
                    key={cell.date}
                    className={`border border-gray-300 align-top min-h-[100px] h-[100px] w-[14.28%] relative group ${cellBg} ${
                      !cell.isCurrentMonth ? "opacity-40" : ""
                    }`}
                  >
                    {/* 日付ヘッダー */}
                    <div className="flex items-center justify-between px-1 pt-0.5">
                      <span className={`text-sm font-bold ${
                        isToday ? "bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center" :
                        isSunday || isHoliday ? "text-red-600" :
                        isSaturday ? "text-blue-600" : "text-gray-700"
                      }`}>
                        {cell.day}
                      </span>
                      {holiday && cell.isCurrentMonth && (
                        <span className="text-[10px] text-red-500 font-medium truncate ml-0.5">{holiday.name}</span>
                      )}
                    </div>

                    {/* イベント一覧 */}
                    <div className="px-0.5 mt-0.5 space-y-0.5 overflow-hidden" style={{ maxHeight: "70px" }}>
                      {dayEvents.slice(0, 4).map((event, idx) => {
                        const cat = event.category as EventCategory;
                        const bg = CATEGORY_BG[cat] || CATEGORY_BG.DEFAULT;
                        const border = CATEGORY_BORDER[cat] || CATEGORY_BORDER.DEFAULT;

                        return (
                          <button
                            key={`${event.id}-${idx}`}
                            onClick={() => router.push(`/calendar/event/${event.id}`)}
                            className="w-full text-left rounded px-1.5 py-0.5 hover:opacity-80 transition-opacity block truncate"
                            style={{ backgroundColor: bg, borderLeft: `3px solid ${border}`, fontSize: "11px", lineHeight: "17px" }}
                          >
                            {event.allDay ? (
                              <span className="font-semibold text-gray-800">{event.title}</span>
                            ) : (
                              <>
                                <span className="text-gray-500 font-medium">{formatTimeRange(event.startTime, event.endTime)}</span>
                                {" "}
                                <span className="text-gray-800 font-medium">{event.title}</span>
                              </>
                            )}
                          </button>
                        );
                      })}
                      {dayEvents.length > 4 && (
                        <span className="text-[9px] text-gray-400 px-1">+{dayEvents.length - 4}件</span>
                      )}
                    </div>

                    {/* ＋ボタン */}
                    {cell.isCurrentMonth && (
                      <button
                        onClick={() => router.push(`/calendar/event/new?date=${cell.date}`)}
                        className="absolute bottom-0.5 left-0.5 w-4 h-4 bg-green-500 text-white rounded text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-green-600"
                      >
                        +
                      </button>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
