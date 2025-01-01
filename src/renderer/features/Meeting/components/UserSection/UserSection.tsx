import { Typography } from 'antd';
import { MeetingUser as MeetingUserType } from '@/renderer/shared/types/meeting';
import { MeetingUser } from '../MeetingUser/MeetingUser';
import './UserSection.scss';

export function UserSection({
  title,
  users,
  onAction,
}: {
  title: string;
  users: MeetingUserType[];
  onAction: (user: MeetingUserType) => void;
}) {
  return (
    <div>
      <Typography.Text className="user-section-header">{title}</Typography.Text>
      {users.map((user) => (
        <MeetingUser key={user.agUid} user={user} onAction={onAction} />
      ))}
    </div>
  );
}
