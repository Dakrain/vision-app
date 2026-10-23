import Icon from '@/assets/svg/icons';
import { useJoinMeeting } from '@/shared/hooks/useJoinMeeting';
import { selectAuth } from '@/shared/store/auth';
import { Modal } from 'antd';
import { useState } from 'react';
import { useSelector } from 'react-redux';
import './JoinMeetingDialog.scss';

interface Props {
  onClose: () => void;
  open: boolean;
}

/** Join by meeting ID + passcode (Figma "Join a meeting by Meeting ID"). */
export function JoinMeetingDialog({ onClose, open }: Props) {
  const user = useSelector(selectAuth);
  const [meetingId, setMeetingId] = useState('');
  const [passcode, setPasscode] = useState('');
  const joinMeeting = useJoinMeeting();

  const canJoin = !!meetingId.trim() && !!passcode.trim();

  const handleJoinMeeting = async () => {
    if (!canJoin) return;
    if (await joinMeeting(meetingId.trim(), passcode.trim())) {
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      centered
      destroyOnClose
      afterClose={() => {
        setMeetingId('');
        setPasscode('');
      }}
      title={null}
      footer={null}
      closable={false}
      width={446}
      className="join-meeting"
    >
      <form
        className="join-meeting-form"
        onSubmit={(e) => {
          e.preventDefault();
          handleJoinMeeting();
        }}
      >
        <div className="join-meeting-header">
          <h2>Tham gia cuộc họp</h2>
          <button
            type="button"
            className="join-meeting-close"
            aria-label="Đóng"
            onClick={onClose}
          >
            <Icon name="meetingClose" />
          </button>
        </div>
        <div className="join-meeting-cards">
          <div className="join-meeting-card top">
            <label className="join-meeting-field" htmlFor="join-meeting-id">
              <span>Meeting ID</span>
              <input
                id="join-meeting-id"
                placeholder="Meeting ID"
                value={meetingId}
                onChange={(e) => setMeetingId(e.target.value)}
              />
            </label>
            <label
              className="join-meeting-field"
              htmlFor="join-meeting-passcode"
            >
              <span>Passcode</span>
              <input
                id="join-meeting-passcode"
                placeholder="Passcode"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
              />
            </label>
          </div>
          <div className="join-meeting-card bottom">
            <label className="join-meeting-field" htmlFor="join-meeting-name">
              <span className="regular">Your name in the meeting</span>
              <input
                id="join-meeting-name"
                value={user.user?.fullName || ''}
                disabled
              />
            </label>
          </div>
        </div>
        <button
          type="submit"
          className="join-meeting-submit"
          disabled={!canJoin}
        >
          Tham gia
        </button>
      </form>
    </Modal>
  );
}
