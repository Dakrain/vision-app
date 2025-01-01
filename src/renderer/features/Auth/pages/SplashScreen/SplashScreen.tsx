import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import appLogo from 'assets/images/app_logo.png';
import { fetchUserInfo } from '@/shared/store/auth/action';
import { useAppDispatch } from '@/renderer/store';
import { useAuth } from '@/renderer/shared/hooks/useAuth';

export default function SplashScreen() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAuth();

  useEffect(() => {
    setTimeout(() => {
      const token = localStorage.getItem('token');
      const lastLoginUser = localStorage.getItem('last_login_user');
      if (token && lastLoginUser) {
        dispatch(fetchUserInfo(lastLoginUser));
        navigate('/home');
      } else {
        navigate('/login');
      }
    }, 3000);
  }, [dispatch, navigate]);

  useEffect(() => {
    if (user && Object.keys(user).length > 0) {
      navigate('/home');
    }
  }, [user, navigate]);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
      }}
    >
      <img
        src={appLogo}
        alt="Vision Logo"
        className="logo"
        style={{
          margin: 'auto',
          width: '20%',
        }}
      />
    </div>
  );
}
