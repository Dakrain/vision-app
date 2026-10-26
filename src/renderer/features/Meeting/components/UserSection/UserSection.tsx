import { MeetingUser as MeetingUserType } from '@/renderer/shared/types/meeting';
import { MeetingUser, MemberAction } from '../MeetingUser/MeetingUser';
import './UserSection.scss';

export function UserSection({
  title,
  users,
  onAction,
  actionsFor,
  myUid,
  speakingUid,
  selfSpeaking = false,
  away = false,
}: {
  title: string;
  users: MeetingUserType[];
  onAction: (user: MeetingUserType, action: MemberAction) => void;
  actionsFor: (user: MeetingUserType) => MemberAction[];
  myUid?: number;
  speakingUid?: number;
  /** I am talking (my own level is reported apart from the others). */
  selfSpeaking?: boolean;
  /** Members added to the room who are not in it right now. */
  away?: boolean;
}) {
  return (
    <section className="user-section">
      <h4 className="user-section-header">{title}</h4>
      <div>
        {users.map((user) => (
          <MeetingUser
            key={user.agUid ?? user.userId}
            user={user}
            isMe={user.agUid === myUid}
            speaking={
              user.agUid === myUid ? selfSpeaking : user.agUid === speakingUid
            }
            away={away}
            actions={away ? [] : actionsFor(user)}
            onAction={onAction}
          />
        ))}
      </div>
    </section>
  );
}
