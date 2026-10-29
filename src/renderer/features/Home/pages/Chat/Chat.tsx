import Icon from '@/assets/svg/icons';
import { Avatar } from '@/shared/components';
import { useSocial } from '@/shared/social/SocialProvider';
import {
  type Conversation,
  type Message,
  conversationTitle,
  createGroupConversation,
  ensureDirectConversation,
  peerBackendId,
  profileOf,
} from '@/shared/services/Firebase/chat';
import FriendService, {
  type Contact,
} from '@/shared/services/Friend/FriendService';
import { Dropdown, notification, Spin } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { listTimeLabel } from './chatFormat';
import { AddContactDialog } from './components/AddContactDialog';
import { ChatAvatar } from './components/ChatAvatar';
import { ForwardDialog } from './components/ForwardDialog';
import { NewChatPane } from './components/NewChatPane';
import { NewGroupPane } from './components/NewGroupPane';
import { Thread } from './components/Thread';
import { matches, useContacts } from './hooks';
import './Chat.scss';

type ListTab = 'chats' | 'contacts';

function ConversationRow({
  conversation: c,
  me,
  myUid,
  active,
  onOpen,
}: {
  conversation: Conversation;
  me: number;
  myUid: string;
  active: boolean;
  onOpen: () => void;
}) {
  const title = conversationTitle(c, me);
  const unread = c.unreadCounts[String(me)] ?? 0;
  let prefix = '';
  if (c.lastMessageBy === myUid) prefix = 'Bạn: ';
  else if (c.type === 'group' && c.lastMessageBy) {
    const name = c.memberProfiles[c.lastMessageBy]?.displayName;
    if (name) prefix = `${name}: `;
  }
  return (
    <button
      type="button"
      className={`chat-row-item ${active ? 'active' : ''} ${unread ? 'unread' : ''}`}
      onClick={onOpen}
    >
      <ChatAvatar conversation={c} me={me} size={48} />
      <span className="chat-row-item-text">
        <b>{title}</b>
        <span>{c.lastMessage ? `${prefix}${c.lastMessage}` : ' '}</span>
      </span>
      <span className="chat-row-item-meta">
        <small>{listTimeLabel(c.lastMessageAt)}</small>
        {unread > 0 && (
          <span className="chat-badge">{unread > 99 ? '99+' : unread}</span>
        )}
      </span>
    </button>
  );
}

function Chat() {
  const { me, conversations, activeConversationId, setActiveConversationId } =
    useSocial();
  const {
    contacts,
    requests,
    loading: contactsLoading,
    reload: reloadContacts,
  } = useContacts();
  const [addingContact, setAddingContact] = useState(false);
  const [answering, setAnswering] = useState<number>();
  const [tab, setTab] = useState<ListTab>('chats');
  const [query, setQuery] = useState('');
  // Composing a new conversation instead of showing one.
  const [draft, setDraft] = useState<'direct' | 'group'>();
  const drafting = draft !== undefined;
  const [forwarding, setForwarding] = useState<Message>();

  // Leaving the Chat page: nothing is "on screen" any more.
  useEffect(
    () => () => setActiveConversationId(undefined),
    [setActiveConversationId],
  );

  const active = useMemo(
    () => conversations.find((c) => c.id === activeConversationId),
    [conversations, activeConversationId],
  );

  // Contacts plus the people I already chat with (for forward / new chat).
  const people = useMemo<Contact[]>(() => {
    if (!me) return contacts;
    const byId = new Map(contacts.map((p) => [p.id, p]));
    conversations.forEach((c) => {
      if (c.type !== 'direct') return;
      const id = peerBackendId(c, me.backendId);
      if (!id || byId.has(id)) return;
      const p = profileOf(c, id);
      byId.set(id, { id, fullName: p.displayName, avatarUrl: p.avatarUrl });
    });
    return [...byId.values()].sort((a, b) =>
      (a.fullName ?? '').localeCompare(b.fullName ?? '', 'vi'),
    );
  }, [contacts, conversations, me]);

  const openWith = async (person: Contact) => {
    if (!me) return;
    try {
      const id = await ensureDirectConversation(me, {
        backendId: person.id,
        displayName: person.fullName,
        avatarUrl: person.avatarUrl,
      });
      setDraft(undefined);
      setTab('chats');
      setActiveConversationId(id);
    } catch (_) {
      notification.error({
        message: 'Không mở được cuộc trò chuyện',
        placement: 'top',
      });
    }
  };

  const createGroup = async (name: string, members: Contact[]) => {
    if (!me) return;
    try {
      const id = await createGroupConversation(
        me,
        name,
        members.map((p) => ({
          backendId: p.id,
          displayName: p.fullName,
          avatarUrl: p.avatarUrl,
        })),
      );
      setDraft(undefined);
      setActiveConversationId(id);
    } catch (_) {
      notification.error({
        message: 'Không tạo được nhóm chat',
        placement: 'top',
      });
    }
  };

  if (!me) {
    return <div className="chat-loading">Đang kết nối trò chuyện…</div>;
  }

  const shownConversations = conversations.filter(
    (c) =>
      !query.trim() ||
      matches(conversationTitle(c, me.backendId), query) ||
      matches(c.lastMessage, query),
  );
  const shownContacts = contacts.filter(
    (p) => matches(p.fullName, query) || matches(p.email, query),
  );

  // A friend request: accept (they join Danh bạ) or decline.
  const answer = async (p: Contact, accept: boolean) => {
    if (!p.friendId) return;
    setAnswering(p.friendId);
    try {
      if (accept) await FriendService.acceptRequest(p.friendId);
      else await FriendService.removeFriend(p.friendId);
      await reloadContacts();
    } catch (_) {
      notification.error({
        message: 'Không thực hiện được, vui lòng thử lại',
        placement: 'top',
      });
    } finally {
      setAnswering(undefined);
    }
  };

  const renderRequests = () =>
    !query.trim() &&
    requests.length > 0 && (
      <>
        <div className="chat-section-title">
          Lời mời kết bạn ({requests.length})
        </div>
        {requests.map((p) => (
          <div key={`request-${p.id}`} className="chat-row-item contact">
            <Avatar
              url={p.avatarUrl ?? ''}
              radius={24}
              name={p.fullName ?? '?'}
            />
            <span className="chat-row-item-text">
              <b>{p.fullName}</b>
              <span>{p.email}</span>
            </span>
            <span className="chat-request-actions">
              <button
                type="button"
                className="accept"
                disabled={answering === p.friendId}
                onClick={() => answer(p, true)}
              >
                Đồng ý
              </button>
              <button
                type="button"
                disabled={answering === p.friendId}
                onClick={() => answer(p, false)}
              >
                Từ chối
              </button>
            </span>
          </div>
        ))}
        <div className="chat-section-title">Danh bạ</div>
      </>
    );

  const renderList = () => {
    if (tab === 'contacts') {
      if (contactsLoading) {
        return (
          <div className="chat-empty">
            <Spin />
          </div>
        );
      }
      if (shownContacts.length === 0) {
        return (
          <>
            {renderRequests()}
            <div className="chat-empty">
              {query.trim()
                ? 'Không tìm thấy liên hệ nào'
                : 'Chưa có liên hệ nào'}
            </div>
          </>
        );
      }
      const rows = shownContacts.map((p) => (
        <button
          key={p.id}
          type="button"
          className="chat-row-item contact"
          onClick={() => openWith(p)}
        >
          <Avatar
            url={p.avatarUrl ?? ''}
            radius={24}
            name={p.fullName ?? '?'}
          />
          <span className="chat-row-item-text">
            <b>{p.fullName}</b>
            <span>{p.email}</span>
          </span>
        </button>
      ));
      return (
        <>
          {renderRequests()}
          {rows}
        </>
      );
    }
    return (
      <>
        {drafting && (
          <div className="chat-row-item draft active">
            <span className="chat-draft-avatar" />
            <span className="chat-row-item-text">
              <b>{draft === 'group' ? 'Nhóm chat mới' : 'Tin nhắn mới'}</b>
            </span>
            <button
              type="button"
              className="chat-draft-close"
              aria-label="Huỷ"
              onClick={() => setDraft(undefined)}
            >
              <Icon name="meetingClose" />
            </button>
          </div>
        )}
        {shownConversations.map((c) => (
          <ConversationRow
            key={c.id}
            conversation={c}
            me={me.backendId}
            myUid={me.uid}
            active={!drafting && c.id === activeConversationId}
            onOpen={() => {
              setDraft(undefined);
              setActiveConversationId(c.id);
            }}
          />
        ))}
        {shownConversations.length === 0 && !drafting && (
          <div className="chat-empty">
            {query.trim()
              ? 'Không tìm thấy cuộc trò chuyện nào'
              : 'Chưa có cuộc trò chuyện nào'}
          </div>
        )}
      </>
    );
  };

  const renderPane = () => {
    if (draft === 'group') {
      return (
        <NewGroupPane
          people={people}
          myId={me.backendId}
          onCreate={createGroup}
        />
      );
    }
    if (draft === 'direct') {
      return (
        <NewChatPane people={people} myId={me.backendId} onPick={openWith} />
      );
    }
    if (active) {
      return (
        <Thread
          key={active.id}
          conversation={active}
          onForward={setForwarding}
        />
      );
    }
    return (
      <div className="chat-placeholder">
        Chọn một cuộc trò chuyện để bắt đầu nhắn tin
      </div>
    );
  };

  return (
    <div className="chat-page">
      <div className="chat-list">
        <div className="chat-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'chats'}
            onClick={() => setTab('chats')}
          >
            Trò chuyện
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'contacts'}
            onClick={() => setTab('contacts')}
          >
            Danh bạ
          </button>
        </div>
        <div className="chat-toolbar">
          {tab === 'contacts' && (
            <button
              type="button"
              className="chat-add-contact"
              onClick={() => setAddingContact(true)}
            >
              Thêm liên hệ
            </button>
          )}
          {tab === 'chats' && (
            <div className="chat-toolbar-icons">
              <Dropdown
                trigger={['click']}
                placement="bottomRight"
                overlayClassName="chat-message-menu"
                menu={{
                  items: [
                    { key: 'direct', label: 'Cuộc trò chuyện cá nhân' },
                    { key: 'group', label: 'Cuộc trò chuyện nhóm' },
                  ],
                  onClick: ({ key }) => {
                    setDraft(key as 'direct' | 'group');
                    setActiveConversationId(undefined);
                  },
                }}
              >
                <button type="button" title="Tin nhắn mới">
                  <Icon name="chatNotePencil" />
                </button>
              </Dropdown>
            </div>
          )}
          <label className="chat-search" htmlFor="chat-search">
            <Icon name="chatSearch" />
            <input
              id="chat-search"
              placeholder="Tìm kiếm"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </div>
        <div className="chat-list-items">{renderList()}</div>
      </div>
      {renderPane()}
      <ForwardDialog
        message={forwarding}
        people={people}
        onClose={() => setForwarding(undefined)}
      />
      <AddContactDialog
        open={addingContact}
        onClose={() => setAddingContact(false)}
      />
    </div>
  );
}

export default Chat;
