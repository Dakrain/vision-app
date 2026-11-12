import i18n from '@/renderer/i18n';
import { confirmDialog } from '@/renderer/shared/utils/confirmDialog';

/** The devices a meeting may ask to use. */
export type MediaKind = 'camera' | 'microphone';

export type MediaAccessStatus =
  | 'granted'
  | 'denied'
  | 'restricted'
  | 'not-determined'
  | 'unknown';

/** Read lazily: the preload bridge only exists once Electron is running. */
const ipc = () => window.require('electron').ipcRenderer;

/** The kinds wanted, in the order the dialog should talk about them. */
export const wantedKinds = (want: {
  camera?: boolean;
  microphone?: boolean;
}): MediaKind[] => [
  ...(want.camera ? (['camera'] as MediaKind[]) : []),
  ...(want.microphone ? (['microphone'] as MediaKind[]) : []),
];

/**
 * The kinds macOS is blocking. 'not-determined' is not one of them: that is
 * asked about first, and becomes granted or denied. Other platforms report
 * 'granted' and never land here.
 */
export const blockedKinds = (
  kinds: MediaKind[],
  statuses: Partial<Record<MediaKind, MediaAccessStatus>>,
): MediaKind[] =>
  kinds.filter((kind) => {
    const status = statuses[kind];
    return status === 'denied' || status === 'restricted';
  });

/**
 * Resolves true when the meeting may use [want]'s devices. A denied device
 * makes Agora publish nothing at all, so instead of joining mute/black the
 * user is told where to grant it. macOS asks for 'not-determined' here, so
 * the first join prompts before the room appears.
 */
export const ensureMediaAccess = async (want: {
  camera?: boolean;
  microphone?: boolean;
}): Promise<boolean> => {
  const kinds = wantedKinds(want);
  if (kinds.length === 0) return true;

  const statuses: Partial<Record<MediaKind, MediaAccessStatus>> = {};
  await Promise.all(
    kinds.map(async (kind) => {
      // A bridge failure must not keep the user out of a meeting.
      let status: MediaAccessStatus = await ipc()
        .invoke('media-access-status', kind)
        .catch(() => 'granted');
      if (status === 'not-determined') {
        const granted = await ipc()
          .invoke('ask-media-access', kind)
          .catch(() => false);
        status = granted ? 'granted' : 'denied';
      }
      statuses[kind] = status;
    }),
  );

  const blocked = blockedKinds(kinds, statuses);
  if (blocked.length === 0) return true;

  const camera = blocked.includes('camera');
  const microphone = blocked.includes('microphone');
  let message:
    | 'shared.media_access.camera_message'
    | 'shared.media_access.microphone_message'
    | 'shared.media_access.both_message' = 'shared.media_access.camera_message';
  if (camera && microphone) message = 'shared.media_access.both_message';
  else if (microphone) message = 'shared.media_access.microphone_message';

  confirmDialog({
    title: i18n.t('shared.media_access.title'),
    content: i18n.t(message),
    okText: i18n.t('shared.media_access.open_system_settings'),
    cancelText: i18n.t('common.later'),
    onOk: () =>
      ipc().invoke('open-media-settings', camera ? 'camera' : 'microphone'),
  });
  return false;
};
