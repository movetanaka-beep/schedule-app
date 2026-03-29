"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useMemo } from "react";
import Header from "@/components/Header";
import Navigation from "@/components/Navigation";
import GroupWeekView from "@/components/calendar/GroupWeekView";
import PersonalMonthView from "@/components/calendar/PersonalMonthView";
import DayDetail from "@/components/calendar/DayDetail";
import { CalendarEvent, Holiday } from "@/types/calendar";

type ViewMode = "groupWeek" | "personalMonth";

interface Member {
  id: string;
  name: string;
  role: string;
}

interface Team {
  id: string;
  name: string;
}

export default function CalendarPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>("groupWeek");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // グループ週間ビュー用
  const [members, setMembers] = useState<Member[]>([]);
  const [memberEvents, setMemberEvents] = useState<Record<string, CalendarEvent[]>>({});
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  // チーム一覧はグループ週間ビューのAPIレスポンスから取得

  // 週の開始日を計算（土曜始まり → 参考画像に合わせて）
  const weekStartDate = useMemo(() => {
    const d = new Date(currentDate);
    const day = d.getDay();
    d.setDate(d.getDate() - day); // 日曜始まり
    return d;
  }, [currentDate]);

  // グループ週間ビューのデータ取得
  const fetchGroupWeek = useCallback(async () => {
    const start = new Date(weekStartDate);
    const end = new Date(weekStartDate);
    end.setDate(end.getDate() + 6);
    const startStr = start.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);

    try {
      const params = new URLSearchParams({ start: startStr, end: endStr });
      if (selectedTeamId) params.set("teamId", selectedTeamId);

      const groupRes = await fetch(`/api/calendar/events/group?${params}`);

      if (groupRes.ok) {
        const data = await groupRes.json();
        setMembers(data.members || []);
        setMemberEvents(data.memberEvents || {});
        setHolidays(data.holidays || []);
        if (data.teams && teams.length === 0) setTeams(data.teams);
      }
    } catch {
      // エラーは静かに処理
    }
    setLoading(false);
  }, [weekStartDate, selectedTeamId]);

  // 個人月間ビューのデータ取得
  const fetchPersonalMonth = useCallback(async () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const start = new Date(year, month - 1, 21).toISOString().slice(0, 10);
    const end = new Date(year, month + 1, 10).toISOString().slice(0, 10);

    try {
      const [eventsRes, holidaysRes] = await Promise.all([
        fetch(`/api/calendar/events?start=${start}&end=${end}`),
        fetch(`/api/calendar/holidays?start=${start}&end=${end}`),
      ]);

      if (eventsRes.ok) setEvents(await eventsRes.json());
      if (holidaysRes.ok) setHolidays(await holidaysRes.json());
    } catch {}
    setLoading(false);
  }, [currentDate]);

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    if (viewMode === "groupWeek") {
      fetchGroupWeek();
    } else {
      fetchPersonalMonth();
    }
  }, [session, viewMode, fetchGroupWeek, fetchPersonalMonth]);

  // ナビゲーション
  const goToPrev = () => {
    const d = new Date(currentDate);
    if (viewMode === "groupWeek") {
      d.setDate(d.getDate() - 7);
    } else {
      d.setMonth(d.getMonth() - 1);
    }
    setCurrentDate(d);
  };

  const goToNext = () => {
    const d = new Date(currentDate);
    if (viewMode === "groupWeek") {
      d.setDate(d.getDate() + 7);
    } else {
      d.setMonth(d.getMonth() + 1);
    }
    setCurrentDate(d);
  };

  const goToToday = () => setCurrentDate(new Date());

  // 選択日のデータ
  const selectedDayEvents = useMemo(() => {
    if (!selectedDate) return [];
    return events.filter((e) => e.startTime.slice(0, 10) === selectedDate);
  }, [selectedDate, events]);

  const selectedDayHoliday = useMemo(() => {
    if (!selectedDate) return undefined;
    return holidays.find((h) => h.date === selectedDate);
  }, [selectedDate, holidays]);

  // 日付ラベル
  const dateLabel = useMemo(() => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth() + 1;
    const d = currentDate.getDate();
    const weekday = ["日", "月", "火", "水", "木", "金", "土"][currentDate.getDay()];
    if (viewMode === "personalMonth") return `${y}年${m}月`;
    return `${y}年${m}月${d}日（${weekday}）`;
  }, [currentDate, viewMode]);

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center">読み込み中...</div>;
  }

  return (
    <div className="min-h-screen bg-white pb-16">
      <Header />

      {/* ビュー切替タブ */}
      <div className="border-b border-gray-300 bg-gray-50">
        <div className="flex">
          {[
            { key: "groupWeek", label: "全体・グループ週", icon: "📊" },
            { key: "personalMonth", label: "個人月", icon: "🗓" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setViewMode(tab.key as ViewMode)}
              className={`flex-shrink-0 px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
                viewMode === tab.key
                  ? "border-indigo-600 text-indigo-600 bg-white"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 日付ナビ + グループ選択 */}
      <div className="border-b border-gray-200 bg-white px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          {/* グループ選択 */}
          {viewMode === "groupWeek" && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500">グループ</span>
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
              >
                <option value="">全員</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* 日付表示 */}
          <div className="flex items-center gap-1 flex-1 justify-center">
            <button onClick={goToPrev} className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded">
              ◀ {viewMode === "groupWeek" ? "前週" : "前月"}
            </button>
            <button onClick={goToToday} className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded font-medium">
              今日
            </button>
            <button onClick={goToNext} className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded">
              {viewMode === "groupWeek" ? "翌週" : "翌月"} ▶
            </button>
          </div>

          {/* 日付ラベル */}
          <div className="text-sm font-bold text-gray-800">{dateLabel}</div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3">
            <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-500">読み込み中...</span>
          </div>
        ) : viewMode === "groupWeek" ? (
          <GroupWeekView
            startDate={weekStartDate}
            members={members}
            memberEvents={memberEvents}
            holidays={holidays}
            onAddEvent={(date) => router.push(`/calendar/event/new?date=${date}`)}
          />
        ) : (
          <PersonalMonthView
            currentDate={currentDate}
            events={events}
            holidays={holidays}
          />
        )}
      </div>

      {/* 日付詳細モーダル */}
      {selectedDate && (
        <DayDetail
          date={selectedDate}
          events={selectedDayEvents}
          holiday={selectedDayHoliday}
          onClose={() => setSelectedDate(null)}
        />
      )}

      <Navigation />
    </div>
  );
}
