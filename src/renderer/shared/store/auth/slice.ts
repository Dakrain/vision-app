import { createSlice } from '@reduxjs/toolkit';
import i18n from '@/renderer/i18n';
import { apiErrorStatus } from '../../network/apiError';
import { fetchUserInfo, login } from './action';
import INITIAL_STATE from './constants';

export const NS_AUTH = 'auth';

export const authSlice = createSlice({
  name: NS_AUTH,
  initialState: INITIAL_STATE,
  reducers: {
    logout: (state) => {
      state.user = undefined;
      state.userFailures = 0;
      state.sessionExpired = false;
      localStorage.setItem('token', '');
      localStorage.setItem('last_login_user', '');
    },
  },
  extraReducers: (builder) => {
    builder.addCase(login.pending, (state) => {
      state.error = undefined;
    });
    builder.addCase(login.fulfilled, (state, action) => {
      state.user = action.payload;
      state.userFailures = 0;
      state.sessionExpired = false;
      // Save token to local storage
      if (action.payload.accessToken) {
        localStorage.setItem('token', action.payload.accessToken);
        localStorage.setItem(
          'last_login_user',
          action.payload.id?.toString() ?? '',
        );
      }
    });
    builder.addCase(login.rejected, (state, action) => {
      const error = JSON.parse(action.payload as string);
      if (error.status === 422) {
        state.error = {
          code: '422',
          message: i18n.t('auth.login.wrong_credentials'),
        };
      } else {
        state.error = {
          code: 'UNKNOWN',
          message: i18n.t('auth.error_try_later'),
        };
      }
    });

    builder.addCase(fetchUserInfo.fulfilled, (state, action) => {
      state.user = action.payload;
      state.userFailures = 0;
    });

    // Only a refused token ends the session. Offline / server trouble at
    // launch used to wipe it too, logging the user out on the next start.
    builder.addCase(fetchUserInfo.rejected, (state, action) => {
      if (apiErrorStatus(action.payload) === 401) {
        state.sessionExpired = true;
        localStorage.setItem('token', '');
        localStorage.setItem('last_login_user', '');
      } else {
        state.userFailures += 1;
      }
    });
  },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;
