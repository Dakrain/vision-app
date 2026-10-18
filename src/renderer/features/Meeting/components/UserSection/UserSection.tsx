import { Typography } from 'antd';
import { MeetingUser as MeetingUserType } from '@/renderer/shared/types/meeting';
import { MeetingUser, MemberAction } from '../MeetingUser/MeetingUser';
import './UserSection.scss';

export function UserSection({
  title,
  users,
  onAction,
  actionsFor,
}: {
  title: string;
  users: MeetingUserType[];
  onAction: (user: MeetingUserType, action: MemberAction) => void;
  actionsFor: (user: MeetingUserType) => MemberAction[];
}) {
  return (
    <div>
      <Typography.Text className="user-section-header">{title}</Typography.Text>
      {users.map((user) => (
        <MeetingUser
          key={user.agUid}
          user={user}
          actions={actionsFor(user)}
          onAction={onAction}
        />
      ))}
    </div>
  );
}
