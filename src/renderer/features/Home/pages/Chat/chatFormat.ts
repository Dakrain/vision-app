import i18n from '@/renderer/i18n';
import {
  type Message,
  localizedChatText,
} from '@/shared/services/Firebase/chat';

const LOCALES: Record<string, string> = {
  vi: 'vi-VN',
  en: 'en-US',
  zh: 'zh-CN',
};
const locale = () => LOCALES[i18n.language] ?? 'vi-VN';

const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

/** Conversation list: "14:12", "Thứ 2", "Chủ nhật" or "01/06/2021". */
export const listTimeLabel = (d?: Date, now = new Date()) => {
  if (!d) return '';
  if (sameDay(d, now)) {
    return d.toLocaleTimeString(locale(), {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  const days = (now.getTime() - d.getTime()) / 86_400_000;
  if (days < 7) {
    return i18n.t(`chat.time.${WEEKDAYS[d.getDay()]}`);
  }
  return d.toLocaleDateString(locale(), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

/** Inside a bubble: "11:52". */
export const bubbleTime = (d: Date) =>
  d.toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' });

/** Divider between days: "Ngày 30 tháng 3, 2021". */
export const dayDivider = (d: Date) =>
  i18n.t('chat.time.day_divider', {
    day: d.getDate(),
    month: d.getMonth() + 1,
    month_name: d.toLocaleDateString('en-US', { month: 'long' }),
    year: d.getFullYear(),
  });

export const messageDate = (m: Message) =>
  m.createdAt ?? new Date(m.clientTimetoken);

export const isSameDay = sameDay;

/** "4.45 KB", "1.2 MB". */
export const fileSize = (bytes?: number) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
};

/**
 * Short text for a quoted/forwarded message, as stored in Firestore
 * (Vietnamese for every client). On screen use [messageSummaryText].
 */
export const messageSummary = (m: Pick<Message, 'type' | 'text'>) => {
  switch (m.type) {
    case 'image':
      return '[Hình ảnh]';
    case 'file':
      return '[Tệp đính kèm]';
    case 'call':
      return '[Cuộc gọi]';
    default:
      return m.text ?? '';
  }
};

/** [messageSummary] in the app's language. */
export const messageSummaryText = (m: Pick<Message, 'type' | 'text'>) =>
  localizedChatText(messageSummary(m));

const URL_RE = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

/** Splits text into plain parts and links. */
export const linkify = (text: string) => {
  const parts: { text: string; href?: string }[] = [];
  let last = 0;
  text.replace(URL_RE, (match, _g, offset: number) => {
    if (offset > last) parts.push({ text: text.slice(last, offset) });
    parts.push({
      text: match,
      href: match.startsWith('http') ? match : `https://${match}`,
    });
    last = offset + match.length;
    return match;
  });
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
};
