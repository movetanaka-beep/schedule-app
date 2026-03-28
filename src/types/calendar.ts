// イベントカテゴリ
export type EventCategory = "DEFAULT" | "MEETING" | "TASK" | "REMINDER" | "OUT_OF_OFFICE";

// カテゴリのデフォルト色
export const CATEGORY_COLORS: Record<EventCategory, string> = {
  DEFAULT: "#3b82f6",      // 青
  MEETING: "#8b5cf6",      // 紫
  TASK: "#f59e0b",         // 黄
  REMINDER: "#10b981",     // 緑
  OUT_OF_OFFICE: "#ef4444", // 赤
};

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  DEFAULT: "予定",
  MEETING: "会議",
  TASK: "タスク",
  REMINDER: "リマインダー",
  OUT_OF_OFFICE: "外出",
};

// 共有範囲
export type ShareScope = "PRIVATE" | "TEAM" | "ALL";

// 参加ステータス
export type ParticipantStatus = "PENDING" | "ACCEPTED" | "DECLINED";

// 休日タイプ
export type HolidayType = "NATIONAL" | "COMPANY" | "HALF_DAY";

export const HOLIDAY_TYPE_LABELS: Record<HolidayType, string> = {
  NATIONAL: "法定休日",
  COMPANY: "会社休日",
  HALF_DAY: "半休日",
};

// カレンダービューモード
export type CalendarView = "month" | "week" | "day";

// イベント表示用の型
export interface CalendarEvent {
  id: string;
  title: string;
  description?: string | null;
  startTime: string;
  endTime: string;
  allDay: boolean;
  isPrivate: boolean;
  category: EventCategory;
  color?: string | null;
  location?: string | null;
  shareScope: ShareScope;
  createdBy: string;
  creatorName?: string;
  participants?: {
    userId: string;
    userName: string;
    status: ParticipantStatus;
  }[];
}

// 休日表示用の型
export interface Holiday {
  id: string;
  date: string;
  name: string;
  type: HolidayType;
}
