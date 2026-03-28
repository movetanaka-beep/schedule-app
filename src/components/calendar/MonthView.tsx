"use client";

import { useMemo } from "react";
import { CalendarEvent, Holiday, CATEGORY_COLORS, EventCategory } from "@/types/calendar";

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  holidays: Holiday[];
  onDateClick: (date: string) => void;
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

export default function MonthView({ currentDate, events, holidays, onDateClick }: MonthViewProps) {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  // カレンダーのグリッドデータを計算
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 月初の曜日
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const days: { date: string; day: number; isCurrentMonth: boolean }[] = [];

    // 前月の日
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const m = month === 0 ? 12 : month;
      const y = month === 0 ? year - 1 : year;
      days.push({
        date: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        day: d,
        isCurrentMonth: false,
      });
    }

    // 当月の日
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({
        date: `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        day: d,
        isCurrentMonth: true,
      });
    }

    // 次月の日（6行になるまで埋める）
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const m = month + 2 > 12 ? 1 : month + 2;
      const y = month + 2 > 12 ? year + 1 : year;
      days.push({
        date: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        day: d,
        isCurrentMonth: false,
      });
    }

    return days;
  }, [currentDate]);

  // 日付ごとのイベントマップ
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    events.forEach((event) => {
      const dateStr = event.startTime.slice(0, 10);
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push(event);
    });
    return map;
  }, [events]);

  // 日付ごとの休日マップ
  const holidayByDate = useMemo(() => {
    const map: Record<string, Holiday> = {};
    holidays.forEach((h) => {
      map[h.date] = h;
    });
    return map;
  }, [holidays]);

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {WEEKDAYS.map((day, i) => (
          <div
            key={day}
            className={`text-center text-xs font-medium py-2 ${
              i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-gray-500"
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* 日付グリッド */}
      <div className="grid grid-cols-7">
        {calendarDays.map(({ date, day, isCurrentMonth }, index) => {
          const isToday = date === todayStr;
          const dayOfWeek = index % 7;
          const isSunday = dayOfWeek === 0;
          const isSaturday = dayOfWeek === 6;
          const holiday = holidayByDate[date];
          const dayEvents = eventsByDate[date] || [];
          const isHoliday = !!holiday || isSunday;

          return (
            <button
              key={date}
              onClick={() => onDateClick(date)}
              className={`relative min-h-[52px] p-1 border-b border-r border-gray-50 transition-colors
                ${isCurrentMonth ? "" : "opacity-30"}
                ${isToday ? "bg-indigo-50" : "hover:bg-gray-50"}
              `}
            >
              {/* 日付数字 */}
              <span
                className={`text-xs font-medium block text-center leading-5
                  ${isToday ? "bg-indigo-600 text-white rounded-full w-5 h-5 mx-auto flex items-center justify-center" : ""}
                  ${!isToday && isHoliday ? "text-red-500" : ""}
                  ${!isToday && isSaturday ? "text-blue-500" : ""}
                  ${!isToday && !isHoliday && !isSaturday ? "text-gray-700" : ""}
                `}
              >
                {day}
              </span>

              {/* 休日名 */}
              {holiday && isCurrentMonth && (
                <p className="text-[8px] text-red-400 truncate leading-tight mt-0.5 text-center">
                  {holiday.name}
                </p>
              )}

              {/* イベントドット */}
              {dayEvents.length > 0 && isCurrentMonth && (
                <div className="flex justify-center gap-0.5 mt-0.5">
                  {dayEvents.slice(0, 3).map((ev, i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        backgroundColor: ev.color || CATEGORY_COLORS[ev.category as EventCategory] || "#3b82f6",
                      }}
                    />
                  ))}
                  {dayEvents.length > 3 && (
                    <span className="text-[7px] text-gray-400 leading-none">
                      +{dayEvents.length - 3}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
