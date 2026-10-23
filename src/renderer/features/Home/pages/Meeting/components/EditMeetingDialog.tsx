import { Button } from '@/shared/components/Button';
import type { MeetingListItem } from '@/shared/types/meeting';
import { Input, Modal, Typography } from 'antd';
import { useEffect, useState } from 'react';

interface Props {
  meeting?: MeetingListItem;
  onClose: () => void;
  onSave: (title: string, description: string) => Promise<void>;
}

/** Host: rename a meeting (the API only lets title/description change). */
export function EditMeetingDialog({ meeting, onClose, onSave }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (meeting) {
      setTitle(meeting.title ?? '');
      setDescription(meeting.description ?? '');
    }
  }, [meeting]);

  return (
    <Modal
      open={!!meeting}
      onCancel={onClose}
      title="Chỉnh sửa cuộc họp"
      centered
      destroyOnClose
      footer={[
        <Button
          key="save"
          variant="primary"
          title="Lưu"
          disabled={!title.trim()}
          onClick={() => onSave(title.trim(), description.trim())}
        />,
      ]}
      width={480}
    >
      <div className="meetings-edit-form">
        <Typography.Text>Chủ đề cuộc họp</Typography.Text>
        <Input
          value={title}
          maxLength={255}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Typography.Text>Mô tả</Typography.Text>
        <Input.TextArea
          value={description}
          autoSize={{ minRows: 3 }}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
    </Modal>
  );
}
