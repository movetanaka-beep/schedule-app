"use client";

import { useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";

interface ReminderItem {
  id: string;
  eventId: string;
  eventTitle: string;
  startTime: string;
  minutesBefore: number;
}

export default function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const notifiedIds = useRef<Set<string>>(new Set());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const requestPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") {
      await Notification.requestPermission();
    }
  }, []);

  const checkReminders = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const res = await fetch("/api/reminders/mine");
      if (!res.ok) return;
      const reminders: ReminderItem[] = await res.json();

      for (const r of reminders) {
        if (notifiedIds.current.has(r.id)) continue;
        notifiedIds.current.add(r.id);

        const timeLabel =
          r.minutesBefore >= 60
            ? `${Math.floor(r.minutesBefore / 60)}時間前`
            : `${r.minutesBefore}分前`;

        const startTime = new Date(r.startTime).toLocaleTimeString("ja-JP", {
          hour: "2-digit",
          minute: "2-digit",
        });

        // ブラウザ通知
        if (Notification.permission === "granted") {
          new Notification(`📅 ${r.eventTitle}`, {
            body: `${startTime}から（${timeLabel}）`,
            icon: "/favicon.ico",
            tag: r.id,
          });
        }
      }
    } catch {
      // silently fail
    }
  }, [session]);

  useEffect(() => {
    if (!session) return;

    requestPermission();
    checkReminders();

    // 60秒ごとにポーリング
    intervalRef.current = setInterval(checkReminders, 60 * 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [session, requestPermission, checkReminders]);

  return <>{children}</>;
}
