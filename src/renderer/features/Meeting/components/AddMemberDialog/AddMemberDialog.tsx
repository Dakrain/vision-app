import MeetingService from '@/shared/services/Meeting/MeetingService';
import { MeetingRole, MeetingUser } from '@/renderer/shared/types/meeting';
import { User } from '@/renderer/shared/types/user';
import { Alert, Avatar, Button, Input, List, Modal, Select } from 'antd';
import { useState } from 'react';

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
      setError('Không tìm được người dùng, vui lòng thử lại.');
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
      setError('Không thêm được người này (phòng có thể đã đủ người).');
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
      title="Thêm người vào phòng"
      footer={null}
      centered
    >
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <Input.Search
          placeholder="Nhập email người cần thêm"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onSearch={search}
          enterButton="Tìm"
        />
        {canAddCohost && (
          <Select
            value={role}
            onChange={setRole}
            style={{ width: 140 }}
            options={[
              { value: MeetingRole.MEMBER, label: 'Thành viên' },
              { value: MeetingRole.CO_HOST, label: 'Co-host' },
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
          emptyText: searched ? 'Không tìm thấy người dùng nào' : ' ',
        }}
        dataSource={results}
        renderItem={(user) => (
          <List.Item
            actions={[
              isMember(user.id) ? (
                <span key="added">Đã trong phòng</span>
              ) : (
                <Button
                  key="add"
                  type="link"
                  loading={busyId === user.id}
                  onClick={() => add(user)}
                >
                  Thêm
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
        Người được thêm sẽ nhận thông báo và có thể vào phòng mà không cần mật
        khẩu.
      </p>
    </Modal>
  );
}
