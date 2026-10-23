import { Avatar } from '@/shared/components';
import {
  type Conversation,
  conversationTitle,
  peerBackendId,
  profileOf,
} from '@/shared/services/Firebase/chat';

interface Props {
  conversation: Conversation;
  me: number;
  /** Outer size in px (48 in the list, 40 in the header). */
  size: number;
}

/** A person's photo, or for a group up to three members' photos stacked. */
export function ChatAvatar({ conversation, me, size }: Props) {
  if (conversation.type === 'group') {
    if (conversation.groupAvatar) {
      return (
        <Avatar
          url={conversation.groupAvatar}
          radius={size / 2}
          name={conversation.groupName ?? 'Nhóm'}
        />
      );
    }
    const others = conversation.memberBackendIds
      .filter((id) => id !== me)
      .slice(0, 3);
    const small = Math.round(size * 0.58);
    return (
      <span className="chat-avatar-group" style={{ width: size, height: size }}>
        {others.map((id, i) => {
          const p = profileOf(conversation, id);
          return (
            <span key={id} className={`chat-avatar-group-item i${i}`}>
              <Avatar
                url={p.avatarUrl ?? ''}
                radius={small / 2}
                name={p.displayName ?? '?'}
              />
            </span>
          );
        })}
      </span>
    );
  }
  const p = profileOf(conversation, peerBackendId(conversation, me));
  return (
    <Avatar
      url={p.avatarUrl ?? ''}
      radius={size / 2}
      name={conversationTitle(conversation, me)}
    />
  );
}
