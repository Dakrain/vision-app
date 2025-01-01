import { combineReducers } from '@reduxjs/toolkit';
import { meetingSlice, NS_MEETING } from '@/features/Meeting/store/slice';
import { authSlice, NS_AUTH } from '../shared/store/auth/slice';
import { loadingSlice, NS_LOADING } from '../shared/store/loading/slice';

const rootReducer = combineReducers({
  [NS_AUTH]: authSlice.reducer,
  [NS_LOADING]: loadingSlice.reducer,
  [NS_MEETING]: meetingSlice.reducer,
});

export default rootReducer;
