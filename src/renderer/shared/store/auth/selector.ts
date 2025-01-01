import { RootState } from '@/renderer/store/configureStore';

export const selectAuth = (state: RootState) => state.auth;
export const selectAuthError = (state: RootState) => state.auth.error;
export const selectIsAuth = (state: RootState) =>
  Object.keys(state.auth.user || {}).length > 0;
