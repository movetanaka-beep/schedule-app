"use client";

import { useState, useEffect, useCallback } from "react";
import { generateNationalHolidays } from "@/lib/holiday-utils";

interface Holiday {
  id: string;
  date: string;
  name: string;
  type: string;
}

export default function HolidayWizard() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [step, setStep] = useState<"options" | "calendar">("options");
  const [existingHolidays, setExistingHolidays] = useState<Holiday[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Step 1
  const [includeWeekends, setIncludeWeekends] = useState(true);
  const [includeNational, setIncludeNational] = useState(true);

  // Step 2: key=YYYY-MM-DD, value={ name, type }
  const [holidayMap, setHolidayMap] = useState<Map<string, { name: string; type: string }>>(new Map());

  // 変更追跡
  const [hasChanges, setHasChanges] = useState(false);

  const fetchExisting = useCallback(async () => {
    const res = await fetch(`/api/calendar/holidays?start=${year}-01-01&end=${year}-12-31`);
    const data = await res.json();
    if (Array.isArray(data)) setExistingHolidays(data);
  }, [year]);

  useEffect(() => {
    fetchExisting();
  }, [fetchExisting]);

  // Step 1 → Step 2
  const goToCalendar = () => {
    const map = new Map<string, { name: string; type: string }>();

    // 既存DBデータがあれば読み込み
    if (existingHolidays.length > 0) {
      for (const h of existingHolidays) {
        map.set(h.date, { name: h.name, type: h.type });
      }
    }

    // 土日
    if (includeWeekends) {
      const cur = new Date(year, 0, 1);
      const end = new Date(year, 11, 31);
      while (cur <= end) {
        const dow = cur.getDay();
        if (dow === 0 || dow === 6) {
          const ds = fmtDate(cur);
          if (!map.has(ds)) {
            map.set(ds, { name: dow === 0 ? "日曜" : "土曜", type: "WEEKEND" });
          }
        }
        cur.setDate(cur.getDate() + 1);
      }
    }

    // 祝日
    if (includeNational) {
      const nationals = generateNationalHolidays(year);
      for (const h of nationals) {
        if (!map.has(h.date)) {
          map.set(h.date, { name: h.name, type: "NATIONAL" });
        } else {
          const existing = map.get(h.date)!;
          if (existing.type === "WEEKEND") {
            map.set(h.date, { name: h.name, type: "NATIONAL" });
          }
        }
      }
    }

    setHolidayMap(map);
    setStep("calendar");
    setSaved(false);
    setHasChanges(true);
  };

  // 日付クリック → 即トグル
  const handleDayClick = (dateStr: string) => {
    setHolidayMap((prev) => {
      const next = new Map(prev);
      if (next.has(dateStr)) {
        next.delete(dateStr);
      } else {
        next.set(dateStr, { name: "会社休日", type: "COMPANY" });
      }
      return next;
    });
    setHasChanges(true);
    setSaved(false);
  };

  // 保存
  const handleSave = async () => {
    setSaving(true);
    try {
      const holidays = Array.from(holidayMap.entries()).map(([date, { name, type }]) => ({
        date,
        name,
        type,
      }));
      const res = await fetch("/api/calendar/holidays/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, holidays }),
      });
      if (res.ok) {
        await fetchExisting();
        setSaved(true);
        setHasChanges(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  // --- helpers ---
  const fmtDate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const holidayCount = holidayMap.size;
  const weekendCount = Array.from(holidayMap.values()).filter((v) => v.type === "WEEKEND").length;
  const nationalCount = Array.from(holidayMap.values()).filter((v) => v.type === "NATIONAL").length;
  const companyCount = Array.from(holidayMap.values()).filter((v) => v.type === "COMPANY").length;

  // --- Step 1: オプション ---
  if (step === "options") {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-base font-bold text-gray-800 mb-4">{year}年 年間休日設定</h3>

          <div className="flex items-center gap-3 mb-5">
            <label className="text-sm text-gray-600">対象年度:</label>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              {[currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map((y) => (
                <option key={y} value={y}>{y}年</option>
              ))}
            </select>
            {existingHolidays.length > 0 && (
              <span className="text-xs text-gray-400">(設定済: {existingHolidays.length}日)</span>
            )}
          </div>

          <label className="flex items-center gap-3 py-4 border-t border-gray-100 cursor-pointer">
            <input
              type="checkbox"
              checked={includeWeekends}
              onChange={(e) => setIncludeWeekends(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <div>
              <div className="text-sm font-medium text-gray-800">土日を休業日にする</div>
              <div className="text-xs text-gray-400">毎週の土曜・日曜を休日として一括設定します</div>
            </div>
          </label>

          <label className="flex items-center gap-3 py-4 border-t border-gray-100 cursor-pointer">
            <input
              type="checkbox"
              checked={includeNational}
              onChange={(e) => setIncludeNational(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <div>
              <div className="text-sm font-medium text-gray-800">国民の祝日を休業日にする</div>
              <div className="text-xs text-gray-400">{year}年の祝日・振替休日を一括設定します</div>
            </div>
          </label>

          <button
            onClick={goToCalendar}
            className="w-full mt-4 bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 font-medium transition-colors"
          >
            次へ：カレンダーで確認・編集
          </button>
        </div>
      </div>
    );
  }

  // --- Step 2: カレンダー ---
  return (
    <div className="space-y-3">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <button onClick={() => setStep("options")} className="text-sm text-indigo-600 font-medium">
          ← オプションに戻る
        </button>
        <div className="text-xs text-gray-500">
          休日 <span className="font-bold text-gray-800 text-sm">{holidayCount}</span>日
          <span className="ml-1 text-gray-400">
            (土日{weekendCount} / 祝日{nationalCount} / 他{companyCount})
          </span>
        </div>
      </div>

      {/* 操作ガイド */}
      <div className="text-xs text-gray-400 text-center">
        日付をクリックで休日ON/OFF切替
      </div>

      {/* 12ヶ月カレンダー 4列3段 */}
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 12 }, (_, m) => {
          const daysInMonth = new Date(year, m + 1, 0).getDate();
          const startDay = new Date(year, m, 1).getDay();

          return (
            <div key={m} className="bg-white rounded-lg border border-gray-100 p-1.5 text-center">
              <div className="text-xs font-bold text-gray-700 mb-1">{m + 1}月</div>
              <div className="grid grid-cols-7 gap-px">
                {["日", "月", "火", "水", "木", "金", "土"].map((d) => (
                  <div
                    key={d}
                    className={`text-[7px] leading-tight font-medium ${
                      d === "日" ? "text-red-400" : d === "土" ? "text-blue-400" : "text-gray-400"
                    }`}
                  >
                    {d}
                  </div>
                ))}
                {Array.from({ length: startDay }).map((_, i) => (
                  <div key={`e-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const day = i + 1;
                  const dateStr = `${year}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const entry = holidayMap.get(dateStr);
                  const d = new Date(year, m, day);
                  const isSun = d.getDay() === 0;
                  const isSat = d.getDay() === 6;

                  let bgClass = "hover:bg-gray-100";
                  let textClass = isSun ? "text-red-400" : isSat ? "text-blue-400" : "text-gray-700";

                  if (entry) {
                    if (entry.type === "WEEKEND") {
                      bgClass = "bg-blue-100 hover:bg-blue-200";
                      textClass = "text-blue-700";
                    } else if (entry.type === "NATIONAL") {
                      bgClass = "bg-red-100 hover:bg-red-200";
                      textClass = "text-red-700 font-bold";
                    } else {
                      bgClass = "bg-green-100 hover:bg-green-200";
                      textClass = "text-green-700 font-bold";
                    }
                  }

                  return (
                    <button
                      key={day}
                      onClick={() => handleDayClick(dateStr)}
                      className={`w-full aspect-square flex items-center justify-center rounded-sm text-[8px] leading-none cursor-pointer transition-colors ${bgClass} ${textClass}`}
                      title={entry ? `${entry.name}（クリックで解除）` : "クリックで休日追加"}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* 凡例 */}
      <div className="flex gap-4 text-xs justify-center text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-blue-100 border border-blue-200 rounded-sm" /> 土日
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-red-100 border border-red-200 rounded-sm" /> 祝日
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-green-100 border border-green-200 rounded-sm" /> 会社休日
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-white border border-gray-300 rounded-sm" /> 営業日
        </span>
      </div>

      {/* 保存 */}
      <div className="space-y-2">
        {saved && !hasChanges && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center text-sm text-green-700 font-medium">
            {year}年の休日設定を保存しました（{holidayCount}日）
          </div>
        )}
        {hasChanges && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50 transition-colors"
          >
            {saving ? "保存中..." : `この内容で確定する（休日 ${holidayCount}日）`}
          </button>
        )}
      </div>
    </div>
  );
}
