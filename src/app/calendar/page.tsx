"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Header from "@/components/Header";
import Navigation from "@/components/Navigation";
import MonthView from "@/components/calendar/MonthView";
import { CalendarEvent, Holiday } from "@/types/calendar";

export default function CalendarPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const fetchEvents = useCallback(async () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const start = new Date(year, month - 1, 21).toISOString().slice(0, 10);
    const end = new Date(year, month + 1, 10).toISOString().slice(0, 10);

    try {
      const [eventsRes, holidaysRes] = await Promise.all([
        fetch(`/api/calendar/events?start=${start}&end=${end}`),
        fetch(`/api/calendar/holidays?start=${start}&end=${end}`),
      ]);

      if (eventsRes.ok) {
        const data = await eventsRes.json();
        setEvents(data);
      }
      if (holidaysRes.ok) {
        const data = await holidaysRes.json();
        setHolidays(data);
      }
    } catch {
      // エラーは静かに処理
    }
    setLoading(false);
  }, [currentDate]);

  useEffect(() => {
    if (session) fetchEvents();
  }, [session, fetchEvents]);

  const goToPrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center">読み込み中...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header />

      {/* カレンダーヘッダー */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button
            onClick={goToPrevMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
          >
            ◀
          </button>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-gray-800">
              {currentDate.getFullYear()}年{currentDate.getMonth() + 1}月
            </h2>
            <button
              onClick={goToToday}
              className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-md font-medium hover:bg-indigo-200 transition-colors"
            >
              今日
            </button>
          </div>
          <button
            onClick={goToNextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
          >
            ▶
          </button>
        </div>
      </div>

      {/* カレンダー本体 */}
      <div className="max-w-lg mx-auto px-2 pt-2">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            読み込み中...
          </div>
        ) : (
          <MonthView
            currentDate={currentDate}
            events={events}
            holidays={holidays}
            onDateClick={(date) => {
              console.log("Date clicked:", date);
            }}
          />
        )}
      </div>

      {/* イベント追加FAB */}
      <button
        onClick={() => router.push("/calendar/event/new")}
        className="fixed bottom-20 right-4 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center text-2xl hover:bg-indigo-700 active:scale-95 transition-all z-40"
      >
        +
      </button>

      <Navigation />
    </div>
  );
}
