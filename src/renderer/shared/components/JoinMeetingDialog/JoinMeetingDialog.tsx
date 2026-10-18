import { useJoinMeeting } from '@/shared/hooks/useJoinMeeting';
import { selectAuth } from '@/shared/store/auth';
import { Input, Modal, Typography } from 'antd';
import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Button } from '../Button';
import './JoinMeetingDialog.scss';

interface Props {
  onClose: () => void;
  open: boolean;
}

export function JoinMeetingDialog({ onClose, open }: Props) {
  const user = useSelector(selectAuth);
  const [meetingId, setMeetingId] = useState('');
  const [passcode, setPasscode] = useState('');
  const [name] = useState(user.user?.fullName || '');
  const joinMeeting = useJoinMeeting();

  const handleJoinMeeting = async () => {
    if (!meetingId || !passcode) {
      // eslint-disable-next-line no-new
      new Notification('Lỗi', {
        body: 'Vui lòng nhập mã cuộc họp và passcode',
      });
      return;
    }

    if (await joinMeeting(meetingId, passcode)) {
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      centered
      title="Tham gia cuộc họp"
      destroyOnClose
      afterClose={() => {
        setMeetingId('');
        setPasscode('');
      }}
      footer={[
        <Button
          key="join"
          variant="primary"
          title="Tham gia cuộc họp"
          onClick={handleJoinMeeting}
        />,
      ]}
      width={400}
    >
      <div className="body top">
        <Typography.Text className="label">Mã cuộc họp</Typography.Text>
        <Input
          className="input-field"
          placeholder="Nhập mã cuộc họp"
          value={meetingId}
          onChange={(e) => setMeetingId(e.target.value)}
        />
        <Typography.Text className="label">Passcode</Typography.Text>
        <Input
          className="input-field"
          placeholder="Passcode"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
        />
      </div>
      <div className="body bottom">
        <Typography.Text className="label">
          Tên của bạn trong cuộc họp
        </Typography.Text>
        <Input
          className="input-field"
          placeholder="Tên của bạn"
          disabled
          value={name}
        />
      </div>
    </Modal>
  );
}
