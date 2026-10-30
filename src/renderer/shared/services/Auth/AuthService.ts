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

  // Forgotten password, as on mobile: a 6-digit code is mailed, the code
  // buys a one-off token, the token sets the new password.
  async forgotPassword(email: string): Promise<unknown> {
    return this.post('/user/forgotpassword', { email });
  }

  async verifyResetCode(
    email: string,
    code: string,
  ): Promise<{ id: number; token: string }> {
    return this.post('/user/codevefiry', { email, code });
  }

  async resetPassword(request: {
    id: number;
    token: string;
    password: string;
    confirmPassword: string;
  }): Promise<unknown> {
    return this.post('/user/resetpassword', request);
  }
}

const authService = new AuthService({
  baseURL: API_BASE_URL,
});

export default authService;
