// Last lobby choices, remembered per machine so the next meeting opens with
// the same devices and mic/camera state.
export interface LobbyPrefs {
  enableMic: boolean;
  enableCamera: boolean;
  cameraId?: string;
  micId?: string;
  speakerId?: string;
}

const KEY = 'meeting_lobby_prefs';

// Same default as mobile: mic on, camera off.
const DEFAULT_PREFS: LobbyPrefs = { enableMic: true, enableCamera: false };

export const loadLobbyPrefs = (): LobbyPrefs => {
  try {
    return {
      ...DEFAULT_PREFS,
      ...JSON.parse(localStorage.getItem(KEY) ?? '{}'),
    };
  } catch (_) {
    return DEFAULT_PREFS;
  }
};

export const saveLobbyPrefs = (patch: Partial<LobbyPrefs>) => {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({ ...loadLobbyPrefs(), ...patch }),
    );
  } catch (_) {
    // Preferences are a convenience; ignore storage failures.
  }
};
