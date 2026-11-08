/** Where reports go (same as the phone app). */
export const SUPPORT_EMAIL = 'support@vision20.com';

/** Why a message is reported (Apple 1.2: user-generated content). */
export const REPORT_REASONS = [
  'spam',
  'harassment',
  'inappropriate',
  'other',
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

interface Report {
  reason: ReportReason;
  conversation: string;
  messageId: string;
  sender: string;
  text?: string;
}

/**
 * A report as an email to support (the API has no report for non-friends):
 * a mailto URL, and the same as plain text for when no mail app opens.
 */
export function reportMail(report: Report): { url: string; text: string } {
  const subject = `[Vision 20] Report: ${report.reason}`;
  const body = [
    `Conversation: ${report.conversation}`,
    `Message: ${report.messageId}`,
    `Sender: ${report.sender}`,
    `Reason: ${report.reason}`,
    ...(report.text ? [`Content: ${report.text}`] : []),
  ].join('\n');
  // encodeURIComponent, not URLSearchParams: mail apps show '+' literally.
  const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(body)}`;
  const text = [`To: ${SUPPORT_EMAIL}`, `Subject: ${subject}`, '', body].join(
    '\n',
  );
  return { url, text };
}
