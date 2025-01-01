import {
  Modal,
  Tabs,
  Input,
  DatePicker,
  TimePicker,
  InputNumber,
  Switch,
  Typography,
} from 'antd';
import type { TabsProps } from 'antd';
import './CreateMeetingDialog.scss';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../Button';
import { useAuth } from '../../hooks/useAuth';
import { MeetingService } from '../../services/Meeting';
import useLoading from '../../hooks/useLoading';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CreateMeetingDialog({ open, onClose }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [enableMic, setEnableMic] = useState(true);
  const [enableCamera, setEnableCamera] = useState(true);
  const [enableRecord, setEnableRecord] = useState(true);
  const [allowRejoin, setAllowRejoin] = useState(true);
  const [allowShare, setAllowShare] = useState(true);
  const [allowLivestream, setAllowLivestream] = useState(false);
  const [livestreamFacebookKey, setLivestreamFacebookKey] = useState('');
  const [livestreamYoutubeKey, setLivestreamYoutubeKey] = useState('');
  const [title, setTitle] = useState('');
  const [password, setPassword] = useState('');
  const [limitUser, setLimitUser] = useState(10);
  const { withLoading } = useLoading();

  const handleSubmit = async () => {
    if (allowLivestream) {
      if (!livestreamFacebookKey || !livestreamYoutubeKey) {
        // eslint-disable-next-line no-new
        new Notification('Lỗi', {
          body: 'Vui lòng nhập key Facebook hoặc Youtube',
        });
        return;
      }
    }

    try {
      const result = await withLoading(
        MeetingService.createMeeting({
          title,
          password: livestreamFacebookKey,
          limitUser,
          description: '',
          waitingRoom: 0,
          muteAllVideo: enableCamera ? 0 : 1,
          muteAllAudio: enableMic ? 0 : 1,
          muteAllChat: 0,
          isRecording: enableRecord ? 0 : 1,
          multipleShareScreen: allowShare ? 0 : 1,
          invite: [],
        }),
      );

      if (result) {
        navigate(`/meeting`, {
          state: {
            meetingId: result.room?.id,
          },
        });
      } else {
        // eslint-disable-next-line no-new
        new Notification('Lỗi', {
          body: 'Không thể tạo cuộc họp',
        });
      }
    } catch (error) {
      // eslint-disable-next-line no-new
      new Notification('Lỗi', {
        body: 'Không thể tạo cuộc họp',
      });
    }
  };

  const items: TabsProps['items'] = [
    {
      key: 'info',
      label: 'Thông tin cuộc họp',
      children: (
        <div className="tab-content">
          <div className="form-group">
            <Typography.Text className="form-label">
              Chủ đề cuộc họp
            </Typography.Text>
            <Input
              placeholder="Nhập chủ đề cuộc họp"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="form-group">
            <Typography.Text className="form-label">
              Mật khẩu cuộc họp
            </Typography.Text>
            <Input
              placeholder="Bỏ trống nếu muốn hệ thống tự động tạo mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="form-group">
            <Typography.Text className="form-label">
              Thời gian bắt đầu
            </Typography.Text>
            <div className="datetime-picker">
              <DatePicker style={{ width: '50%' }} placeholder="Bây giờ" />
              <TimePicker
                style={{ width: '50%' }}
                placeholder="Bây giờ"
                format="HH:mm"
              />
            </div>
          </div>

          <div className="form-group">
            <Typography.Text className="form-label">Múi giờ</Typography.Text>
            <Input
              placeholder="Nhập múi giờ"
              value="(GMT+07:00) Giờ Đông Dương - TP Hồ Chí Minh"
              disabled
            />
          </div>

          <div className="form-group">
            <Typography.Text className="form-label">
              Chủ trì cuộc họp
            </Typography.Text>
            <Input value={user?.fullName} disabled />
          </div>

          <div className="form-group">
            <Typography.Text className="form-label">
              Mời thành viên tham gia cuộc họp của bạn
            </Typography.Text>
            <Input.TextArea
              placeholder="Điền email của thành viên mà bạn muốn thêm vào phòng họp"
              autoSize={{ minRows: 2 }}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'settings',
      label: 'Cài đặt cuộc họp',
      children: (
        <div className="tab-content">
          <div className="form-group">
            <Typography.Text className="form-label">
              Số lượng người tối đa
            </Typography.Text>
            <InputNumber
              defaultValue={10}
              style={{ width: '100%' }}
              min={1}
              value={limitUser}
              onChange={(value) => setLimitUser(value ?? 10)}
            />
          </div>

          <div className="settings-list">
            <div className="setting-item">
              <span>Được phép mở Micro</span>
              <Switch
                checked={enableMic}
                onChange={setEnableMic}
                defaultChecked
              />
            </div>

            <div className="setting-item">
              <span>Được phép mở Webcam</span>
              <Switch
                checked={enableCamera}
                onChange={setEnableCamera}
                defaultChecked
              />
            </div>

            <div className="setting-item">
              <span>Được phép Ghi âm</span>
              <Switch
                checked={enableRecord}
                onChange={setEnableRecord}
                defaultChecked
              />
            </div>

            <div className="setting-item">
              <span>Cho phép người bị đuổi tham gia lại</span>
              <Switch
                checked={allowRejoin}
                onChange={setAllowRejoin}
                defaultChecked
              />
            </div>

            <div className="settings-group">
              <div>
                <Typography.Title level={5}>Chia sẻ màn hình</Typography.Title>
                <div className="setting-item-2">
                  <span>Cho phép mọi người chia sẻ màn hình</span>
                  <Switch
                    checked={allowShare}
                    onChange={setAllowShare}
                    defaultChecked
                  />
                </div>
              </div>
            </div>

            <div className="settings-group">
              <div>
                <Typography.Title level={5}>
                  Livestream cuộc họp
                </Typography.Title>
                <Typography.Paragraph className="description">
                  Livestream cuộc họp cho phép Host phát trực tiếp cuộc họp trên
                  Facebook và Youtube thông qua tài khoản của Host. Đối với
                  Facebook, Host có thể phát trực tiếp trên dòng thời gian
                  Facebook của mình hoặc một nhóm hoặc trang mà Host là quản trị
                  viên. Đối với Youtube, Host phát trực tiếp lên Kênh Youtube
                  của họ.
                </Typography.Paragraph>
              </div>

              <div className="setting-item-2">
                <span>Cho phép Livestream cuộc họp</span>
                <Switch
                  checked={allowLivestream}
                  onChange={setAllowLivestream}
                />
              </div>
              <div
                className={`livestream-keys ${allowLivestream ? 'open' : ''}`}
              >
                <div className="setting-item-2">
                  <Input
                    placeholder="Nhập key Facebook"
                    value={livestreamFacebookKey}
                    onChange={(e) => setLivestreamFacebookKey(e.target.value)}
                  />
                </div>
                <div className="setting-item-2">
                  <Input
                    placeholder="Nhập key Youtube"
                    value={livestreamYoutubeKey}
                    onChange={(e) => setLivestreamYoutubeKey(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title="Cài đặt cuộc họp"
      footer={[
        <Button
          key="submit"
          variant="primary"
          style={{ width: '40%' }}
          onClick={handleSubmit}
          title="Tiếp tục"
        />,
      ]}
      width={600}
      destroyOnClose
    >
      <Tabs
        defaultActiveKey="info"
        items={items}
        centered
        className="meeting-tabs"
      />
    </Modal>
  );
}
