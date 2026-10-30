import AgoraEngineService from '@/renderer/shared/services/Agora/AgoraEngineService';
import { Modal, Select } from 'antd';
import { useEffect, useState } from 'react';
import { saveLobbyPrefs } from '../../../MeetingLobby/prefs';
import './DeviceSettingsDialog.scss';

type Device = { deviceId?: string; deviceName?: string };

const options = (list: Device[]) =>
  list.map((d) => ({ value: d.deviceId ?? '', label: d.deviceName }));

type Props = {
  open: boolean;
  onClose: () => void;
};

/**
 * Mic / camera / speaker during a meeting (only the lobby had them: a wrong
 * mic meant leaving and joining again). Changes apply at once and are kept
 * for the next lobby, like the lobby's own choice.
 */
export function DeviceSettingsDialog({ open, onClose }: Props) {
  const [cameras, setCameras] = useState<Device[]>([]);
  const [mics, setMics] = useState<Device[]>([]);
  const [speakers, setSpeakers] = useState<Device[]>([]);
  const [cameraId, setCameraId] = useState<string>();
  const [micId, setMicId] = useState<string>();
  const [speakerId, setSpeakerId] = useState<string>();

  // Read fresh on every opening: devices come and go (headsets, docks).
  useEffect(() => {
    if (!open) return;
    const video = AgoraEngineService.getVideoDeviceManager();
    const audio = AgoraEngineService.getAudioDeviceManager();
    setCameras(video.enumerateVideoDevices() ?? []);
    setMics(audio.enumerateRecordingDevices() ?? []);
    setSpeakers(audio.enumeratePlaybackDevices() ?? []);
    setCameraId(video.getDevice());
    setMicId(audio.getRecordingDevice());
    setSpeakerId(audio.getPlaybackDevice());
  }, [open]);

  const field = (
    label: string,
    value: string | undefined,
    list: Device[],
    empty: string,
    onChange: (id: string) => void,
  ) => (
    <div className="device-settings-field">
      <span>{label}</span>
      <Select
        value={value}
        options={options(list)}
        onChange={onChange}
        notFoundContent={empty}
      />
    </div>
  );

  return (
    <Modal
      open={open}
      title="Micrô, camera và loa"
      footer={null}
      onCancel={onClose}
      centered
      className="device-settings"
    >
      {field('Micrô', micId, mics, 'Không tìm thấy micrô', (id) => {
        AgoraEngineService.getAudioDeviceManager().setRecordingDevice(id);
        setMicId(id);
        saveLobbyPrefs({ micId: id });
      })}
      {field('Camera', cameraId, cameras, 'Không tìm thấy camera', (id) => {
        AgoraEngineService.getVideoDeviceManager().setDevice(id);
        setCameraId(id);
        saveLobbyPrefs({ cameraId: id });
      })}
      {field('Loa', speakerId, speakers, 'Không tìm thấy loa', (id) => {
        AgoraEngineService.getAudioDeviceManager().setPlaybackDevice(id);
        setSpeakerId(id);
        saveLobbyPrefs({ speakerId: id });
      })}
    </Modal>
  );
}
