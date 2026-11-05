import '../renderer/i18n';
import { configureStore } from '@reduxjs/toolkit';
import { act, render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AuthService from '../renderer/shared/services/Auth/AuthService';
import { useUserSession } from '../renderer/shared/hooks/useUserSession';
import { fetchUserInfo } from '../renderer/shared/store/auth/action';
import auth from '../renderer/shared/store/auth/slice';

jest.mock('../renderer/shared/services/Auth/AuthService', () => ({
  __esModule: true,
  default: { fetchUser: jest.fn() },
}));
const fetchUser = AuthService.fetchUser as jest.Mock;
const offline = () => Promise.reject(JSON.stringify({ message: 'Network' }));

function Probe() {
  useUserSession();
  return <div>home</div>;
}

const setup = () => {
  const store = configureStore({ reducer: { auth } });
  const view = render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/home']}>
        <Routes>
          <Route path="/home" element={<Probe />} />
          <Route path="/login" element={<div>login</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
  return { store, view };
};

describe('useUserSession', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    fetchUser.mockReset();
    localStorage.setItem('token', 'tok');
    localStorage.setItem('last_login_user', '7');
  });
  afterEach(() => jest.useRealTimers());

  it('offline at launch: retries until the user loads', async () => {
    fetchUser.mockImplementationOnce(offline);
    fetchUser.mockResolvedValue({ id: 7 });
    const { store } = setup();
    await act(async () => {
      await store.dispatch(fetchUserInfo('7'));
    });
    expect(store.getState().auth.user).toBeUndefined();
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });
    expect(fetchUser).toHaveBeenCalledTimes(2);
    expect(store.getState().auth.user?.id).toBe(7);
  });

  it('coming back online retries right away', async () => {
    fetchUser.mockImplementationOnce(offline);
    fetchUser.mockResolvedValue({ id: 7 });
    const { store } = setup();
    await act(async () => {
      await store.dispatch(fetchUserInfo('7'));
    });
    await act(async () => {
      window.dispatchEvent(new Event('online'));
    });
    expect(store.getState().auth.user?.id).toBe(7);
  });

  it('401: goes to login', async () => {
    fetchUser.mockImplementationOnce(() =>
      Promise.reject(JSON.stringify({ response: { status: 401 } })),
    );
    const { store, view } = setup();
    await act(async () => {
      await store.dispatch(fetchUserInfo('7'));
    });
    expect(view.getByText('login')).toBeTruthy();
  });
});
