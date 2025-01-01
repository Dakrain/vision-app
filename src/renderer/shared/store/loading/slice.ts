import { createSlice } from '@reduxjs/toolkit';
import { INITIAL_STATE } from './constants';

export const NS_LOADING = 'loading';

export const loadingSlice = createSlice({
  name: NS_LOADING,
  initialState: INITIAL_STATE,
  reducers: {
    showLoading: (state) => {
      state.loadingCount += 1;
      state.isLoading = true;
    },
    hideLoading: (state) => {
      state.loadingCount -= 1;
      state.isLoading = state.loadingCount > 0;
    },
  },
});

export const { showLoading, hideLoading } = loadingSlice.actions;
export default loadingSlice.reducer;
