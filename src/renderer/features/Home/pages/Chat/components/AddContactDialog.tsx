import FriendService from '@/shared/services/Friend/FriendService';
import MeetingService from '@/shared/services/Meeting/MeetingService';
import { Input, Modal, notification } from 'antd';
import { useState } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
};

/**
 * "Thêm liên hệ": sends a friend request to an account by its email, as on
 * mobile ("Kết bạn → Bằng email"). They show up in Danh bạ once they accept.
 */
export function AddContactDialog({ open, onClose }: Props) {
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
      setError('Vui lòng nhập email');
      return;
    }
    setSending(true);
    try {
      const res = await MeetingService.searchUsers(wanted);
      const user = (res.rows ?? []).find(
        (u) => u.email?.toLowerCase() === wanted,
      );
      if (!user?.id) {
        setError('Không tìm thấy tài khoản với email này');
        return;
      }
      await FriendService.sendRequest(user.id);
      notification.success({
        message: 'Đã gửi lời mời kết bạn',
        description: `${user.fullName ?? wanted} sẽ có trong Danh bạ khi chấp nhận lời mời.`,
        placement: 'top',
      });
      close();
    } catch (_) {
      setError('Không gửi được lời mời. Có thể hai bạn đã là bạn bè.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Thêm liên hệ"
      okText="Gửi lời mời"
      cancelText="Huỷ"
      confirmLoading={sending}
      onOk={send}
      onCancel={close}
      centered
      destroyOnClose
    >
      <Input
        autoFocus
        type="email"
        placeholder="Email của người bạn muốn thêm"
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
