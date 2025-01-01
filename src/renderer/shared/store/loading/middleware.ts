import { Middleware } from '@reduxjs/toolkit';
import { showLoading, hideLoading } from './slice';

export const loadingMiddleware: Middleware =
  ({ dispatch }) =>
  (next) =>
  (action) => {
    if (action.meta?.skipLoading) {
      return next(action);
    }

    // Check if action is async
    if (action.type.endsWith('/pending')) {
      dispatch(showLoading());
    }

    if (
      action.type.endsWith('/fulfilled') ||
      action.type.endsWith('/rejected')
    ) {
      dispatch(hideLoading());
    }

    return next(action);
  };
