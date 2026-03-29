"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Header from "@/components/Header";
interface CategoryItem {
  id: string;
  key: string;
  label: string;
  color: string;
  bgColor: string;
}

interface UserItem {
  id: string;
  name: string;
}

interface TeamItem {
  id: string;
  name: string;
  members: { user: UserItem }[];
}

function NewEventForm() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateParam = searchParams.get("date");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState<CategoryItem[]>([]);

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
  const [category, setCategory] = useState("DEFAULT");
  const [location, setLocation] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [shareScope, setShareScope] = useState("ALL");

  // 参加者選択
  const [allUsers, setAllUsers] = useState<UserItem[]>([]);
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [showParticipants, setShowParticipants] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  // カテゴリ一覧を取得
  useEffect(() => {
    if (!session) return;
    fetch("/api/calendar/categories").then((r) => r.json()).then((d) => {
      if (Array.isArray(d)) setCategories(d);
    }).catch(() => {});
  }, [session]);

  // ユーザーとチーム一覧を取得
  useEffect(() => {
    if (!session) return;
    fetch("/api/teams")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setTeams(data);
          // 全ユーザーをチームメンバーから抽出（重複除去）
          const userMap = new Map<string, UserItem>();
          data.forEach((team: TeamItem) => {
            team.members?.forEach((m) => {
              if (m.user) userMap.set(m.user.id, m.user);
            });
          });
          // チームに所属していないユーザーも含めるため、全ユーザー取得
          fetch("/api/calendar/events/group?start=2000-01-01&end=2000-01-01")
            .then((r) => r.json())
            .then((d) => {
              if (d.members) {
                d.members.forEach((m: UserItem) => userMap.set(m.id, m));
              }
              setAllUsers(Array.from(userMap.values()).sort((a, b) => a.name.localeCompare(b.name)));
            })
            .catch(() => {
              setAllUsers(Array.from(userMap.values()).sort((a, b) => a.name.localeCompare(b.name)));
            });
        }
      })
      .catch(() => {});
  }, [session]);

  // チーム一括選択
  const toggleTeam = (teamId: string) => {
    const team = teams.find((t) => t.id === teamId);
    if (!team) return;
    const teamMemberIds = team.members.map((m) => m.user.id);
    const allSelected = teamMemberIds.every((id) => selectedUserIds.has(id));

    const newSet = new Set(selectedUserIds);
    if (allSelected) {
      teamMemberIds.forEach((id) => newSet.delete(id));
    } else {
      teamMemberIds.forEach((id) => newSet.add(id));
    }
    // 自分自身は除外（作成者として自動的に含まれる）
    if (session?.user?.id) newSet.delete(session.user.id);
    setSelectedUserIds(newSet);
  };

  // 全員選択
  const toggleAll = () => {
    if (selectedUserIds.size === allUsers.filter((u) => u.id !== session?.user?.id).length) {
      setSelectedUserIds(new Set());
    } else {
      const newSet = new Set(allUsers.filter((u) => u.id !== session?.user?.id).map((u) => u.id));
      setSelectedUserIds(newSet);
    }
  };

  // 個別ユーザー選択
  const toggleUser = (userId: string) => {
    const newSet = new Set(selectedUserIds);
    if (newSet.has(userId)) {
      newSet.delete(userId);
    } else {
      newSet.add(userId);
    }
    setSelectedUserIds(newSet);
  };

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
          participantIds: Array.from(selectedUserIds),
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
          <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700 text-sm">
            ← 戻る
          </button>
          <h2 className="text-lg font-bold text-gray-800">予定を作成</h2>
          <div className="w-10" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* タイトル */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="タイトル"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-base focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            autoFocus
          />

          {/* カテゴリ */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => setCategory(cat.key)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  category === cat.key ? "text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
                style={category === cat.key ? { backgroundColor: cat.color } : {}}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* 終日・複数日 */}
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {!multiDay && (
              <div className="px-4 py-3 flex items-center gap-3">
                <label className="text-sm text-gray-700 flex-1">終日</label>
                <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} className="w-5 h-5 rounded text-indigo-600" />
              </div>
            )}
            <div className="px-4 py-3 flex items-center gap-3">
              <label className="text-sm text-gray-700 flex-1">複数日</label>
              <input
                type="checkbox"
                checked={multiDay}
                onChange={(e) => {
                  setMultiDay(e.target.checked);
                  if (e.target.checked) setAllDay(true);
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
                <input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} className="flex-1 text-sm text-gray-800 bg-transparent" />
              </div>
            )}
            {!allDay && !multiDay && (
              <>
                <div className="px-4 py-3 flex items-center gap-3">
                  <span className="text-sm text-gray-500 w-16">開始時刻</span>
                  <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="flex-1 text-sm text-gray-800 bg-transparent" />
                </div>
                <div className="px-4 py-3 flex items-center gap-3">
                  <span className="text-sm text-gray-500 w-16">終了時刻</span>
                  <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="flex-1 text-sm text-gray-800 bg-transparent" />
                </div>
              </>
            )}
          </div>

          {/* 場所 */}
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="場所（任意）"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />

          {/* 参加者選択 */}
          <div className="bg-white rounded-xl border border-gray-200">
            <button
              type="button"
              onClick={() => setShowParticipants(!showParticipants)}
              className="w-full px-4 py-3 flex items-center justify-between text-sm"
            >
              <span className="text-gray-700 font-medium">
                参加者
                {selectedUserIds.size > 0 && (
                  <span className="ml-2 text-indigo-600">（{selectedUserIds.size}人選択中）</span>
                )}
              </span>
              <span className="text-gray-400">{showParticipants ? "▲" : "▼"}</span>
            </button>

            {showParticipants && (
              <div className="border-t border-gray-100 px-4 py-3 space-y-3">
                {/* 一括選択ボタン */}
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={toggleAll}
                    className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                      selectedUserIds.size === allUsers.filter((u) => u.id !== session?.user?.id).length
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    全員
                  </button>
                  {teams.map((team) => {
                    const teamMemberIds = team.members.map((m) => m.user.id).filter((id) => id !== session?.user?.id);
                    const allSelected = teamMemberIds.length > 0 && teamMemberIds.every((id) => selectedUserIds.has(id));
                    return (
                      <button
                        key={team.id}
                        type="button"
                        onClick={() => toggleTeam(team.id)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                          allSelected
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {team.name}
                      </button>
                    );
                  })}
                </div>

                {/* 個別ユーザー選択 */}
                <div className="space-y-1 max-h-[200px] overflow-y-auto">
                  {allUsers
                    .filter((u) => u.id !== session?.user?.id)
                    .map((user) => (
                      <label
                        key={user.id}
                        className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedUserIds.has(user.id)}
                          onChange={() => toggleUser(user.id)}
                          className="w-4 h-4 rounded text-indigo-600"
                        />
                        <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center text-[10px] font-bold text-indigo-600 flex-shrink-0">
                          {user.name.charAt(0)}
                        </div>
                        <span className="text-sm text-gray-700">{user.name}</span>
                      </label>
                    ))}
                </div>

                {selectedUserIds.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedUserIds(new Set())}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    選択をクリア
                  </button>
                )}
              </div>
            )}
          </div>

          {/* メモ */}
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="メモ（任意）"
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
          />

          {/* 公開設定 */}
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            <div className="px-4 py-3 flex items-center gap-3">
              <span className="text-sm text-gray-500 w-20">公開範囲</span>
              <select value={shareScope} onChange={(e) => setShareScope(e.target.value)} className="flex-1 text-sm text-gray-800 bg-transparent">
                <option value="ALL">全員に表示</option>
                <option value="TEAM">チームに表示</option>
                <option value="PRIVATE">自分のみ</option>
              </select>
            </div>
            <div className="px-4 py-3 flex items-center gap-3">
              <label className="text-sm text-gray-500 flex-1">プライベート（他の人には「予定あり」と表示）</label>
              <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} className="w-5 h-5 rounded text-indigo-600" />
            </div>
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

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
