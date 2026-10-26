import BaseService from '@/shared/network/base.service';
import { User } from '@/renderer/shared/types';
import { LoginRequest, RegisterRequest } from './request';
import { API_BASE_URL } from '../../config';

class AuthService extends BaseService {
  async login(request: LoginRequest): Promise<User> {
    return this.post('/user/login', request);
  }

  async fetchUser(userId: string): Promise<User> {
    return this.get(`/user/${userId}`);
  }

  // Same endpoint mobile uses (POST /user — see user.service.dart). The
  // account is active immediately on success, there is no email-verification
  // step to wait on.
  async register(request: RegisterRequest): Promise<User> {
    return this.post('/user', request);
  }
}

const authService = new AuthService({
  baseURL: API_BASE_URL,
});

export default authService;
