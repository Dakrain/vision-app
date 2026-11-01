import MeetingService from '@/shared/services/Meeting/MeetingService';
import { MeetingRole, MeetingUser } from '@/renderer/shared/types/meeting';
import { User } from '@/renderer/shared/types/user';
import { Alert, Avatar, Button, Input, List, Modal, Select } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Already in the meeting — shown as added instead of offering "Thêm". */
  members: MeetingUser[];
  canAddCohost: boolean;
  onAdd: (userId: number, role: number) => Promise<void>;
}

/** Search a user by email and add them to the running meeting. */
export function AddMemberDialog({
  open,
  onClose,
  members,
  canAddCohost,
  onAdd,
}: Props) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [role, setRole] = useState<number>(MeetingRole.MEMBER);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number>();
  const [addedIds, setAddedIds] = useState<number[]>([]);

  const search = async () => {
    setError('');
    if (!email.trim()) return;
    try {
      const res = await MeetingService.findUsers(email.trim());
      setResults(res.rows ?? []);
      setSearched(true);
    } catch (_) {
      setError(t('meeting.add_member.search_failed'));
    }
  };

  const add = async (user: User) => {
    if (!user.id) return;
    setError('');
    setBusyId(user.id);
    try {
      await onAdd(user.id, role);
      setAddedIds((prev) => [...prev, user.id as number]);
    } catch (_) {
      setError(t('meeting.add_member.add_failed'));
    } finally {
      setBusyId(undefined);
    }
  };

  const isMember = (id?: number) =>
    addedIds.includes(id ?? -1) || members.some((m) => m.userId === id);

  return (
    <Modal
      open={open}
      onCancel={() => {
        setEmail('');
        setResults([]);
        setSearched(false);
        setAddedIds([]);
        onClose();
      }}
      title={t('meeting.add_member.title')}
      footer={null}
      centered
    >
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <Input.Search
          placeholder={t('meeting.add_member.email_placeholder')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onSearch={search}
          enterButton={t('meeting.add_member.find')}
        />
        {canAddCohost && (
          <Select
            value={role}
            onChange={setRole}
            style={{ width: 140 }}
            options={[
              {
                value: MeetingRole.MEMBER,
                label: t('meeting.add_member.role_member'),
              },
              {
                value: MeetingRole.CO_HOST,
                label: t('meeting.add_member.role_co_host'),
              },
            ]}
          />
        )}
      </div>
      {error && (
        <Alert
          type="error"
          showIcon
          message={error}
          style={{ marginBottom: 12 }}
        />
      )}
      <List
        locale={{
          emptyText: searched ? t('meeting.add_member.no_results') : ' ',
        }}
        dataSource={results}
        renderItem={(user) => (
          <List.Item
            actions={[
              isMember(user.id) ? (
                <span key="added">{t('meeting.add_member.already_in')}</span>
              ) : (
                <Button
                  key="add"
                  type="link"
                  loading={busyId === user.id}
                  onClick={() => add(user)}
                >
                  {t('meeting.add_member.add')}
                </Button>
              ),
            ]}
          >
            <List.Item.Meta
              avatar={
                <Avatar src={user.avatarUrl}>{user.fullName?.[0]}</Avatar>
              }
              title={user.fullName}
              description={user.email}
            />
          </List.Item>
        )}
      />
      <p style={{ marginTop: 12, color: '#8C8C8C', fontSize: 12 }}>
        {t('meeting.add_member.note')}
      </p>
    </Modal>
  );
}
