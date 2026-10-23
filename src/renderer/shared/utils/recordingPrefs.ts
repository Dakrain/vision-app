/**
 * Recording preferences from the meeting settings ("Ghi âm"): where the host's
 * recordings are saved, and which meetings start recording on their own.
 * Kept per device in localStorage.
 */
const FOLDER_KEY = 'recording.folder';
const AUTO_KEY = 'recording.autoStartMeetings';

const read = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch (_) {
    return null;
  }
};

const write = (key: string, value: string | null) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch (_) {
    // Storage unavailable: the preference just isn't kept.
  }
};

/** Chosen folder, or undefined to ask where to save each time. */
export const getRecordingFolder = () => read(FOLDER_KEY) || undefined;

export const setRecordingFolder = (folder: string | null) =>
  write(FOLDER_KEY, folder);

const autoStartIds = (): number[] => {
  try {
    const ids = JSON.parse(read(AUTO_KEY) || '[]');
    return Array.isArray(ids) ? ids : [];
  } catch (_) {
    return [];
  }
};

/** Record this meeting as soon as the host is in it. */
export const markAutoRecord = (meetingId: number) =>
  write(AUTO_KEY, JSON.stringify([...autoStartIds(), meetingId].slice(-50)));

/** True once per meeting: the mark is consumed. */
export const takeAutoRecord = (meetingId: number) => {
  const ids = autoStartIds();
  if (!ids.includes(meetingId)) return false;
  write(AUTO_KEY, JSON.stringify(ids.filter((id) => id !== meetingId)));
  return true;
};

export const formatFreeSpace = (bytes: number) =>
  `${(bytes / 1024 ** 3).toFixed(2)} GB còn lại`;
