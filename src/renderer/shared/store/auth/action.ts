import { createAsyncThunk } from '@reduxjs/toolkit';
import AuthService from '@/shared/services/Auth/AuthService';
import { LoginRequest } from '@/shared/services/Auth/request';

const login = createAsyncThunk(
  'auth/login',
  async (payload: LoginRequest, { rejectWithValue }) => {
    try {
      const response = await AuthService.login(payload);
      return response;
    } catch (error) {
      return rejectWithValue(error);
    }
  },
);

const fetchUserInfo = createAsyncThunk(
  'auth/fetchUserInfo',
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await AuthService.fetchUser(userId);
      return response;
    } catch (error) {
      return rejectWithValue(error);
    }
  },
);

export { login, fetchUserInfo };
