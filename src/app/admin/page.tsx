"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Navigation from "@/components/Navigation";
import HolidayWizard from "@/components/HolidayWizard";

interface Category {
  id: string;
  key: string;
  label: string;
  color: string;
  bgColor: string;
  isDefault: boolean;
}

interface TeamMember {
  id: string;
  userId: string;
  user: { id: string; name: string; role?: string };
}

interface Team {
  id: string;
  name: string;
  color: string;
  members: TeamMember[];
}

interface UserItem {
  id: string;
  name: string;
}

type Tab = "holidays" | "categories" | "teams";

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("holidays");

  // カテゴリ
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCatLabel, setNewCatLabel] = useState("");
  const [newCatColor, setNewCatColor] = useState("#6366f1");

  // チーム
  const [teams, setTeams] = useState<Team[]>([]);
  const [allUsers, setAllUsers] = useState<UserItem[]>([]);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamColor, setNewTeamColor] = useState("#3b82f6");
  const [addMemberTeamId, setAddMemberTeamId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  // データ取得
  useEffect(() => {
    if (!session) return;
    fetchCategories();
    fetchTeams();
    fetchUsers();
  }, [session]);

  const fetchCategories = () => {
    fetch("/api/calendar/categories").then((r) => r.json()).then(setCategories).catch(() => {});
  };

  const fetchTeams = () => {
    fetch("/api/teams").then((r) => r.json()).then((d) => { if (Array.isArray(d)) setTeams(d); }).catch(() => {});
  };

  const fetchUsers = () => {
    fetch("/api/calendar/events/group?start=2000-01-01&end=2000-01-01")
      .then((r) => r.json())
      .then((d) => { if (d.members) setAllUsers(d.members); })
      .catch(() => {});
  };

  // カテゴリ追加
  const handleAddCategory = async () => {
    if (!newCatLabel.trim()) return;
    const res = await fetch("/api/calendar/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: newCatLabel.trim(),
        color: newCatColor,
        bgColor: newCatColor + "20",
      }),
    });
    if (res.ok) {
      setNewCatLabel("");
      fetchCategories();
    }
  };

  // カテゴリ削除
  const handleDeleteCategory = async (id: string) => {
    if (!confirm("このカテゴリを削除しますか？")) return;
    const res = await fetch(`/api/calendar/categories/${id}`, { method: "DELETE" });
    if (res.ok) fetchCategories();
    else {
      const data = await res.json();
      alert(data.error || "削除できませんでした");
    }
  };

  // チーム追加
  const handleAddTeam = async () => {
    if (!newTeamName.trim()) return;
    const res = await fetch("/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newTeamName.trim(), color: newTeamColor }),
    });
    if (res.ok) {
      setNewTeamName("");
      fetchTeams();
    }
  };

  // チーム削除
  const handleDeleteTeam = async (id: string) => {
    if (!confirm("このチームを削除しますか？メンバー情報も削除されます。")) return;
    const res = await fetch(`/api/teams/${id}`, { method: "DELETE" });
    if (res.ok) fetchTeams();
  };

  // メンバー追加
  const handleAddMember = async (teamId: string) => {
    if (!selectedUserId) return;
    const res = await fetch(`/api/teams/${teamId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: selectedUserId }),
    });
    if (res.ok) {
      setSelectedUserId("");
      setAddMemberTeamId(null);
      fetchTeams();
    } else {
      const data = await res.json();
      alert(data.error || "追加できませんでした");
    }
  };

  // メンバー削除
  const handleRemoveMember = async (teamId: string, userId: string) => {
    if (!confirm("このメンバーを外しますか？")) return;
    const res = await fetch(`/api/teams/${teamId}/members?userId=${userId}`, { method: "DELETE" });
    if (res.ok) fetchTeams();
  };

  if (status === "loading") return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <Header />

      <div className="max-w-2xl mx-auto px-4 py-4">
        <h2 className="text-lg font-bold text-gray-800 mb-4">設定</h2>

        {/* タブ */}
        <div className="flex gap-1 mb-4 overflow-x-auto">
          {[
            { key: "holidays", label: "📅 休日管理" },
            { key: "categories", label: "🏷 カテゴリ管理" },
            { key: "teams", label: "👥 チーム管理" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as Tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.key ? "bg-indigo-600 text-white" : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* 休日管理 */}
        {tab === "holidays" && <HolidayWizard />}

        {/* カテゴリ管理 */}
        {tab === "categories" && (
          <div className="space-y-4">
            {/* 既存カテゴリ一覧 */}
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
              {categories.map((cat) => (
                <div key={cat.id} className="px-4 py-3 flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="text-sm font-medium text-gray-800 flex-1">{cat.label}</span>
                  {cat.isDefault ? (
                    <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded">標準</span>
                  ) : (
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      削除
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* カテゴリ追加 */}
            <div className="bg-white rounded-xl border border-gray-200 px-4 py-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">カテゴリを追加</h3>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <input
                    type="text"
                    value={newCatLabel}
                    onChange={(e) => setNewCatLabel(e.target.value)}
                    placeholder="カテゴリ名（例: 出張、研修）"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <input
                  type="color"
                  value={newCatColor}
                  onChange={(e) => setNewCatColor(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer"
                />
                <button
                  onClick={handleAddCategory}
                  disabled={!newCatLabel.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  追加
                </button>
              </div>
            </div>
          </div>
        )}

        {/* チーム管理 */}
        {tab === "teams" && (
          <div className="space-y-4">
            {/* 既存チーム一覧 */}
            {teams.map((team) => (
              <div key={team.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between" style={{ borderLeft: `4px solid ${team.color}` }}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-800">{team.name}</span>
                    <span className="text-xs text-gray-400">{team.members.length}人</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setAddMemberTeamId(addMemberTeamId === team.id ? null : team.id)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      + メンバー追加
                    </button>
                    <button
                      onClick={() => handleDeleteTeam(team.id)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      チーム削除
                    </button>
                  </div>
                </div>

                {/* メンバーリスト */}
                <div className="px-4 py-2 space-y-1">
                  {team.members.map((m) => (
                    <div key={m.userId} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center text-[10px] font-bold text-indigo-600">
                          {m.user.name.charAt(0)}
                        </div>
                        <span className="text-sm text-gray-700">{m.user.name}</span>
                      </div>
                      <button
                        onClick={() => handleRemoveMember(team.id, m.userId)}
                        className="text-[10px] text-red-400 hover:text-red-600"
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  {team.members.length === 0 && (
                    <p className="text-xs text-gray-400 py-2">メンバーがいません</p>
                  )}
                </div>

                {/* メンバー追加フォーム */}
                {addMemberTeamId === team.id && (
                  <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex gap-2">
                    <select
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="">ユーザーを選択</option>
                      {allUsers
                        .filter((u) => !team.members.some((m) => m.userId === u.id))
                        .map((u) => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                    </select>
                    <button
                      onClick={() => handleAddMember(team.id)}
                      disabled={!selectedUserId}
                      className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                    >
                      追加
                    </button>
                  </div>
                )}
              </div>
            ))}

            {/* チーム追加 */}
            <div className="bg-white rounded-xl border border-gray-200 px-4 py-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">チームを追加</h3>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <input
                    type="text"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder="チーム名（例: 営業部、開発チーム）"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <input
                  type="color"
                  value={newTeamColor}
                  onChange={(e) => setNewTeamColor(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer"
                />
                <button
                  onClick={handleAddTeam}
                  disabled={!newTeamName.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  追加
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <Navigation />
    </div>
  );
}
