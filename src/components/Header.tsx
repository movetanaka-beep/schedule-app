"use client";

import { useSession, signOut } from "next-auth/react";

export default function Header() {
  const { data: session } = useSession();

  return (
    <header className="bg-indigo-600 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-50">
      <h1 className="text-lg font-bold">📅 スケジュール</h1>
      <div className="flex items-center gap-3">
        {session?.user?.name && (
          <span className="text-sm opacity-90">{session.user.name}</span>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-xs bg-white/20 px-3 py-1.5 rounded-lg hover:bg-white/30 transition-colors"
        >
          ログアウト
        </button>
      </div>
    </header>
  );
}
