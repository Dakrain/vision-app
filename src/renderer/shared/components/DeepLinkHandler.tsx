import { useAuth } from '@/shared/hooks/useAuth';
import { useJoinMeeting } from '@/shared/hooks/useJoinMeeting';
import { notification } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import i18n from '@/renderer/i18n';

const { ipcRenderer } = window.require('electron');

interface Invite {
  meetingKey: string;
  password: string;
}

/** vision20://meetinginvite?meeting_id=KEY&password=PWD → invite, else null. */
export const parseInviteLink = (url: string): Invite | null => {
  try {
    const parsed = new URL(url);
    const target = (
      parsed.host || parsed.pathname.replace(/^\/+/, '')
    ).toLowerCase();
    const meetingKey = parsed.searchParams.get('meeting_id') ?? '';
    const password = parsed.searchParams.get('password') ?? '';
    if (target !== 'meetinginvite' || !meetingKey || !password) return null;
    return { meetingKey, password };
  } catch (_) {
    return null;
  }
};

/**
 * Opens invite links handed over by the main process (see main.ts). Waits
 * for login when needed and never yanks the user out of a running meeting.
 */
export function DeepLinkHandler() {
  const { user } = useAuth();
  const location = useLocation();
  const joinMeeting = useJoinMeeting();
  const [invite, setInvite] = useState<Invite | null>(null);
  const busy = useRef(false);

  const take = useCallback(async () => {
    const url: string | null = await ipcRenderer
      .invoke('take-pending-deep-link')
      .catch(() => null);
    if (!url) return;
    const parsed = parseInviteLink(url);
    if (!parsed) {
      notification.error({
        message: i18n.t('shared.deep_link.invalid'),
        placement: 'top',
      });
      return;
    }
    setInvite(parsed);
  }, []);

  useEffect(() => {
    take();
    ipcRenderer.on('deep-link', take);
    return () => {
      ipcRenderer.removeListener('deep-link', take);
    };
  }, [take]);

  useEffect(() => {
    if (!invite || busy.current) return;
    if (!user || !localStorage.getItem('token')) return; // after login
    if (location.pathname === '/meeting') {
      notification.info({
        message: i18n.t('shared.deep_link.in_meeting_title'),
        description: i18n.t('shared.deep_link.in_meeting_message', {
          id: invite.meetingKey,
        }),
        placement: 'top',
      });
      setInvite(null);
      return;
    }
    busy.current = true;
    joinMeeting(invite.meetingKey, invite.password)
      .finally(() => {
        busy.current = false;
        setInvite(null);
      })
      .catch(() => {});
  }, [invite, user, location.pathname, joinMeeting]);

  return null;
}
