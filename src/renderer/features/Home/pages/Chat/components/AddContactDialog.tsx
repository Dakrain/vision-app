import FriendService from '@/shared/services/Friend/FriendService';
import MeetingService from '@/shared/services/Meeting/MeetingService';
import { Input, Modal, notification } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EMAIL_REGEX } from '@/renderer/features/Auth/pages/Register/validation';

type Props = {
  open: boolean;
  onClose: () => void;
};

/**
 * "Thêm liên hệ": sends a friend request to an account by its email, as on
 * mobile ("Kết bạn → Bằng email"). They show up in Danh bạ once they accept.
 */
export function AddContactDialog({ open, onClose }: Props) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  const [sending, setSending] = useState(false);

  const close = () => {
    setEmail('');
    setError(undefined);
    onClose();
  };

  const send = async () => {
    const wanted = email.trim().toLowerCase();
    if (!wanted) {
      setError(t('contacts.add_friend.email_required'));
      return;
    }
    if (!EMAIL_REGEX.test(wanted)) {
      setError(t('contacts.add_friend.email_invalid'));
      return;
    }
    setSending(true);
    try {
      const res = await MeetingService.searchUsers(wanted);
      const user = (res.rows ?? []).find(
        (u) => u.email?.toLowerCase() === wanted,
      );
      if (!user?.id) {
        setError(t('contacts.add_friend.email_not_found'));
        return;
      }
      await FriendService.sendRequest(user.id);
      notification.success({
        message: t('contacts.add_friend.request_sent'),
        description: t('contacts.add_friend.request_sent_desc', {
          name: user.fullName ?? wanted,
        }),
        placement: 'top',
      });
      close();
    } catch (_) {
      setError(t('contacts.add_friend.request_failed'));
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      open={open}
      title={t('contacts.add_friend.add')}
      okText={t('contacts.add_friend.send_request')}
      cancelText={t('common.cancel')}
      confirmLoading={sending}
      onOk={send}
      onCancel={close}
      centered
      destroyOnClose
    >
      <Input
        autoFocus
        type="email"
        placeholder={t('contacts.add_friend.email_placeholder')}
        value={email}
        status={error ? 'error' : undefined}
        onChange={(e) => {
          setEmail(e.target.value);
          setError(undefined);
        }}
        onPressEnter={send}
      />
      {error && <div className="chat-add-contact-error">{error}</div>}
    </Modal>
  );
}
