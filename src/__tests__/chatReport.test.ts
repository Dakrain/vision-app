import {
  REPORT_REASONS,
  reportMail,
} from '../renderer/features/Home/pages/Chat/report';

describe('reportMail', () => {
  const mail = reportMail({
    reason: 'harassment',
    conversation: 'conv-1',
    messageId: 'msg-9',
    sender: 'Spammer (42)',
    text: 'mua hàng giá rẻ',
  });
  const url = new URL(mail.url);

  it('goes to support, the reason in the subject', () => {
    expect(url.protocol).toBe('mailto:');
    expect(url.pathname).toBe('support@vision20.com');
    expect(url.searchParams.get('subject')).toBe(
      '[Vision 20] Report: harassment',
    );
  });

  it('says what, where and who', () => {
    const body = url.searchParams.get('body');
    expect(body).toContain('Conversation: conv-1');
    expect(body).toContain('Message: msg-9');
    expect(body).toContain('Sender: Spammer (42)');
    expect(body).toContain('Content: mua hàng giá rẻ');
  });

  it('the same report as text, for when no mail app opens', () => {
    expect(mail.text).toContain('To: support@vision20.com');
    expect(mail.text).toContain('Subject: [Vision 20] Report: harassment');
    expect(mail.text).toContain('Sender: Spammer (42)');
  });

  it('no content line for a message without text', () => {
    const { url: u } = reportMail({
      reason: 'spam',
      conversation: 'c',
      messageId: 'm',
      sender: 's',
    });
    expect(new URL(u).searchParams.get('body')).not.toContain('Content:');
  });

  it('the same reasons as the phone app', () => {
    expect(REPORT_REASONS).toEqual([
      'spam',
      'harassment',
      'inappropriate',
      'other',
    ]);
  });
});
