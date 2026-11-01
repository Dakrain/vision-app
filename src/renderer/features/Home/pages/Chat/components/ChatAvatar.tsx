import type { ReactNode } from 'react';
import { Avatar } from '@/shared/components';
import i18n from '@/renderer/i18n';
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

/** One member: photo, or initial on grey. */
function Member({ url, name, d }: { url?: string; name?: string; d: number }) {
  const initial = (name ?? '').trim().split(/\s+/).pop()?.[0]?.toUpperCase();
  return (
    <span
      className="chat-avatar-member"
      style={{ width: d, height: d, fontSize: Math.round(d * 0.42) }}
    >
      {url ? <img src={url} alt="" /> : (initial ?? '?')}
    </span>
  );
}

/**
 * The Figma group layouts: two overlapping, three in a triangle, four in a
 * grid, five and more with a +N cell. (Up to three photos used to pile up,
 * members without one in red.)
 */
function GroupMembers({
  conversation,
  ids,
  size,
}: {
  conversation: Conversation;
  ids: number[];
  size: number;
}) {
  const n = ids.length;
  const member = (id: number, d: number) => {
    const p = profileOf(conversation, id);
    return <Member url={p.avatarUrl} name={p.displayName} d={d} />;
  };
  if (n <= 1) return member(ids[0] ?? 0, size);
  let cells: {
    left?: number;
    right?: number;
    top?: number;
    bottom?: number;
    node: ReactNode;
  }[];
  if (n === 2) {
    const d = Math.round(size * 0.68);
    cells = [
      { left: 0, top: 0, node: member(ids[0], d) },
      { right: 0, bottom: 0, node: member(ids[1], d) },
    ];
  } else if (n === 3) {
    const d = Math.round(size * 0.54);
    cells = [
      { left: (size - d) / 2, top: 0, node: member(ids[0], d) },
      { left: 0, bottom: 0, node: member(ids[1], d) },
      { right: 0, bottom: 0, node: member(ids[2], d) },
    ];
  } else {
    const d = Math.round(size * 0.5);
    cells = [
      { left: 0, top: 0, node: member(ids[0], d) },
      { right: 0, top: 0, node: member(ids[1], d) },
      { left: 0, bottom: 0, node: member(ids[2], d) },
      {
        right: 0,
        bottom: 0,
        node:
          n === 4 ? (
            member(ids[3], d)
          ) : (
            <span
              className="chat-avatar-member"
              style={{ width: d, height: d, fontSize: Math.round(d * 0.36) }}
            >
              +{n - 3}
            </span>
          ),
      },
    ];
  }
  return (
    <span className="chat-avatar-group" style={{ width: size, height: size }}>
      {cells.map(({ node, ...pos }, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <span key={i} className="chat-avatar-group-item" style={pos}>
          {node}
        </span>
      ))}
    </span>
  );
}

/**
 * A person's photo; for a group its photo, or its members as in the Figma
 * chat cards (Group 2/3/4/n).
 */
export function ChatAvatar({ conversation, me, size }: Props) {
  if (conversation.type === 'group') {
    if (conversation.groupAvatar) {
      return (
        <Avatar
          url={conversation.groupAvatar}
          radius={size / 2}
          name={conversation.groupName ?? i18n.t('chat.conversations.group')}
        />
      );
    }
    const others = conversation.memberBackendIds.filter((id) => id !== me);
    return (
      <GroupMembers conversation={conversation} ids={others} size={size} />
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
