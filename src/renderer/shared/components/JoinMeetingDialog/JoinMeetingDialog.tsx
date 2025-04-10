import useLoading from '@/shared/hooks/useLoading';
import { MeetingService } from '@/shared/services/Meeting';
import { selectAuth } from '@/shared/store/auth';
import { Input, Modal, Typography } from 'antd';
import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Button } from '../Button';
import './JoinMeetingDialog.scss';

interface Props {
  onClose: () => void;
  open: boolean;
}

export function JoinMeetingDialog({ onClose, open }: Props) {
  const user = useSelector(selectAuth);
  //ID: B71169, Password: F6670360
  const [meetingId, setMeetingId] = useState('B71169');
  const [passcode, setPasscode] = useState('F6670360');
  const [name] = useState(user.user?.fullName || '');
  const navigate = useNavigate();
  const { withLoading } = useLoading();

  const handleJoinMeeting = async () => {
    if (!meetingId || !passcode) {
      // eslint-disable-next-line no-new
      new Notification('Lỗi', {
        body: 'Vui lòng nhập mã cuộc họp và passcode',
      });
      return;
    }

    try {
      const joinResult = await withLoading(
        MeetingService.joinMeeting({
          visionMeetingKey: meetingId,
          visionMeetingPwd: passcode,
        }),
      );

      if (joinResult && joinResult.status === 2) {
        // Then navigate to join room
        if (joinResult.id) {
          const meetingResult = await withLoading(
            MeetingService.fetchMeetingDetail(joinResult.id),
          );

          if (meetingResult) {
            onClose();
            // Then navigate to join room
            navigate(`/meeting`, {
              state: {
                meetingId: meetingResult.room?.id,
              },
            });
          }
        }
      }
    } catch (_) {
      // eslint-disable-next-line no-new
      new Notification('Lỗi', {
        body: 'Có lỗi xảy ra khi tham gia cuộc họp',
      });
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
