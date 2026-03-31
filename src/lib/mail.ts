import { Resend } from "resend";

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY || "");
  }
  return _resend;
}

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

interface ReminderEmailParams {
  to: string;
  userName: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  minutesBefore: number;
}

export async function sendReminderEmail({
  to,
  userName,
  eventTitle,
  eventDate,
  eventTime,
  minutesBefore,
}: ReminderEmailParams) {
  const timeLabel =
    minutesBefore >= 60
      ? `${Math.floor(minutesBefore / 60)}時間前`
      : `${minutesBefore}分前`;

  const { error } = await getResend().emails.send({
    from: `スケジュール管理 <${FROM_EMAIL}>`,
    to,
    subject: `【リマインダー】${eventTitle}（${timeLabel}）`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #4f46e5; margin-bottom: 8px;">📅 スケジュールリマインダー</h2>
        <p>${userName}さん、まもなく予定があります。</p>
        <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0 0 8px 0; font-weight: bold; font-size: 18px;">${eventTitle}</p>
          <p style="margin: 0; color: #6b7280;">${eventDate} ${eventTime}</p>
        </div>
        <p style="color: #9ca3af; font-size: 12px;">このメールはスケジュール管理アプリから自動送信されています。</p>
      </div>
    `,
  });

  if (error) {
    console.error("Failed to send reminder email:", error);
    throw error;
  }
}
