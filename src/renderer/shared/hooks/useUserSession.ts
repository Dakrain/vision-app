import i18n from '@/renderer/i18n';
import { useAppDispatch, useAppSelector } from '@/renderer/store/hooks';
import { notification } from 'antd';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchUserInfo } from '../store/auth/action';
import { selectAuth } from '../store/auth/selector';
import { retryDelayMs } from '../utils/backoff';

/**
 * Keeps the launch-time user load going: the splash fires it once and moves
 * on, so a failure (offline, server down) left the app without a user —
 * chat stuck on "Đang kết nối…" — and desktop has no reload. Retries with
 * backoff and when the network returns; a refused token goes to login.
 */
export function useUserSession() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, userFailures, sessionExpired } = useAppSelector(selectAuth);

  useEffect(() => {
    if (!sessionExpired) return;
    notification.warning({
      message: i18n.t('auth.session_expired'),
      placement: 'top',
    });
    navigate('/login', { replace: true });
  }, [sessionExpired, navigate]);

  useEffect(() => {
    const userId = localStorage.getItem('last_login_user');
    if (user || userFailures === 0 || sessionExpired || !userId) {
      return undefined;
    }
    const again = () => dispatch(fetchUserInfo(userId));
    const timer = setTimeout(again, retryDelayMs(userFailures - 1));
    window.addEventListener('online', again);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('online', again);
    };
  }, [user, userFailures, sessionExpired, dispatch]);
}
